import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { PrismaModule } from '../prisma.module';
import { AuditLogService } from '../audit-log.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [CategoryController],
  providers: [CategoryService, AuditLogService],
  exports: [CategoryService],
})
export class CategoryModule {}
