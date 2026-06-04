import { Module } from '@nestjs/common';
import { TenantConfigurationModule } from '../tenant/tenant-configuration.module';
import { UserModule } from '../user/user.module';
import { BillingModule } from '../billing/billing.module';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';

@Module({
  imports: [TenantConfigurationModule, UserModule, BillingModule],
  controllers: [CrmController],
  providers: [CrmService],
  exports: [CrmService],
})
export class CrmModule {}
