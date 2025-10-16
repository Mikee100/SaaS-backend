import { Module } from '@nestjs/common';
import { MpesaController } from './mpesa.controller';
import { MpesaService } from './mpesa.service';
import { AuthModule } from '../auth/auth.module';
import { SalesModule } from '../sales/sales.module';

@Module({
  imports: [AuthModule, SalesModule],
  controllers: [MpesaController],
  providers: [MpesaService],
})
export class MpesaModule {}
