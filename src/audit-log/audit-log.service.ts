import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuditLogService {
  private auditDbUnavailableUntil = 0;

  constructor(private prisma: PrismaService) {}

  async log(
    userId: string | null,
    action: string,
    details: Prisma.InputJsonValue,
    ip?: string,
  ) {
    if (Date.now() < this.auditDbUnavailableUntil) {
      return null;
    }

    try {
      return await this.prisma.auditLog.create({
        data: {
          id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId,
          action,
          details,
          ip,
        },
      });
    } catch (error) {
      this.auditDbUnavailableUntil = Date.now() + 30_000;
      console.warn(
        '[AuditLogService] AuditLog write skipped due to DB connectivity issue.',
      );
      return null;
    }
  }

  async getLogs(userId?: string, action?: string, limit = 100) {
    return this.prisma.auditLog.findMany({
      where: {
        ...(userId && { userId }),
        ...(action && { action }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
