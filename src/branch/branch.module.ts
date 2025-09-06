import { Module } from '@nestjs/common';
import { BranchController } from './branch.controller';
import { BranchService } from './branch.service';
import { PrismaService } from '../prisma.service';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [UserModule, AuthModule],
  controllers: [BranchController],
  providers: [
    BranchService, 
    PrismaService
  ],
  exports: [BranchService],
})
export class BranchModule {}
