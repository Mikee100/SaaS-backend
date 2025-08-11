import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async log(userId: string | null, action: string, details: any, ip?: string, prismaClient?: any) {
    const prisma = prismaClient || this.prisma;
    return prisma.auditLog.create({
      data: { userId, action, details, ip },
    });
  }

  async getLogs(limit = 100) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: true },
    });
  }
} 