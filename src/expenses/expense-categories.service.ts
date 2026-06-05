import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditLogService } from '../audit-log.service';
import { v4 as uuidv4 } from 'uuid';

interface ExpenseCategoryInput {
  name?: string;
  description?: string;
  color?: string;
}

@Injectable()
export class ExpenseCategoriesService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async createCategory(
    dto: ExpenseCategoryInput,
    tenantId: string,
    userId: string,
  ) {
    const categoryName = dto.name?.trim();

    // Validate required fields
    if (!categoryName) {
      throw new BadRequestException('Category name is required');
    }

    // Check if category name already exists for this tenant
    const existingCategory = await this.prisma.expenseCategory.findFirst({
      where: {
        tenantId,
        name: categoryName,
        isActive: true,
      },
    });

    if (existingCategory) {
      throw new BadRequestException('Category name already exists');
    }

    const categoryId = uuidv4();
    const now = new Date();

    const category = await this.prisma.expenseCategory.create({
      data: {
        id: categoryId,
        tenantId,
        name: categoryName,
        description: dto.description?.trim(),
        color: dto.color || '#6366f1', // Default indigo color
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    });

    // Audit log
    if (this.auditLogService) {
      await this.auditLogService.log(
        userId,
        'expense_category_created',
        {
          categoryId,
          name: categoryName,
        },
        undefined,
      );
    }

    return category;
  }

  async getCategories(tenantId: string) {
    const categories = await this.prisma.expenseCategory.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });

    return categories;
  }

  async getCategoryById(id: string, tenantId: string) {
    const category = await this.prisma.expenseCategory.findFirst({
      where: {
        id,
        tenantId,
        isActive: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async updateCategory(
    id: string,
    dto: ExpenseCategoryInput,
    tenantId: string,
    userId: string,
  ) {
    // Check if category exists and belongs to tenant
    const existingCategory = await this.prisma.expenseCategory.findFirst({
      where: {
        id,
        tenantId,
        isActive: true,
      },
    });

    if (!existingCategory) {
      throw new NotFoundException('Category not found');
    }

    // Check if new name conflicts with existing categories
    const categoryName = dto.name?.trim();

    if (categoryName && categoryName !== existingCategory.name) {
      const nameConflict = await this.prisma.expenseCategory.findFirst({
        where: {
          tenantId,
          name: categoryName,
          isActive: true,
          id: { not: id },
        },
      });

      if (nameConflict) {
        throw new BadRequestException('Category name already exists');
      }
    }

    const updatedCategory = await this.prisma.expenseCategory.update({
      where: { id },
      data: {
        name: categoryName,
        description: dto.description?.trim(),
        color: dto.color,
        updatedAt: new Date(),
      },
    });

    // Audit log
    if (this.auditLogService) {
      await this.auditLogService.log(
        userId,
        'expense_category_updated',
        {
          categoryId: id,
          name: categoryName,
        },
        undefined,
      );
    }

    return updatedCategory;
  }

  async deleteCategory(id: string, tenantId: string, userId: string) {
    // Check if category exists and belongs to tenant
    const existingCategory = await this.prisma.expenseCategory.findFirst({
      where: {
        id,
        tenantId,
        isActive: true,
      },
    });

    if (!existingCategory) {
      throw new NotFoundException('Category not found');
    }

    // Check if category is being used by any expenses
    const expensesUsingCategory = await this.prisma.expense.findFirst({
      where: {
        categoryId: id,
        tenantId,
        isActive: true,
      },
    });

    if (expensesUsingCategory) {
      throw new BadRequestException(
        'Cannot delete category that is being used by expenses',
      );
    }

    const now = new Date();
    await this.prisma.expenseCategory.update({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: now, isActive: false },
    });

    // Audit log
    if (this.auditLogService) {
      await this.auditLogService.log(
        userId,
        'expense_category_deleted',
        {
          categoryId: id,
          name: existingCategory.name,
        },
        undefined,
      );
    }

    return { success: true, message: 'Category deleted successfully' };
  }
}
