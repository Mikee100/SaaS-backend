import { EntityTypeKey } from './blueprint-registry.constants';

export interface PricingContext {
  tenantId: string;
  entityType: EntityTypeKey;
  basePrice: number;
  timestamp?: Date;
}

export interface PricingResult {
  effectivePrice: number;
  appliedStrategy: 'STANDARD' | 'TIME_WINDOW' | 'MARKDOWN';
}

export interface InventoryContext {
  tenantId: string;
  entityType: EntityTypeKey;
  quantity: number;
  branchId?: string | null;
}

export interface InventoryResult {
  deductedQuantity: number;
  method: 'SKU' | 'RECIPE';
}

export interface TaxContext {
  tenantId: string;
  amount: number;
  taxClass?: string;
  inclusive?: boolean;
}

export interface TaxResult {
  netAmount: number;
  taxAmount: number;
  grossAmount: number;
}

export interface SalesExecutionPayload {
  tenantId: string;
  entityType: EntityTypeKey;
  quantity: number;
  basePrice: number;
  branchId?: string | null;
}

export interface SalesExecutionResult {
  executionOrder: string[];
  pricing: PricingResult;
  inventory: InventoryResult;
  tax: TaxResult;
}

export interface PricingEngine {
  calculate(context: PricingContext): Promise<PricingResult>;
}

export interface InventoryEngine {
  deduct(context: InventoryContext): Promise<InventoryResult>;
}

export interface TaxEngine {
  compute(context: TaxContext): Promise<TaxResult>;
}

export interface SalesEngine {
  execute(payload: SalesExecutionPayload): Promise<SalesExecutionResult>;
}
