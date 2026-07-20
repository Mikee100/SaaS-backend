import { Module } from '@nestjs/common';
import { HrService } from './hr.service';
import { HrController } from './hr.controller';
import { PrismaModule } from '../prisma.module';
import { UserModule } from '../user/user.module';
import { EmailModule } from '../email/email.module';
import { PayrollReportScheduler } from './payroll-report.scheduler';

@Module({
  imports: [PrismaModule, UserModule, EmailModule],
  providers: [HrService, PayrollReportScheduler],
  controllers: [HrController],
  exports: [HrService],
})
export class HrModule {}
