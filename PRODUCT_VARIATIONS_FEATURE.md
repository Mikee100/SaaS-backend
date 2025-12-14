# Product Variations Feature

This feature enables businesses to create products with complex variations, such as:
- **Shoes**: Converse in different colors (Grey, Black) and sizes (38, 39, 40, 41, etc.)
- **Phones**: iPhone 14 in different colors (Black, Grey) and storage capacities (256GB, 512GB)
- **Any product** with multiple attributes and value combinations

## Architecture

### Database Schema

The feature introduces three new models:

1. **ProductAttribute**: Defines reusable attributes (e.g., "Color", "Size", "Storage")
   - `name`: Unique attribute name per tenant
   - `type`: text, number, color, or image
   - `displayName`: Optional display name

2. **ProductAttributeValue**: Values for each attribute (e.g., "Black", "38", "256GB")
   - `value`: The actual value
   - `displayName`: Optional display name
   - `color`: Hex color for color attributes
   - `image`: Image URL for image-based attributes
   - `sortOrder`: For custom ordering

3. **ProductVariation**: Enhanced with better attribute support
   - `attributes`: JSON object mapping attribute names to values
   - `sku`: Unique SKU for each variation
   - `price`, `cost`, `stock`: Override values for this variation
   - `barcode`: Optional barcode
   - `weight`: Optional weight override

### Backend API

#### Product Attributes Endpoints

- `GET /product-attributes` - Get all attributes for tenant
- `GET /product-attributes/common` - Get or create common attributes (Color, Size, Storage)
- `GET /product-attributes/:id` - Get single attribute
- `POST /product-attributes` - Create new attribute
- `PUT /product-attributes/:id` - Update attribute
- `DELETE /product-attributes/:id` - Delete attribute (soft delete)
- `POST /product-attributes/:id/values` - Add value to attribute
- `PUT /product-attributes/values/:valueId` - Update attribute value
- `DELETE /product-attributes/values/:valueId` - Delete attribute value

#### Product Variations Endpoints

- `GET /products/:productId/variations` - Get all variations for a product
- `POST /products/:productId/variations` - Create a single variation
- `POST /products/:productId/generate-variations` - Generate all combinations from attributes
- `PUT /products/variations/:id` - Update variation
- `DELETE /products/variations/:id` - Delete variation (soft delete)

### Frontend Components

1. **VariationManager** (`src/components/products/VariationManager.tsx`)
   - Manages variations for a product
   - Generate variations from attributes
   - Create/edit/delete individual variations
   - Variation matrix display

2. **ProductAttributesManager** (`src/components/products/ProductAttributesManager.tsx`)
   - Manage product attributes
   - Create/edit/delete attributes
   - Add/remove attribute values

## Usage Examples

### Example 1: Shoes with Color and Size

1. **Create Attributes**:
   - Create "Color" attribute with values: Black, Grey, White
   - Create "Size" attribute with values: 38, 39, 40, 41, 42

2. **Create Product**:
   - Product: "Converse Classic"
   - Base SKU: "CONV-001"
   - Base Price: $50

3. **Generate Variations**:
   - Select Color: Black, Grey
   - Select Size: 38, 39, 40, 41
   - System generates 8 variations:
     - CONV-001-Black-38
     - CONV-001-Black-39
     - CONV-001-Black-40
     - CONV-001-Black-41
     - CONV-001-Grey-38
     - CONV-001-Grey-39
     - CONV-001-Grey-40
     - CONV-001-Grey-41

4. **Customize Variations**:
   - Set different prices for different sizes
   - Set stock levels for each variation
   - Add barcodes

### Example 2: Phones with Color and Storage

1. **Create Attributes**:
   - Create "Color" attribute: Black, Grey, Blue
   - Create "Storage" attribute: 256GB, 512GB, 1TB

2. **Create Product**:
   - Product: "iPhone 14"
   - Base SKU: "IPH14"
   - Base Price: $999

3. **Generate Variations**:
   - Select Color: Black, Grey
   - Select Storage: 256GB, 512GB
   - System generates 4 variations:
     - IPH14-Black-256GB
     - IPH14-Black-512GB
     - IPH14-Grey-256GB
     - IPH14-Grey-512GB

4. **Set Different Prices**:
   - 256GB: $999
   - 512GB: $1199

## Database Migration

To apply the schema changes, run:

```bash
cd backend
npx prisma migrate dev --name add_product_variations
npx prisma generate
```

## Testing

### Backend Tests

```bash
cd backend
npm test -- product.service.spec.ts
npm test -- product-attribute.service.spec.ts
```

### Manual Testing

1. Create attributes via API or UI
2. Create a product
3. Generate variations
4. Verify all combinations are created
5. Update individual variation prices/stocks
6. Test in sales/POS flow

## Future Enhancements

- [ ] Variation images (different images per variation)
- [ ] Variation-specific inventory locations
- [ ] Bulk stock updates
- [ ] Variation analytics
- [ ] Import/export variations
- [ ] Variation templates
- [ ] Conditional attributes (e.g., Size only for certain colors)
