import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuthDevice } from '@prisma/client';

@Injectable()
export class DeviceService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreate(
    userId: string,
    fingerprint: string,
    name?: string,
  ): Promise<AuthDevice> {
    const normalized = fingerprint.trim() || 'unknown';
    const existing = await this.prisma.authDevice.findUnique({
      where: {
        userId_fingerprint: { userId, fingerprint: normalized },
      },
    });
    if (existing) {
      await this.prisma.authDevice.update({
        where: { id: existing.id },
        data: { name: name ?? existing.name, lastSeen: new Date() },
      });
      return this.prisma.authDevice.findUniqueOrThrow({
        where: { id: existing.id },
      });
    }
    return this.prisma.authDevice.create({
      data: {
        userId,
        fingerprint: normalized,
        name: name ?? null,
      },
    });
  }

  async findByUser(userId: string): Promise<AuthDevice[]> {
    return this.prisma.authDevice.findMany({
      where: { userId },
      orderBy: { lastSeen: 'desc' },
    });
  }
}
