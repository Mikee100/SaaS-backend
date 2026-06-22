import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantConfigurationService } from '../config/tenant-configuration.service';
import { BUSINESS_TYPE_CONFIG_KEY } from '../blueprints/blueprint-manifest.constants';
import {
  CapabilityKey,
  EntityTypeKey,
  VERTICAL,
  VerticalKey,
} from './blueprint-registry.constants';
import { BlueprintSchema, BlueprintWorkflowStep } from './blueprint.types';
import { SYSTEM_BLUEPRINTS } from './system-blueprints';

@Injectable()
export class BlueprintService {
  private readonly blueprints = new Map<string, BlueprintSchema>();
  private seeded = false;

  constructor(
    private readonly tenantConfigurationService: TenantConfigurationService,
  ) {
    for (const blueprint of SYSTEM_BLUEPRINTS) {
      this.blueprints.set(blueprint.key, blueprint);
    }
  }

  seedSystemBlueprints() {
    this.seeded = true;
    return {
      seeded: true,
      total: SYSTEM_BLUEPRINTS.length,
      keys: SYSTEM_BLUEPRINTS.map((entry) => entry.key),
    };
  }

  private inferBlueprintKeyFromVertical(vertical: VerticalKey): string {
    if (vertical === VERTICAL.RESTAURANT) {
      return 'restaurant-v1';
    }
    if (vertical === VERTICAL.SPA) {
      return 'spa-v1';
    }
    return 'fashion-v1';
  }

  private normalizeVertical(value: string | null): VerticalKey {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === VERTICAL.RESTAURANT) {
      return VERTICAL.RESTAURANT;
    }
    if (normalized === VERTICAL.SPA || normalized === 'spa_barber') {
      return VERTICAL.SPA;
    }
    return VERTICAL.FASHION;
  }

  async resolveBlueprintForTenant(tenantId: string): Promise<BlueprintSchema> {
    const businessType = await this.tenantConfigurationService.getTenantConfiguration(
      tenantId,
      BUSINESS_TYPE_CONFIG_KEY,
    );
    const vertical = this.normalizeVertical(businessType);
    const key = this.inferBlueprintKeyFromVertical(vertical);
    const blueprint = this.blueprints.get(key);

    if (!blueprint) {
      throw new NotFoundException(`No blueprint found for key ${key}`);
    }

    return blueprint;
  }

  async evaluateCapabilities(
    tenantId: string,
  ): Promise<Record<CapabilityKey, boolean>> {
    const blueprint = await this.resolveBlueprintForTenant(tenantId);
    const capabilitySet = new Set(blueprint.capabilities);

    return blueprint.capabilities.reduce(
      (acc, capability) => ({
        ...acc,
        [capability]: capabilitySet.has(capability),
      }),
      {} as Record<CapabilityKey, boolean>,
    );
  }

  async getWorkflowSteps(
    tenantId: string,
    entityType: EntityTypeKey,
  ): Promise<BlueprintWorkflowStep[]> {
    const blueprint = await this.resolveBlueprintForTenant(tenantId);
    const contract = blueprint.entityContracts.find(
      (entry) => entry.entityType === entityType,
    );

    if (!contract) {
      throw new NotFoundException(
        `Entity type ${entityType} is not allowed for tenant blueprint ${blueprint.key}`,
      );
    }

    return contract.workflow;
  }

  getSystemBlueprints(): BlueprintSchema[] {
    return SYSTEM_BLUEPRINTS;
  }

  isSeeded(): boolean {
    return this.seeded;
  }
}
