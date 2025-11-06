import { Module } from '@nestjs/common';
import { SalesTargetController } from './sales-target.controller';
import { SalesTargetService } from './sales-target.service';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SalesTargetController],
  providers: [SalesTargetService],
  exports: [SalesTargetService],
})
export class SalesTargetModule {}
