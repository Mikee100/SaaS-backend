import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { softDeleteExtension } from './prisma/soft-delete.extension';

function getPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function normalizeDatabaseUrlForPooler(databaseUrl?: string): string | undefined {
  if (!databaseUrl) {
    return databaseUrl;
  }

  if (!databaseUrl.includes('pooler.supabase.com')) {
    return databaseUrl;
  }

  try {
    const parsedUrl = new URL(databaseUrl);
    const connectionLimit = getPositiveIntEnv('PRISMA_CONNECTION_LIMIT', 10);
    const poolTimeout = getPositiveIntEnv('PRISMA_POOL_TIMEOUT', 30);

    if (!parsedUrl.searchParams.has('pgbouncer')) {
      parsedUrl.searchParams.set('pgbouncer', 'true');
    }
    if (!parsedUrl.searchParams.has('connection_limit')) {
      parsedUrl.searchParams.set('connection_limit', String(connectionLimit));
    }
    if (!parsedUrl.searchParams.has('pool_timeout')) {
      parsedUrl.searchParams.set('pool_timeout', String(poolTimeout));
    }
    return parsedUrl.toString();
  } catch {
    return databaseUrl;
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const databaseUrl = normalizeDatabaseUrlForPooler(process.env.DATABASE_URL);
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
