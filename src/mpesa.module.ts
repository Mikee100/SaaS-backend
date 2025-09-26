import { Module } from '@nestjs/common';
import { MpesaController } from './mpesa/mpesa.controller';

@Module({
  controllers: [MpesaController],
})
export class MpesaModule {}
