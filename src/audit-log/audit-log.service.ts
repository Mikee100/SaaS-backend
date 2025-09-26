import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async log(userId: string | null, action: string, details: any, ip?: string) {
    return this.prisma.auditLog.create({
      data: {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        action,
        details,
        ip,
      },
    });
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
