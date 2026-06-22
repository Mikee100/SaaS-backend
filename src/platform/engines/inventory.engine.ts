import { Injectable } from '@nestjs/common';
import {
  InventoryContext,
  InventoryEngine,
  InventoryResult,
} from '../engine.interfaces';
import { ENTITY_TYPE } from '../blueprint-registry.constants';

@Injectable()
export class PlatformInventoryEngine implements InventoryEngine {
  async deduct(context: InventoryContext): Promise<InventoryResult> {
    const usesRecipe = context.entityType === ENTITY_TYPE.MENU_ITEM;

    return {
      deductedQuantity: context.quantity,
      method: usesRecipe ? 'RECIPE' : 'SKU',
    };
  }
}
