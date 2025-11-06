import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { AuditLogService } from '../audit-log.service';

export interface CreateCategoryDto {
  name: string;
  description?: string;
  customFields: Array<{
    name: string;
    type: 'text' | 'number' | 'select' | 'boolean';
    required: boolean;
    options?: string[];
    placeholder?: string;
  }>;
}

export interface UpdateCategoryDto {
  name?: string;
  description?: string;
  customFields?: Array<{
    id?: string;
    name: string;
    type: 'text' | 'number' | 'select' | 'boolean';
    required: boolean;
    options?: string[];
    placeholder?: string;
  }>;
}

@Injectable()
export class CategoryService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async findAll(tenantId: string, branchId?: string) {
    const where: any = { tenantId, isActive: true };
    if (branchId) {
      where.branchId = branchId;
    }

    return this.prisma.category.findMany({
      where,
      include: {
        fields: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { products: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId, isActive: true },
      include: {
        fields: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async create(data: CreateCategoryDto, tenantId: string, branchId?: string, userId?: string) {
    // Validate custom fields
    if (!data.customFields || data.customFields.length === 0) {
      throw new BadRequestException('At least one custom field is required');
    }

    // Check for duplicate category name
    const existingCategory = await this.prisma.category.findFirst({
      where: {
        name: data.name,
        tenantId,
        isActive: true,
      },
    });

    if (existingCategory) {
      throw new BadRequestException('Category with this name already exists');
    }

    const categoryId = uuidv4();

    // Create category with fields in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const category = await tx.category.create({
        data: {
          id: categoryId,
          name: data.name,
          description: data.description,
          tenantId,
          branchId,
        },
      });

      // Create custom fields
      const fieldPromises = data.customFields.map(field =>
        tx.categoryField.create({
          data: {
            name: field.name,
            type: field.type,
            required: field.required,
            options: field.options,
            placeholder: field.placeholder,
            categoryId,
            tenantId,
          },
        })
      );

      await Promise.all(fieldPromises);

      // Return category with fields
      return tx.category.findUnique({
        where: { id: categoryId },
        include: {
          fields: {
            where: { isActive: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    });

    // Log the action
    if (this.auditLogService && userId) {
      await this.auditLogService.log(
        userId,
        'category_created',
        {
          categoryId,
          categoryName: data.name,
          fieldCount: data.customFields.length,
        },
        undefined,
      );
    }

    return result;
  }

  async update(id: string, data: UpdateCategoryDto, tenantId: string, userId?: string) {
    // Check if category exists
    const existingCategory = await this.prisma.category.findFirst({
      where: { id, tenantId, isActive: true },
      include: { fields: true },
    });

    if (!existingCategory) {
      throw new NotFoundException('Category not found');
    }

    // Check for duplicate name if name is being updated
    if (data.name && data.name !== existingCategory.name) {
      const duplicateCategory = await this.prisma.category.findFirst({
        where: {
          name: data.name,
          tenantId,
          isActive: true,
          id: { not: id },
        },
      });

      if (duplicateCategory) {
        throw new BadRequestException('Category with this name already exists');
      }
    }

    // Update category and fields in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Update category
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;

      await tx.category.update({
        where: { id },
        data: updateData,
      });

      // Handle custom fields update if provided
      if (data.customFields) {
        // Soft delete existing fields
        await tx.categoryField.updateMany({
          where: { categoryId: id },
          data: { isActive: false },
        });

        // Create new fields
        const fieldPromises = data.customFields.map(field =>
          tx.categoryField.create({
            data: {
              name: field.name,
              type: field.type,
              required: field.required,
              options: field.options,
              placeholder: field.placeholder,
              categoryId: id,
              tenantId,
            },
          })
        );

        await Promise.all(fieldPromises);
      }

      // Return updated category
      return tx.category.findUnique({
        where: { id },
        include: {
          fields: {
            where: { isActive: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    });

    // Log the action
    if (this.auditLogService && userId) {
      await this.auditLogService.log(
        userId,
        'category_updated',
        {
          categoryId: id,
          categoryName: result?.name,
        },
        undefined,
      );
    }

    return result;
  }

  async delete(id: string, tenantId: string, userId?: string) {
    // Check if category exists and has products
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId, isActive: true },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (category._count.products > 0) {
      throw new BadRequestException('Cannot delete category with existing products');
    }

    // Soft delete category and fields
    await this.prisma.$transaction(async (tx) => {
      await tx.categoryField.updateMany({
        where: { categoryId: id },
        data: { isActive: false },
      });

      await tx.category.update({
        where: { id },
        data: { isActive: false },
      });
    });

    // Log the action
    if (this.auditLogService && userId) {
      await this.auditLogService.log(
        userId,
        'category_deleted',
        {
          categoryId: id,
          categoryName: category.name,
        },
        undefined,
      );
    }

    return { success: true };
  }

  async getCategoryFields(categoryId: string, tenantId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, tenantId, isActive: true },
      include: {
        fields: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category.fields;
  }
}
