import { Module } from '@nestjs/common';
import { BranchService } from './branch.service';
import { BranchController } from './branch.controller';
import { PrismaService } from './prisma.service';

@Module({
  providers: [BranchService, PrismaService],
  controllers: [BranchController],
})
export class BranchModule {}
