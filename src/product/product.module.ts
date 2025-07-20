import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { PrismaService } from '../prisma.service';
import { AuditLogService } from '../audit-log.service';

@Module({
  providers: [ProductService, PrismaService, AuditLogService],
  controllers: [ProductController]
})
export class ProductModule {}
