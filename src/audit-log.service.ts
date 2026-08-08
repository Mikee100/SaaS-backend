import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}
  private auditTableUnavailable = false;

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
    } catch (error: unknown) {
      if (
        this.isPrismaKnownRequestError(error) &&
        error.code === 'P2021' &&
        error.meta?.modelName === 'AuditLog'
      ) {
        this.auditTableUnavailable = true;
        console.warn(
          'AuditLog table is unavailable. API audit logging will be skipped until service restart after migrations are applied.',
        );
        return null;
      }

      throw error;
    }
  }

  private isPrismaKnownRequestError(
    error: unknown,
  ): error is Prisma.PrismaClientKnownRequestError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof (error as { code?: unknown }).code === 'string'
    );
  }

  async getLogs(limit = 100, tenantId?: string) {
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
}
