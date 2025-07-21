import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { PrismaService } from '../prisma.service';
import { AuditLogService } from '../audit-log.service';
import { UserModule } from '../user/user.module';

@Module({
  providers: [ProductService, PrismaService, AuditLogService],
  controllers: [ProductController],
  imports: [UserModule],
})
export class ProductModule {}
