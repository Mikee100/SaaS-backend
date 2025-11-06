import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedCategories() {
  try {
    console.log('Seeding default categories...');

    const categories = [
      {
        id: '1',
        name: 'Shoes',
        description: 'Footwear and shoes',
        customFields: {
          'Size': ['7', '8', '9', '10', '11'],
          'Color': ['Black', 'White', 'Red', 'Blue']
        }
      },
      {
        id: '2',
        name: 'Bags',
        description: 'Bags and accessories',
        customFields: {
          'Type': ['Backpack', 'Handbag', 'Tote'],
          'Color': ['Black', 'Brown', 'Red']
        }
      },
      {
        id: '3',
        name: 'Clothing',
        description: 'Apparel and fashion items',
        customFields: {
          'Size': ['XS', 'S', 'M', 'L', 'XL'],
          'Color': ['Black', 'White', 'Red', 'Blue', 'Green'],
          'Material': ['Cotton', 'Polyester', 'Wool']
        }
      },
      {
        id: '4',
        name: 'Electronics',
        description: 'Electronic devices and gadgets',
        customFields: {
          'Brand': ['Apple', 'Samsung', 'Sony', 'LG'],
          'Warranty': ['1 Year', '2 Years', '3 Years']
        }
      },
      {
        id: '5',
        name: 'Books',
        description: 'Books and publications',
        customFields: {
          'Genre': ['Fiction', 'Non-Fiction', 'Science', 'History'],
          'Author': []
        }
      }
    ];

    // Use hardcoded tenant and branch IDs
    const tenantId = '40b41d29-e483-4bb5-bc68-853eec8118bc';
    const branchId = '737a1bdd-f72b-4166-a494-9389a9d8c764';

    for (const categoryData of categories) {
      const existingCategory = await prisma.category.findUnique({
        where: { id: categoryData.id }
      });

      if (!existingCategory) {
        await prisma.category.create({
          data: {
            id: categoryData.id,
            name: categoryData.name,
            description: categoryData.description,
            tenantId: tenantId,
            branchId: branchId,
            isActive: true
          }
        });
        console.log(`Created category: ${categoryData.name} (ID: ${categoryData.id})`);
      } else {
        console.log(`Category already exists: ${categoryData.name} (ID: ${categoryData.id})`);
      }
    }

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding categories:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedCategories();
