import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SuperadminGuard } from './superadmin.guard';
import { TrialGuard } from '../auth/trial.guard';
import { MonitoringService } from '../monitoring/monitoring.service';
import * as si from 'systeminformation';

function toHealthStatus(
  value: number,
  warningThreshold: number,
  criticalThreshold: number,
): 'healthy' | 'warning' | 'critical' {
  if (value >= criticalThreshold) return 'critical';
  if (value >= warningThreshold) return 'warning';
  return 'healthy';
}

@Controller('admin/health')
@UseGuards(AuthGuard('jwt'), SuperadminGuard, TrialGuard)
export class AdminHealthController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get()
  async getHealth() {
    const [healthCheck, dbMetrics] = await Promise.all([
      this.monitoringService.performHealthCheck(),
      this.monitoringService.getDatabaseMetrics(),
    ]);

    const dbStatus =
      healthCheck.database.status === 'down'
        ? 'critical'
        : toHealthStatus(
            healthCheck.database.responseTime,
            500,
            2000,
          );

    const storageStatus = toHealthStatus(
      healthCheck.system.disk,
      85,
      95,
    );
    const memoryStatus = toHealthStatus(
      healthCheck.system.memory,
      80,
      90,
    );

    let usedSpace = 0;
    let totalSpace = 0;
    try {
      const disk = await si.fsSize();
      totalSpace = disk.reduce((acc, d) => acc + d.size, 0);
      usedSpace = disk.reduce((acc, d) => acc + d.used, 0);
    } catch {
      usedSpace = 0;
      totalSpace = 1;
    }

    let usedMemory = 0;
    let totalMemory = 0;
    try {
      const mem = await si.mem();
      totalMemory = mem.total;
      usedMemory = mem.used;
    } catch {
      usedMemory = 0;
      totalMemory = 1;
    }

    const notifications = await this.monitoringService.getNotificationHistory(10);
    const recentAlerts = notifications.map((n) => ({
      id: n.id,
      type: n.alertName,
      message: `${n.metricName}: ${n.currentValue} (threshold: ${n.threshold})`,
      severity: n.status === 'failed' ? 'error' : 'warning',
      timestamp: new Date(n.timestamp).toISOString(),
    }));

    return {
      database: {
        status: dbStatus,
        responseTime: healthCheck.database.responseTime,
        connections: healthCheck.database.activeConnections,
        maxConnections: dbMetrics.totalConnections || 100,
      },
      api: {
        status: 'healthy',
        responseTime: healthCheck.responseTime,
        requestsPerMinute: 0,
        errorRate: 0,
      },
      storage: {
        status: storageStatus,
        usedSpace,
        totalSpace,
        usagePercentage: totalSpace > 0 ? (usedSpace / totalSpace) * 100 : 0,
      },
      memory: {
        status: memoryStatus,
        usedMemory,
        totalMemory,
        usagePercentage: healthCheck.system.memory,
      },
      activeIssues: [],
      recentAlerts,
    };
  }

  @Get('metrics')
  async getMetrics() {
    const history = await this.monitoringService.getHealthHistory(50);

    const responseTimes = history.map((h) => ({
      timestamp: new Date(h.timestamp).toISOString(),
      value: h.responseTime,
    }));
    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((s, r) => s + r.value, 0) / responseTimes.length
        : 0;

    return {
      averageResponseTime: Math.round(avgResponseTime),
      totalRequests: 0,
      errorRate: 0,
      activeUsers: 0,
      peakConcurrentUsers: 0,
      historicalData: {
        responseTimes,
        requests: responseTimes.map((r) => ({ ...r, value: 0 })),
        errors: responseTimes.map((r) => ({ ...r, value: 0 })),
        users: responseTimes.map((r) => ({ ...r, value: 0 })),
      },
    };
  }
}
