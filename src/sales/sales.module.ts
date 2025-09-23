import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { PrismaService } from '../prisma.service';
import { AuditLogService } from '../audit-log.service';
import { RealtimeModule } from '../realtime.module';
import { UserModule } from '../user/user.module';
<<<<<<< HEAD
import { ConfigurationService } from '../config/configuration.service';
=======
import { ConfigModule } from '../config/config.module';
>>>>>>> a9ab4d8c5762126916fa97fc22de1f53d95703c1

@Module({
  imports: [
    RealtimeModule, 
    UserModule,
    ConfigModule, // Import ConfigModule to provide CONFIG_OPTIONS
  ],
  controllers: [SalesController],
<<<<<<< HEAD
  providers: [SalesService, PrismaService, AuditLogService, ConfigurationService],
=======
  providers: [
    SalesService, 
    PrismaService, 
    AuditLogService,
  ],
>>>>>>> a9ab4d8c5762126916fa97fc22de1f53d95703c1
  exports: [SalesService],
})
export class SalesModule {} 