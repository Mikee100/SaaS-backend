import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { BackupService } from '../backup/backup.service';
import * as si from 'systeminformation';
import { EmailService } from '../email/email.service';

export interface DatabaseMetrics {
  activeConnections: number;
  totalConnections: number;
  connectionPoolSize: number;
  queryCount: number;
  slowQueries: number;
  averageQueryTime: number;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  responseTime: number;
  database: {
    status: 'up' | 'down';
    responseTime: number;
    activeConnections: number;
  };
  system: {
    cpu: number;
    memory: number;
    disk: number;
  };
  uptime: number;
}

export interface AlertConfig {
  id: string;
  name: string;
  type: 'database' | 'system' | 'api';
  threshold: number;
  condition: 'above' | 'below' | 'equals';
  enabled: boolean;
  notificationChannels: string[];
}

export interface NotificationHistory {
  id: string;
  alertId: string;
  alertName: string;
  metricName: string;
  currentValue: number;
  threshold: number;
  status: 'sent' | 'failed';
  timestamp: Date;
  message?: string;
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private alertConfigs: AlertConfig[] = [];
  private healthHistory: HealthCheckResult[] = [];
  private notificationHistory: NotificationHistory[] = [];

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private backupService: BackupService,
  ) {
    this.initializeDefaultAlerts();
  }

  private initializeDefaultAlerts() {
    this.alertConfigs = [
      {
        id: 'db-connection-high',
        name: 'High Database Connections',
        type: 'database',
        threshold: 80,
        condition: 'above',
        enabled: true,
        notificationChannels: ['email'],
      },
      {
        id: 'cpu-high',
        name: 'High CPU Usage',
        type: 'system',
        threshold: 90,
        condition: 'above',
        enabled: true,
        notificationChannels: ['email'],
      },
      {
        id: 'memory-high',
        name: 'High Memory Usage',
        type: 'system',
        threshold: 85,
        condition: 'above',
        enabled: true,
        notificationChannels: ['email'],
      },
      {
        id: 'disk-high',
        name: 'High Disk Usage',
        type: 'system',
        threshold: 90,
        condition: 'above',
        enabled: true,
        notificationChannels: ['email'],
      },
    ];
  }

  async getDatabaseMetrics(): Promise<DatabaseMetrics> {
    try {
      const startTime = Date.now();

      // Get connection info from Prisma
      const connectionInfo = await this.prisma.$queryRaw`
        SELECT
          count(*) as active_connections,
          (SELECT setting FROM pg_settings WHERE name = 'max_connections') as max_connections
        FROM pg_stat_activity
        WHERE state = 'active'
      ` as any[];

      const activeConnections = parseInt(connectionInfo[0]?.active_connections || '0');
      const maxConnections = parseInt(connectionInfo[0]?.max_connections || '100');

      // Get query performance metrics
      const queryMetrics = await this.prisma.$queryRaw`
        SELECT
          count(*) as total_queries,
          avg(extract(epoch from (now() - query_start))) * 1000 as avg_query_time
        FROM pg_stat_activity
        WHERE state = 'active' AND query_start IS NOT NULL
      ` as any[];

      const totalQueries = parseInt(queryMetrics[0]?.total_queries || '0');
      const avgQueryTime = parseFloat(queryMetrics[0]?.avg_query_time || '0');

      // Get slow queries (queries taking more than 1 second)
      const slowQueries = await this.prisma.$queryRaw`
        SELECT count(*) as slow_queries
        FROM pg_stat_activity
        WHERE state = 'active'
          AND query_start IS NOT NULL
          AND extract(epoch from (now() - query_start)) > 1
      ` as any[];

      const slowQueryCount = parseInt(slowQueries[0]?.slow_queries || '0');

      return {
        activeConnections,
        totalConnections: maxConnections,
        connectionPoolSize: maxConnections,
        queryCount: totalQueries,
        slowQueries: slowQueryCount,
        averageQueryTime: avgQueryTime,
      };
    } catch (error) {
      this.logger.error('Error getting database metrics:', error);
      return {
        activeConnections: 0,
        totalConnections: 0,
        connectionPoolSize: 0,
        queryCount: 0,
        slowQueries: 0,
        averageQueryTime: 0,
      };
    }
  }

  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Database health check
      const dbStartTime = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const dbResponseTime = Date.now() - dbStartTime;

      // Get active connections
      const connectionInfo = await this.prisma.$queryRaw`
        SELECT count(*) as active_connections
        FROM pg_stat_activity
        WHERE state = 'active'
      ` as any[];
      const activeConnections = parseInt(connectionInfo[0]?.active_connections || '0');

      // System metrics
      const [cpu, mem, disk] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.fsSize(),
      ]);

      const cpuUsage = Math.round(cpu.currentLoad);
      const memoryUsage = Math.round((mem.used / mem.total) * 100);
      const diskUsage = Math.round(
        disk.reduce((acc, d) => acc + (d.used / d.size) * 100, 0) / disk.length
      );

      const result: HealthCheckResult = {
        status: 'healthy',
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        database: {
          status: 'up',
          responseTime: dbResponseTime,
          activeConnections,
        },
        system: {
          cpu: cpuUsage,
          memory: memoryUsage,
          disk: diskUsage,
        },
        uptime: process.uptime(),
      };

      // Determine overall status
      if (cpuUsage > 90 || memoryUsage > 90 || diskUsage > 95 || dbResponseTime > 5000) {
        result.status = 'unhealthy';
      } else if (cpuUsage > 80 || memoryUsage > 80 || diskUsage > 85 || dbResponseTime > 2000) {
        result.status = 'degraded';
      }

      // Store in history (keep last 100 entries)
      this.healthHistory.unshift(result);
      if (this.healthHistory.length > 100) {
        this.healthHistory = this.healthHistory.slice(0, 100);
      }

      // Check alerts
      await this.checkAlerts(result);

      return result;
    } catch (error) {
      this.logger.error('Health check failed:', error);

      const result: HealthCheckResult = {
        status: 'unhealthy',
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        database: {
          status: 'down',
          responseTime: 0,
          activeConnections: 0,
        },
        system: {
          cpu: 0,
          memory: 0,
          disk: 0,
        },
        uptime: process.uptime(),
      };

      this.healthHistory.unshift(result);
      if (this.healthHistory.length > 100) {
        this.healthHistory = this.healthHistory.slice(0, 100);
      }

      return result;
    }
  }

  async getHealthHistory(limit: number = 50): Promise<HealthCheckResult[]> {
    return this.healthHistory.slice(0, limit);
  }

  async getAlertConfigs(): Promise<AlertConfig[]> {
    return this.alertConfigs;
  }

  async updateAlertConfig(alertId: string, config: Partial<AlertConfig>): Promise<void> {
    const alertIndex = this.alertConfigs.findIndex(a => a.id === alertId);
    if (alertIndex !== -1) {
      this.alertConfigs[alertIndex] = { ...this.alertConfigs[alertIndex], ...config };
    }
  }

  private async checkAlerts(healthResult: HealthCheckResult): Promise<void> {
    for (const alert of this.alertConfigs) {
      if (!alert.enabled) continue;

      let shouldTrigger = false;
      let currentValue = 0;
      let metricName = '';

      switch (alert.type) {
        case 'database':
          if (alert.id === 'db-connection-high') {
            currentValue = healthResult.database.activeConnections;
            metricName = 'Database Active Connections';
            shouldTrigger = alert.condition === 'above' && currentValue > alert.threshold;
          }
          break;
        case 'system':
          if (alert.id === 'cpu-high') {
            currentValue = healthResult.system.cpu;
            metricName = 'CPU Usage';
            shouldTrigger = alert.condition === 'above' && currentValue > alert.threshold;
          } else if (alert.id === 'memory-high') {
            currentValue = healthResult.system.memory;
            metricName = 'Memory Usage';
            shouldTrigger = alert.condition === 'above' && currentValue > alert.threshold;
          } else if (alert.id === 'disk-high') {
            currentValue = healthResult.system.disk;
            metricName = 'Disk Usage';
            shouldTrigger = alert.condition === 'above' && currentValue > alert.threshold;
          }
          break;
      }

      if (shouldTrigger) {
        await this.triggerAlert(alert, currentValue, metricName);
      }
    }
  }

  private async triggerAlert(alert: AlertConfig, currentValue: number, metricName: string): Promise<void> {
    this.logger.warn(`Alert triggered: ${alert.name} - ${metricName}: ${currentValue}`);

    // Send email notification using EmailService method
    let status: 'sent' | 'failed' = 'failed';
    let message: string | undefined;

    try {
      await this.sendAlertEmail(alert, currentValue, metricName);
      status = 'sent';
    } catch (error) {
      this.logger.error('Failed to send alert notification:', error);
      message = error instanceof Error ? error.message : 'Unknown error';
    }

    // Store notification history
    const notification: NotificationHistory = {
      id: `${alert.id}-${Date.now()}`,
      alertId: alert.id,
      alertName: alert.name,
      metricName,
      currentValue,
      threshold: alert.threshold,
      status,
      timestamp: new Date(),
      message,
    };

    this.notificationHistory.unshift(notification);
    if (this.notificationHistory.length > 100) {
      this.notificationHistory = this.notificationHistory.slice(0, 100);
    }
  }

  private async sendAlertEmail(alert: AlertConfig, currentValue: number, metricName: string): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">🚨 System Alert</h2>
        <p><strong>Alert:</strong> ${alert.name}</p>
        <p><strong>Metric:</strong> ${metricName}</p>
        <p><strong>Current Value:</strong> ${currentValue}</p>
        <p><strong>Threshold:</strong> ${alert.threshold}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <hr>
        <p>Please check the monitoring dashboard for more details.</p>
      </div>
    `;

    try {
      await this.emailService.sendPaymentConfirmationEmail(
        process.env.ADMIN_EMAIL || 'admin@saasplatform.com',
        `🚨 Alert: ${alert.name}`,
        html
      );
    } catch (error) {
      this.logger.error('Failed to send alert email:', error);
      // Fallback: log the alert
      this.logger.warn(`ALERT: ${alert.name} - ${metricName}: ${currentValue} (threshold: ${alert.threshold})`);
    }
  }

  async getSystemMetrics() {
    try {
      const [cpu, mem, disk, network] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.fsSize(),
        si.networkStats(),
      ]);

      // Get backup status
      const backupStatus = await this.getBackupStatus();

      return {
        cpu: {
          usage: Math.round(cpu.currentLoad),
          cores: cpu.cpus?.length || 1,
        },
        memory: {
          total: mem.total,
          used: mem.used,
          free: mem.free,
          usagePercent: Math.round((mem.used / mem.total) * 100),
        },
        disk: disk.map(d => ({
          filesystem: d.fs,
          size: d.size,
          used: d.used,
          available: d.available,
          usagePercent: Math.round((d.used / d.size) * 100),
        })),
        network: network.map(n => ({
          interface: n.iface,
          rxBytes: n.rx_bytes,
          txBytes: n.tx_bytes,
        })),
        backup: backupStatus,
      };
    } catch (error) {
      this.logger.error('Error getting system metrics:', error);
      return null;
    }
  }

  async getBackupStatus() {
    try {
      return await this.backupService.getBackupStatus();
    } catch (error) {
      this.logger.error('Error getting backup status:', error);
      return {
        status: 'error',
        lastBackupAt: null,
        lastBackupDuration: null,
        lastBackupSize: null,
        lastError: error.message,
        nextBackupAt: null,
        totalBackups: 0,
        diskSpaceUsed: 0,
      };
    }
  }

  async getNotificationHistory(limit: number = 50): Promise<NotificationHistory[]> {
    return this.notificationHistory.slice(0, limit);
  }
}
