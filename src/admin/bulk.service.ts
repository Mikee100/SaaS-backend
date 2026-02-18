import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface BulkOperation {
  id: string;
  type: string;
  action: string;
  description: string;
  affectedCount: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

@Injectable()
export class BulkService {
  private readonly logger = new Logger(BulkService.name);
  private operationsHistory: BulkOperation[] = [];
  private readonly MAX_HISTORY = 50;

  constructor(private readonly prisma: PrismaService) {}

  getOperations(): BulkOperation[] {
    return [...this.operationsHistory].reverse();
  }

  private addToHistory(op: Omit<BulkOperation, 'id'>) {
    this.operationsHistory.unshift({
      ...op,
      id: `op-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    });
    if (this.operationsHistory.length > this.MAX_HISTORY) {
      this.operationsHistory = this.operationsHistory.slice(0, this.MAX_HISTORY);
    }
  }

  async execute(
    action: string,
    tenantIds: string[],
    userIds: string[],
  ): Promise<{ success: boolean; message: string; affectedCount?: number }> {
    const now = new Date().toISOString();

    switch (action) {
      case 'suspend_tenants': {
        if (!tenantIds.length) {
          throw new BadRequestException('tenantIds array is required for suspend_tenants');
        }
        const result = await this.prisma.tenant.updateMany({
          where: { id: { in: tenantIds } },
          data: { isSuspended: true },
        });
        this.addToHistory({
          type: 'tenant_management',
          action: 'suspend_tenants',
          description: 'Suspend entire tenants',
          affectedCount: result.count,
          status: 'completed',
          progress: 100,
          createdAt: now,
          completedAt: now,
        });
        this.logger.log(`Suspended ${result.count} tenants`);
        return { success: true, message: `Suspended ${result.count} tenant(s)`, affectedCount: result.count };
      }

      case 'activate_tenants': {
        const where = tenantIds.length
          ? { id: { in: tenantIds } }
          : { isSuspended: true };
        const result = await this.prisma.tenant.updateMany({
          where,
          data: { isSuspended: false },
        });
        this.addToHistory({
          type: 'tenant_management',
          action: 'activate_tenants',
          description: 'Activate suspended tenants',
          affectedCount: result.count,
          status: 'completed',
          progress: 100,
          createdAt: now,
          completedAt: now,
        });
        this.logger.log(`Activated ${result.count} tenants`);
        return { success: true, message: `Activated ${result.count} tenant(s)`, affectedCount: result.count };
      }

      case 'suspend_users': {
        if (!userIds.length) {
          throw new BadRequestException('userIds array is required for suspend_users');
        }
        const result = await this.prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { isDisabled: true },
        });
        this.addToHistory({
          type: 'user_management',
          action: 'suspend_users',
          description: 'Suspend multiple users across tenants',
          affectedCount: result.count,
          status: 'completed',
          progress: 100,
          createdAt: now,
          completedAt: now,
        });
        this.logger.log(`Suspended ${result.count} users`);
        return { success: true, message: `Suspended ${result.count} user(s)`, affectedCount: result.count };
      }

      case 'activate_users': {
        const where = userIds.length
          ? { id: { in: userIds } }
          : { isDisabled: true };
        const result = await this.prisma.user.updateMany({
          where,
          data: { isDisabled: false },
        });
        this.addToHistory({
          type: 'user_management',
          action: 'activate_users',
          description: 'Activate suspended users',
          affectedCount: result.count,
          status: 'completed',
          progress: 100,
          createdAt: now,
          completedAt: now,
        });
        this.logger.log(`Activated ${result.count} users`);
        return { success: true, message: `Activated ${result.count} user(s)`, affectedCount: result.count };
      }

      case 'clear_cache':
        this.addToHistory({
          type: 'system_maintenance',
          action: 'clear_cache',
          description: 'Clear system cache',
          affectedCount: 0,
          status: 'completed',
          progress: 100,
          createdAt: now,
          completedAt: now,
        });
        return { success: true, message: 'Cache clear requested (no-op in current implementation)' };

      case 'reset_passwords':
      case 'update_plan':
      case 'export_data':
      case 'import_data':
      case 'optimize_database':
        throw new BadRequestException(
          `Action '${action}' is not yet implemented. Available: suspend_tenants, activate_tenants, suspend_users, activate_users, clear_cache`,
        );

      default:
        throw new BadRequestException(`Unknown action: ${action}`);
    }
  }
}
