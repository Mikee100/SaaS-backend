import { Module } from '@nestjs/common';
import { UsageController } from './usage.controller';
import { PrismaService } from './prisma.service';

@Module({
  controllers: [UsageController],
  providers: [PrismaService],
})
export class UsageModule {}
