import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaService } from '../prisma.service';
import { AuditLogService } from '../audit-log.service';


@Module({
  providers: [UserService, PrismaService, AuditLogService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}