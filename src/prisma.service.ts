import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { softDeleteExtension } from './prisma/soft-delete.extension';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    super({
      datasources: { db: { url: databaseUrl } },
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
    });
    const extended = softDeleteExtension(this);
    Object.assign(this, extended);
  }

  async onModuleInit() {
    await this.$connect();
  }
}
