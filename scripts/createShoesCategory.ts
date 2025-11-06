import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createShoesCategory() {
  try {
    console.log('Creating Shoes category...');

    // Use a default tenant ID for now
    const tenantId = '038fe688-49b2-434f-86dd-ca14378868df';

    // Check if Shoes category already exists
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: 'Shoes',
        tenantId,
        isActive: true,
      },
    });

    if (existingCategory) {
      console.log('Shoes category already exists');
      return existingCategory;
    }

    // Create Shoes category with custom fields
    const category = await prisma.category.create({
      data: {
        name: 'Shoes',
        description: 'Footwear products including sneakers, boots, sandals, and more',
        tenantId,
        fields: {
          create: [
            {
              name: 'Size',
              type: 'select',
              required: true,
              options: ['6', '7', '8', '9', '10', '11', '12'],
              placeholder: 'Select shoe size',
              tenantId,
            },
            {
              name: 'Color',
              type: 'select',
              required: true,
              options: ['Black', 'White', 'Red', 'Blue', 'Brown', 'Gray'],
              placeholder: 'Select shoe color',
              tenantId,
            },
            {
              name: 'Brand',
              type: 'text',
              required: true,
              placeholder: 'Enter brand name',
              tenantId,
            },
            {
              name: 'Material',
              type: 'select',
              required: false,
              options: ['Leather', 'Synthetic', 'Canvas'],
              placeholder: 'Select material',
              tenantId,
            },
            {
              name: 'Gender',
              type: 'select',
              required: false,
              options: ['Men', 'Women', 'Unisex'],
              placeholder: 'Select gender',
              tenantId,
            },
          ],
        },
      },
      include: {
        fields: true,
      },
    });

    console.log('Shoes category created successfully:', category);
    return category;
  } catch (error) {
    console.error('Error creating Shoes category:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createShoesCategory();
