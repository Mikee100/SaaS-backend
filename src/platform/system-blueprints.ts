import { BlueprintSchema } from './blueprint.types';
import {
  CAPABILITY,
  ENTITY_TYPE,
  VERTICAL,
} from './blueprint-registry.constants';

export const SYSTEM_BLUEPRINTS: BlueprintSchema[] = [
  {
    key: 'restaurant-v1',
    version: 'v1',
    vertical: VERTICAL.RESTAURANT,
    displayName: 'Restaurant v1',
    capabilities: [
      CAPABILITY.RECIPE_BOM,
      CAPABILITY.SKU_INVENTORY,
      CAPABILITY.TIME_WINDOW_PRICING,
    ],
    entityContracts: [
      {
        entityType: ENTITY_TYPE.MENU_ITEM,
        requiredFields: ['name', 'basePrice', 'category'],
        optionalFields: ['prepStation', 'allergens', 'taxClass', 'recipeLines'],
        capabilities: [CAPABILITY.RECIPE_BOM, CAPABILITY.TIME_WINDOW_PRICING],
        workflow: [
          { key: 'identity', label: 'Menu Identity', required: true },
          { key: 'pricing', label: 'Service Mode Pricing', required: true },
          { key: 'recipe', label: 'Recipe / BOM', required: false },
          { key: 'availability', label: 'Availability', required: false },
        ],
      },
    ],
  },
  {
    key: 'fashion-v1',
    version: 'v1',
    vertical: VERTICAL.FASHION,
    displayName: 'Fashion v1',
    capabilities: [
      CAPABILITY.SKU_INVENTORY,
      CAPABILITY.VARIANT_MATRIX,
      CAPABILITY.MARKDOWN_PRICING,
    ],
    entityContracts: [
      {
        entityType: ENTITY_TYPE.PRODUCT_STYLE,
        requiredFields: ['name', 'basePrice', 'category'],
        optionalFields: [
          'brand',
          'supplierId',
          'season',
          'variants',
          'barcode',
        ],
        capabilities: [CAPABILITY.SKU_INVENTORY, CAPABILITY.VARIANT_MATRIX],
        workflow: [
          { key: 'identity', label: 'Style Identity', required: true },
          { key: 'variants', label: 'Variant Matrix', required: true },
          { key: 'supply', label: 'Supplier and Cost', required: false },
          { key: 'openingStock', label: 'Opening Stock', required: false },
        ],
      },
      {
        entityType: ENTITY_TYPE.RETAIL_PRODUCT,
        requiredFields: ['name', 'basePrice'],
        optionalFields: ['sku', 'barcode', 'supplierId', 'stockQuantity'],
        capabilities: [CAPABILITY.SKU_INVENTORY],
        workflow: [
          { key: 'identity', label: 'Product Identity', required: true },
          { key: 'pricing', label: 'Pricing', required: true },
          { key: 'stock', label: 'Stock Setup', required: false },
        ],
      },
    ],
  },
  {
    key: 'spa-v1',
    version: 'v1',
    vertical: VERTICAL.SPA,
    displayName: 'Spa v1',
    capabilities: [CAPABILITY.SERVICE_BOOKING, CAPABILITY.SKU_INVENTORY],
    entityContracts: [
      {
        entityType: ENTITY_TYPE.SERVICE,
        requiredFields: ['name', 'basePrice', 'durationMinutes'],
        optionalFields: ['staffSkillLevel', 'commissionProfile', 'consumables'],
        capabilities: [CAPABILITY.SERVICE_BOOKING],
        workflow: [
          { key: 'identity', label: 'Service Identity', required: true },
          { key: 'duration', label: 'Duration and Rules', required: true },
          {
            key: 'staffing',
            label: 'Staffing and Commission',
            required: false,
          },
        ],
      },
    ],
  },
];
