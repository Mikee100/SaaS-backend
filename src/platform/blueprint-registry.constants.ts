export const CAPABILITY = {
  SKU_INVENTORY: 'SKU_INVENTORY',
  RECIPE_BOM: 'RECIPE_BOM',
  VARIANT_MATRIX: 'VARIANT_MATRIX',
  TIME_WINDOW_PRICING: 'TIME_WINDOW_PRICING',
  MARKDOWN_PRICING: 'MARKDOWN_PRICING',
  SERVICE_BOOKING: 'SERVICE_BOOKING',
} as const;

export const VERTICAL = {
  RESTAURANT: 'restaurant',
  FASHION: 'fashion',
  SPA: 'spa',
} as const;

export const ENTITY_TYPE = {
  MENU_ITEM: 'MENU_ITEM',
  PRODUCT_STYLE: 'PRODUCT_STYLE',
  SERVICE: 'SERVICE',
  RETAIL_PRODUCT: 'RETAIL_PRODUCT',
} as const;

export type CapabilityKey = (typeof CAPABILITY)[keyof typeof CAPABILITY];
export type VerticalKey = (typeof VERTICAL)[keyof typeof VERTICAL];
export type EntityTypeKey = (typeof ENTITY_TYPE)[keyof typeof ENTITY_TYPE];
