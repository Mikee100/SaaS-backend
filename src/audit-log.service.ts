import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditLogService {
  private auditTableUnavailable = false;

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

    const prisma = prismaClient || this.prisma;

    // Validate userId exists if provided
    if (userId) {
      const userExists = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (!userExists) {
        userId = null; // Set to null if user doesn't exist
      }
    }

    try {
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

      throw error;
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
}
