import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { getInventoryPolicyForMode } from '../../../product/product-mode.types';

interface SaveBomPayload {
  productId: string;
  yieldQty?: number;
  yieldUnit?: string;
  lines: Array<{
    ingredientProductId: string;
    quantity: number;
    unit?: string;
    wastePercent?: number;
  }>;
}

@Injectable()
export class RestaurantBomService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllActive(tenantId: string, branchId: string) {
    const scoped = await this.prisma.bomRecipe.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [{ branchId }, { branchId: null }],
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            cost: true,
            unitAbbreviation: true,
          },
        },
        lines: {
          include: {
            ingredientProduct: {
              select: {
                id: true,
                name: true,
                sku: true,
                cost: true,
                unitAbbreviation: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (scoped.length > 0) {
      return scoped;
    }

    // Fallback for tenants that seeded BOM in a different branch.
    return this.prisma.bomRecipe.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            cost: true,
            unitAbbreviation: true,
          },
        },
        lines: {
          include: {
            ingredientProduct: {
              select: {
                id: true,
                name: true,
                sku: true,
                cost: true,
                unitAbbreviation: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findActiveByProduct(
    tenantId: string,
    branchId: string,
    productId: string,
  ) {
    const recipe = await this.prisma.bomRecipe.findFirst({
      where: {
        tenantId,
        productId,
        isActive: true,
        OR: [{ branchId }, { branchId: null }],
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            cost: true,
            unitAbbreviation: true,
          },
        },
        lines: {
          include: {
            ingredientProduct: {
              select: {
                id: true,
                name: true,
                sku: true,
                cost: true,
                unitAbbreviation: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ branchId: 'desc' }, { updatedAt: 'desc' }],
    });

    if (!recipe) {
      const tenantWide = await this.prisma.bomRecipe.findFirst({
        where: {
          tenantId,
          productId,
          isActive: true,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              cost: true,
              unitAbbreviation: true,
            },
          },
          lines: {
            include: {
              ingredientProduct: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  cost: true,
                  unitAbbreviation: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: [{ branchId: 'desc' }, { updatedAt: 'desc' }],
      });

      if (!tenantWide) {
        throw new NotFoundException('BOM recipe not found for product');
      }

      return tenantWide;
    }

    return recipe;
  }

  async saveRecipe(
    tenantId: string,
    branchId: string,
    actorUserId: string,
    payload: SaveBomPayload,
  ) {
    if (!payload?.productId) {
      throw new BadRequestException('Product is required');
    }

    if (!Array.isArray(payload.lines) || payload.lines.length === 0) {
      throw new BadRequestException('At least one ingredient line is required');
    }

    const product = await this.prisma.product.findFirst({
      where: {
        id: payload.productId,
        tenantId,
        deletedAt: null,
        OR: [{ branchId }, { branchId: null }],
      },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found in this branch or tenant');
    }

    if (
      payload.lines.some(
        (line) => line.ingredientProductId === payload.productId,
      )
    ) {
      throw new BadRequestException(
        'A product cannot reference itself as an ingredient',
      );
    }

    const ingredientIds = [
      ...new Set(payload.lines.map((line) => line.ingredientProductId)),
    ];

    if (ingredientIds.length !== payload.lines.length) {
      throw new BadRequestException(
        'Duplicate ingredient lines are not allowed',
      );
    }

    const ingredientCount = await this.prisma.product.count({
      where: {
        id: { in: ingredientIds },
        tenantId,
        deletedAt: null,
        OR: [{ branchId }, { branchId: null }],
      },
    });

    if (ingredientCount !== ingredientIds.length) {
      throw new BadRequestException(
        'One or more ingredient products were not found in this branch or tenant',
      );
    }

    if (payload.lines.some((line) => Number(line.quantity) <= 0)) {
      throw new BadRequestException(
        'Ingredient quantity must be greater than zero',
      );
    }

    const normalizedLines = payload.lines.map((line) => ({
      ingredientProductId: line.ingredientProductId,
      quantity: Number(line.quantity),
      unit: (line.unit || 'unit').trim() || 'unit',
      wastePercent: Math.max(0, Number(line.wastePercent || 0)),
    }));

    const yieldQty = Number(payload.yieldQty || 1);
    if (yieldQty <= 0) {
      throw new BadRequestException('Yield quantity must be greater than zero');
    }

    return this.prisma.$transaction(async (tx) => {
      const existingActive = await tx.bomRecipe.findFirst({
        where: {
          tenantId,
          productId: payload.productId,
          branchId,
          isActive: true,
        },
        select: { id: true, version: true },
      });

      // A recipe now governs this product's stock, regardless of how it
      // was created - keep inventoryPolicy in sync so downstream inventory
      // logic (see product-mode.types.ts) treats it as recipe-driven.
      await tx.product.update({
        where: { id: payload.productId },
        data: { inventoryPolicy: getInventoryPolicyForMode('recipe') },
      });

      if (!existingActive) {
        return tx.bomRecipe.create({
          data: {
            tenantId,
            branchId,
            productId: payload.productId,
            yieldQty,
            yieldUnit: (payload.yieldUnit || 'portion').trim() || 'portion',
            isActive: true,
            createdBy: actorUserId,
            lines: {
              create: normalizedLines,
            },
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                cost: true,
                unitAbbreviation: true,
              },
            },
            lines: {
              include: {
                ingredientProduct: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                    cost: true,
                    unitAbbreviation: true,
                  },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        });
      }

      await tx.bomRecipeLine.deleteMany({
        where: { recipeId: existingActive.id },
      });

      return tx.bomRecipe.update({
        where: { id: existingActive.id },
        data: {
          yieldQty,
          yieldUnit: (payload.yieldUnit || 'portion').trim() || 'portion',
          version: { increment: 1 },
          lines: {
            create: normalizedLines,
          },
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              cost: true,
              unitAbbreviation: true,
            },
          },
          lines: {
            include: {
              ingredientProduct: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  cost: true,
                  unitAbbreviation: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    });
  }
}
