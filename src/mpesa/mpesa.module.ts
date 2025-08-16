import { Module } from '@nestjs/common';
import { MpesaController } from './mpesa.controller';

@Module({
  controllers: [MpesaController],
})
export class MpesaModule {}
