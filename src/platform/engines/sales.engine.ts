import { Injectable } from '@nestjs/common';
import {
  SalesEngine,
  SalesExecutionPayload,
  SalesExecutionResult,
} from '../engine.interfaces';
import { PlatformPricingEngine } from './pricing.engine';
import { PlatformInventoryEngine } from './inventory.engine';
import { PlatformTaxEngine } from './tax.engine';

@Injectable()
export class PlatformSalesEngine implements SalesEngine {
  constructor(
    private readonly pricingEngine: PlatformPricingEngine,
    private readonly inventoryEngine: PlatformInventoryEngine,
    private readonly taxEngine: PlatformTaxEngine,
  ) {}

  async execute(payload: SalesExecutionPayload): Promise<SalesExecutionResult> {
    const executionOrder = [
      'validate_payload',
      'resolve_blueprint',
      'apply_capability_rules',
      'calculate_pricing',
      'calculate_tax',
      'reserve_or_deduct_inventory',
      'persist_sale',
      'emit_events',
      'respond',
    ];

    const pricing = await this.pricingEngine.calculate({
      tenantId: payload.tenantId,
      entityType: payload.entityType,
      basePrice: payload.basePrice,
      timestamp: new Date(),
    });

    const tax = await this.taxEngine.compute({
      tenantId: payload.tenantId,
      amount: pricing.effectivePrice * payload.quantity,
      inclusive: false,
    });

    const inventory = await this.inventoryEngine.deduct({
      tenantId: payload.tenantId,
      entityType: payload.entityType,
      quantity: payload.quantity,
      branchId: payload.branchId,
    });

    return {
      executionOrder,
      pricing,
      inventory,
      tax,
    };
  }
}
