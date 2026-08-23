import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditLogService {
  private auditTableUnavailable = false;
  private auditDbUnavailableUntil = 0;

  constructor(private prisma: PrismaService) {}

  async log(
    userId: string | null,
    action: string,
    details: Prisma.InputJsonValue,
    ip?: string,
    prismaClient?: Prisma.TransactionClient | PrismaService,
  ) {
    if (this.auditTableUnavailable) {
      return null;
    }

    if (Date.now() < this.auditDbUnavailableUntil) {
      return null;
    }

    const prisma = prismaClient || this.prisma;

    try {
      // Validate userId exists if provided
      if (userId) {
        const userExists = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true },
        });
        if (!userExists) {
          userId = null;
        }
      }

      return await prisma.auditLog.create({
        data: {
          id: uuidv4(),
          userId,
          action,
          details,
          ip,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      if (this.isMissingAuditTableError(error)) {
        this.auditTableUnavailable = true;
        console.warn(
          '[AuditLogService] AuditLog table is missing. Disabling audit writes until restart.',
        );
        return null;
      }

      if (this.isTransientAuditDbError(error)) {
        this.auditDbUnavailableUntil = Date.now() + 30_000;
        console.warn(
          '[AuditLogService] AuditLog write skipped due to transient DB connectivity issue. Will retry after cooldown.',
        );
        return null;
      }

      // Audit logging must never break business requests.
      console.error('[AuditLogService] AuditLog write failed:', error);
      return null;
    }
  }

  async getLogs(limit = 100, tenantId?: string) {
    if (this.auditTableUnavailable) {
      return [];
    }

    const where: Prisma.AuditLogWhereInput = {};
    if (tenantId) {
      where.User = { tenantId };
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        User: {
          include: {
            tenant: true,
          },
        },
      },
    });
  }

  private isMissingAuditTableError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const prismaError = error as {
      code?: string;
      meta?: { modelName?: string; table?: string };
    };

    if (prismaError.code !== 'P2021') {
      return false;
    }

    return (
      prismaError.meta?.modelName === 'AuditLog' ||
      prismaError.meta?.table === 'public.AuditLog'
    );
  }

  private isTransientAuditDbError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const prismaError = error as {
      code?: string;
      message?: string;
    };

    if (prismaError.code === 'P1001' || prismaError.code === 'P2024') {
      return true;
    }

    const message = prismaError.message?.toLowerCase() ?? '';
    return (
      message.includes('can\'t reach database server') ||
      message.includes('timed out fetching a new connection from the connection pool') ||
      message.includes('prepared statement')
    );
  }
}
