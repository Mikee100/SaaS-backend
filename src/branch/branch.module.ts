import { Module } from '@nestjs/common';
import { BranchController } from './branch.controller';
import { BranchService } from './branch.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [BranchController],
  providers: [BranchService, PrismaService],
  exports: [BranchService],
})
export class BranchModule {}
