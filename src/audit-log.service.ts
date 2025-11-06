import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async log(
    userId: string | null,
    action: string,
    details: any,
    ip?: string,
    prismaClient?: any,
  ) {
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

    return prisma.auditLog.create({
      data: {
        id: uuidv4(),
        userId,
        action,
        details,
        ip,
        createdAt: new Date(),
      },
    });
  }

  async getLogs(limit = 100, tenantId?: string) {
    const where: any = {};
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
