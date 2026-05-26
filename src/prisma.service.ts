import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { softDeleteExtension } from './prisma/soft-delete.extension';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    const enableQueryLogs =
      process.env.PRISMA_LOG_QUERIES === 'true' ||
      process.env.DEBUG?.includes('prisma:query');
    const prismaLogLevels: ('query' | 'info' | 'warn' | 'error')[] =
      enableQueryLogs ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'];

    super({
      datasources: { db: { url: databaseUrl } },
      log: prismaLogLevels,
    });
    const extended = softDeleteExtension(this);
    Object.assign(this, extended);
  }

  async onModuleInit() {
    await this.$connect();
  }
}
