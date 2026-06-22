import { Module } from '@nestjs/common';
import { TenantConfigurationModule } from '../tenant/tenant-configuration.module';
import { BlueprintService } from './blueprint.service';
import { EntityController } from './entity.controller';
import { EntityService } from './entity.service';
import { PlatformInventoryEngine } from './engines/inventory.engine';
import { PlatformPricingEngine } from './engines/pricing.engine';
import { PlatformSalesEngine } from './engines/sales.engine';
import { PlatformTaxEngine } from './engines/tax.engine';

@Module({
  imports: [TenantConfigurationModule],
  controllers: [EntityController],
  providers: [
    BlueprintService,
    EntityService,
    PlatformPricingEngine,
    PlatformInventoryEngine,
    PlatformTaxEngine,
    PlatformSalesEngine,
  ],
  exports: [
    BlueprintService,
    EntityService,
    PlatformPricingEngine,
    PlatformInventoryEngine,
    PlatformTaxEngine,
    PlatformSalesEngine,
  ],
})
export class PlatformModule {}
