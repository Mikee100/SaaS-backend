// A ProductMode declares how a sellable entity is created and stocked.
// It maps directly onto existing Prisma fields (Product.inventoryPolicy,
// hasVariations, unitId/pricePerUnit, BomRecipe) rather than introducing
// new storage — see docs discussion in the "Business OS Blueprint" work.
export const PRODUCT_MODES = [
  'simple',
  'variable',
  'unit_priced',
  'recipe',
  'service',
] as const;

export type ProductMode = (typeof PRODUCT_MODES)[number];

export function isProductMode(value: unknown): value is ProductMode {
  return (
    typeof value === 'string' &&
    (PRODUCT_MODES as readonly string[]).includes(value)
  );
}

// Mirrors the Product.inventoryPolicy string field (no Prisma enum exists
// for it today), so this stays a plain string map rather than a TS enum.
const PRODUCT_MODE_INVENTORY_POLICY: Record<ProductMode, string> = {
  simple: 'TRACKED',
  variable: 'TRACKED',
  unit_priced: 'TRACKED',
  recipe: 'RECIPE_DRIVEN',
  service: 'NON_TRACKED',
};

export function getInventoryPolicyForMode(mode: ProductMode): string {
  return PRODUCT_MODE_INVENTORY_POLICY[mode];
}
