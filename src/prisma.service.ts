import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    // Configure connection pooling via connection string or explicit options
    // Connection pool settings can be set in DATABASE_URL or here
    const databaseUrl = process.env.DATABASE_URL;
    
    // If connection string doesn't have pool parameters, we'll rely on Prisma defaults
    // For PostgreSQL, you can add ?connection_limit=10&pool_timeout=20 to DATABASE_URL
    // Or configure via Prisma's connection pool settings
    super({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      // Connection pooling is handled by Prisma automatically
      // For explicit control, add parameters to DATABASE_URL:
      // postgresql://user:pass@host:port/db?connection_limit=10&pool_timeout=20
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
