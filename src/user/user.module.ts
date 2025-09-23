import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { AuditLogService } from '../audit-log.service';

@Module({
  imports: [],
  providers: [UserService, AuditLogService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}