import { Module } from '@nestjs/common';
import { MpesaService } from './mpesa.service';
import { MpesaController } from './mpesa.controller';
import { PrismaService } from './prisma.service';
import { SalesModule } from './sales/sales.module';

@Module({
  controllers: [MpesaController],
  providers: [MpesaService, PrismaService],
  imports: [SalesModule],
})
export class MpesaModule {} 