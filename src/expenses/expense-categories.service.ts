import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditLogService } from '../audit-log.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ExpenseCategoriesService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async createCategory(dto: any, tenantId: string, userId: string) {
    // Validate required fields
    if (!dto.name?.trim()) {
      throw new BadRequestException('Category name is required');
    }

    // Check if category name already exists for this tenant
    const existingCategory = await this.prisma.expenseCategory.findFirst({
      where: {
        tenantId,
        name: dto.name.trim(),
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
        name: dto.name.trim(),
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
          name: dto.name,
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

  async updateCategory(id: string, dto: any, tenantId: string, userId: string) {
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
    if (dto.name && dto.name.trim() !== existingCategory.name) {
      const nameConflict = await this.prisma.expenseCategory.findFirst({
        where: {
          tenantId,
          name: dto.name.trim(),
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
        name: dto.name?.trim(),
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
          name: dto.name,
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

    // Soft delete
    await this.prisma.expenseCategory.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
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
