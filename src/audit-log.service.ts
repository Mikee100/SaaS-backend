import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async log(userId: string | null, action: string, details: any, ip?: string, prismaClient?: any) {
    const prisma = prismaClient || this.prisma;
    return prisma.auditLog.create({
      data: {
        id: uuidv4(),
        userId,
        action,
        details,
        ip,
        createdAt: new Date()
      },
    });
  }

  async getLogs(limit = 100) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { User: true },  // Changed from 'user' to 'User' to match Prisma schema
    });
  }
} 