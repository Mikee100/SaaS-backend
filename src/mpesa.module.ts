import { Module } from '@nestjs/common';
import { MpesaService } from './mpesa.service';

import { PrismaService } from './prisma.service';
import { SalesModule } from './sales/sales.module';

@Module({
  
  providers: [MpesaService, PrismaService],
  imports: [SalesModule],
})
export class MpesaModule {} 