import { Module } from '@nestjs/common';
import { ClassificationService } from './classification.service';
import { ClassificationController } from './classification.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [ClassificationController],
  providers: [ClassificationService, PrismaService],
  exports: [ClassificationService],
})
export class ClassificationModule {}
