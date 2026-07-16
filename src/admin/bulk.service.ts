import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma.service';
import { AuthService } from '../auth/auth.services';
import { SubscriptionAdminService } from './subscription-admin.service';

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
  private readonly exportsDir = path.join(process.cwd(), 'exports');

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly subscriptionAdminService: SubscriptionAdminService,
  ) {}

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }

  getOperations(): BulkOperation[] {
    return [...this.operationsHistory].reverse();
  }

  private addToHistory(op: Omit<BulkOperation, 'id'>) {
    this.operationsHistory.unshift({
      ...op,
      id: `op-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    });
    if (this.operationsHistory.length > this.MAX_HISTORY) {
      this.operationsHistory = this.operationsHistory.slice(
        0,
        this.MAX_HISTORY,
      );
    }
  }

  async execute(
    action: string,
    tenantIds: string[],
    userIds: string[],
    options: { planId?: string; importFilename?: string } = {},
  ): Promise<{
    success: boolean;
    message: string;
    affectedCount?: number;
    data?: unknown;
  }> {
    const now = new Date().toISOString();

    switch (action) {
      case 'suspend_tenants': {
        if (!tenantIds.length) {
          throw new BadRequestException(
            'tenantIds array is required for suspend_tenants',
          );
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
        return {
          success: true,
          message: `Suspended ${result.count} tenant(s)`,
          affectedCount: result.count,
        };
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
        return {
          success: true,
          message: `Activated ${result.count} tenant(s)`,
          affectedCount: result.count,
        };
      }

      case 'suspend_users': {
        if (!userIds.length) {
          throw new BadRequestException(
            'userIds array is required for suspend_users',
          );
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
        return {
          success: true,
          message: `Suspended ${result.count} user(s)`,
          affectedCount: result.count,
        };
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
        return {
          success: true,
          message: `Activated ${result.count} user(s)`,
          affectedCount: result.count,
        };
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
        return {
          success: true,
          message: 'Cache clear requested (no-op in current implementation)',
        };

      case 'reset_passwords': {
        if (!userIds.length) {
          throw new BadRequestException(
            'userIds array is required for reset_passwords',
          );
        }
        const users = await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true },
        });
        let sent = 0;
        for (const u of users) {
          try {
            await this.authService.forgotPassword(u.email);
            sent++;
          } catch (error) {
            this.logger.warn(
              `Failed to queue password reset for ${u.email}: ${this.getErrorMessage(error)}`,
            );
          }
        }
        this.addToHistory({
          type: 'user_management',
          action: 'reset_passwords',
          description: 'Send password reset emails to selected users',
          affectedCount: sent,
          status: 'completed',
          progress: 100,
          createdAt: now,
          completedAt: now,
        });
        return {
          success: true,
          message: `Password reset email sent to ${sent} of ${userIds.length} user(s)`,
          affectedCount: sent,
        };
      }

      case 'update_plan': {
        if (!tenantIds.length) {
          throw new BadRequestException(
            'tenantIds array is required for update_plan',
          );
        }
        if (!options.planId) {
          throw new BadRequestException('planId is required for update_plan');
        }
        let updated = 0;
        const errors: string[] = [];
        for (const tenantId of tenantIds) {
          try {
            await this.subscriptionAdminService.assignPlanToTenant(
              tenantId,
              options.planId,
            );
            updated++;
          } catch (error) {
            errors.push(`${tenantId}: ${this.getErrorMessage(error)}`);
          }
        }
        this.addToHistory({
          type: 'tenant_management',
          action: 'update_plan',
          description: `Assign plan ${options.planId} to selected tenants`,
          affectedCount: updated,
          status: errors.length ? 'failed' : 'completed',
          progress: 100,
          createdAt: now,
          completedAt: now,
          error: errors.length ? errors.join('; ') : undefined,
        });
        return {
          success: updated > 0,
          message: `Updated plan for ${updated} of ${tenantIds.length} tenant(s)${
            errors.length ? `; ${errors.length} failed` : ''
          }`,
          affectedCount: updated,
        };
      }

      case 'export_data': {
        if (!tenantIds.length) {
          throw new BadRequestException(
            'tenantIds array is required for export_data',
          );
        }
        const tenants = await this.prisma.tenant.findMany({
          where: { id: { in: tenantIds } },
          select: {
            id: true,
            name: true,
            businessType: true,
            contactEmail: true,
            contactPhone: true,
            address: true,
            city: true,
            country: true,
            website: true,
            vatNumber: true,
            taxId: true,
            currency: true,
            timezone: true,
            createdAt: true,
          },
        });

        const users = await this.prisma.user.findMany({
          where: { tenantId: { in: tenantIds } },
          select: {
            id: true,
            tenantId: true,
            email: true,
            name: true,
            isDisabled: true,
            createdAt: true,
          },
        });

        const [productCounts, saleCounts] = await Promise.all([
          this.prisma.product.groupBy({
            by: ['tenantId'],
            where: { tenantId: { in: tenantIds } },
            _count: { _all: true },
          }),
          this.prisma.sale.groupBy({
            by: ['tenantId'],
            where: { tenantId: { in: tenantIds } },
            _count: { _all: true },
          }),
        ]);

        const exportPayload = {
          exportedAt: now,
          tenants: tenants.map((t) => ({
            ...t,
            userCount: users.filter((u) => u.tenantId === t.id).length,
            productCount:
              productCounts.find((p) => p.tenantId === t.id)?._count._all ?? 0,
            saleCount:
              saleCounts.find((s) => s.tenantId === t.id)?._count._all ?? 0,
          })),
          users,
        };

        await fs.mkdir(this.exportsDir, { recursive: true });
        const filename = `export-${Date.now()}.json`;
        const filePath = path.join(this.exportsDir, filename);
        await fs.writeFile(
          filePath,
          JSON.stringify(exportPayload, null, 2),
          'utf8',
        );

        this.addToHistory({
          type: 'tenant_management',
          action: 'export_data',
          description: `Export data for ${tenants.length} tenant(s)`,
          affectedCount: tenants.length,
          status: 'completed',
          progress: 100,
          createdAt: now,
          completedAt: now,
        });

        return {
          success: true,
          message: `Exported data for ${tenants.length} tenant(s) to ${filename}`,
          affectedCount: tenants.length,
          data: { filename },
        };
      }

      case 'import_data': {
        // Only re-applies safe, non-destructive tenant profile fields from a
        // previous export_data run (never creates tenants/users or touches
        // financial data) — a generic importer for an undefined external
        // format would be a data-integrity and security risk.
        if (!options.importFilename) {
          throw new BadRequestException(
            'importFilename is required for import_data (must reference a file produced by export_data)',
          );
        }
        const filePath = path.join(this.exportsDir, options.importFilename);
        const resolved = path.resolve(filePath);
        if (!resolved.startsWith(path.resolve(this.exportsDir))) {
          throw new BadRequestException('Invalid importFilename');
        }

        let payload: {
          tenants?: Array<{
            id: string;
            name?: string;
            contactEmail?: string;
            contactPhone?: string;
            address?: string;
            city?: string;
            country?: string;
            website?: string;
            vatNumber?: string;
            taxId?: string;
          }>;
        };
        try {
          const raw = await fs.readFile(resolved, 'utf8');
          payload = JSON.parse(raw) as typeof payload;
        } catch (error) {
          throw new BadRequestException(
            `Failed to read export file: ${this.getErrorMessage(error)}`,
          );
        }

        const tenants = payload.tenants ?? [];
        let restored = 0;
        for (const t of tenants) {
          if (!t.id) continue;
          try {
            await this.prisma.tenant.update({
              where: { id: t.id },
              data: {
                name: t.name,
                contactEmail: t.contactEmail,
                contactPhone: t.contactPhone,
                address: t.address,
                city: t.city,
                country: t.country,
                website: t.website,
                vatNumber: t.vatNumber,
                taxId: t.taxId,
              },
            });
            restored++;
          } catch (error) {
            this.logger.warn(
              `Failed to restore tenant ${t.id}: ${this.getErrorMessage(error)}`,
            );
          }
        }

        this.addToHistory({
          type: 'tenant_management',
          action: 'import_data',
          description: `Restore tenant profile fields from ${options.importFilename}`,
          affectedCount: restored,
          status: 'completed',
          progress: 100,
          createdAt: now,
          completedAt: now,
        });

        return {
          success: true,
          message: `Restored profile fields for ${restored} of ${tenants.length} tenant(s)`,
          affectedCount: restored,
        };
      }

      case 'optimize_database': {
        try {
          await this.prisma.$executeRawUnsafe('VACUUM ANALYZE');
        } catch (error) {
          throw new BadRequestException(
            `Database optimization failed: ${this.getErrorMessage(error)}`,
          );
        }
        this.addToHistory({
          type: 'system_maintenance',
          action: 'optimize_database',
          description: 'Run VACUUM ANALYZE on the database',
          affectedCount: 0,
          status: 'completed',
          progress: 100,
          createdAt: now,
          completedAt: now,
        });
        return {
          success: true,
          message: 'Database optimization (VACUUM ANALYZE) completed',
        };
      }

      default:
        throw new BadRequestException(`Unknown action: ${action}`);
    }
  }
}
