import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditLogService } from '../audit-log.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SalaryService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async createSalaryScheme(dto: any, tenantId: string, userId: string) {
    // Validate required fields
    if (!dto.employeeName?.trim()) {
      throw new BadRequestException('Employee name is required');
    }
    if (!dto.salaryAmount || dto.salaryAmount <= 0) {
      throw new BadRequestException('Valid salary amount is required');
    }
    if (!dto.frequency || !['monthly', 'yearly'].includes(dto.frequency)) {
      throw new BadRequestException('Valid frequency (monthly or yearly) is required');
    }
    if (!dto.startDate) {
      throw new BadRequestException('Start date is required');
    }

    // Validate branch if provided
    let validBranchId: string | null = dto.branchId || null;
    if (dto.branchId) {
      const branchExists = await this.prisma.branch.findUnique({
        where: { id: dto.branchId },
        select: { id: true, tenantId: true },
      });
      if (!branchExists || branchExists.tenantId !== tenantId) {
        console.warn(
          `Invalid branchId ${dto.branchId} for tenant ${tenantId}, setting to null`,
        );
        validBranchId = null;
      }
    }

    const salarySchemeId = uuidv4();
    const now = new Date();

    // Create salary scheme record
    const salaryScheme = await this.prisma.salaryScheme.create({
      data: {
        id: salarySchemeId,
        tenantId,
        userId,
        employeeName: dto.employeeName.trim(),
        salaryAmount: dto.salaryAmount,
        frequency: dto.frequency,
        startDate: new Date(dto.startDate),
        branchId: validBranchId,
        notes: dto.notes?.trim(),
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Audit log
    if (this.auditLogService) {
      await this.auditLogService.log(
        userId,
        'salary_scheme_created',
        {
          salarySchemeId,
          employeeName: dto.employeeName,
          salaryAmount: dto.salaryAmount,
          frequency: dto.frequency,
        },
        undefined,
      );
    }

    return salaryScheme;
  }

  async getSalarySchemes(tenantId: string, branchId?: string, query?: any) {
    const whereClause: any = { tenantId };

    // Filter by branch if specified
    if (branchId && branchId !== 'all') {
      whereClause.branchId = branchId;
    }

    // Search by employee name
    if (query?.search) {
      whereClause.employeeName = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    // Filter by frequency if specified
    if (query?.frequency) {
      whereClause.frequency = query.frequency;
    }

    // Sorting
    let orderBy: any = { createdAt: 'desc' };
    if (query?.sortBy) {
      const sortField = query.sortBy;
      const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
      orderBy = { [sortField]: sortOrder };
    }

    // Pagination
    const page = parseInt(query?.page) || 1;
    const limit = parseInt(query?.limit) || 10;
    const skip = (page - 1) * limit;

    const [salarySchemes, total] = await Promise.all([
      this.prisma.salaryScheme.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.salaryScheme.count({ where: whereClause }),
    ]);

    return {
      salarySchemes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSalarySchemeById(id: string, tenantId: string) {
    const salaryScheme = await this.prisma.salaryScheme.findFirst({
      where: { id, tenantId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!salaryScheme) {
      throw new NotFoundException('Salary scheme not found');
    }

    return salaryScheme;
  }

  async updateSalaryScheme(id: string, dto: any, tenantId: string) {
    // Check if salary scheme exists and belongs to tenant
    const existingSalaryScheme = await this.prisma.salaryScheme.findFirst({
      where: { id, tenantId },
    });

    if (!existingSalaryScheme) {
      throw new NotFoundException('Salary scheme not found');
    }

    // Validate branch if provided
    let validBranchId: string | null = dto.branchId || existingSalaryScheme.branchId;
    if (dto.branchId) {
      const branchExists = await this.prisma.branch.findUnique({
        where: { id: dto.branchId },
        select: { id: true, tenantId: true },
      });
      if (!branchExists || branchExists.tenantId !== tenantId) {
        console.warn(
          `Invalid branchId ${dto.branchId} for tenant ${tenantId}, keeping existing`,
        );
        validBranchId = existingSalaryScheme.branchId;
      }
    }

    const updatedSalaryScheme = await this.prisma.salaryScheme.update({
      where: { id },
      data: {
        employeeName: dto.employeeName?.trim(),
        salaryAmount: dto.salaryAmount,
        frequency: dto.frequency,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        branchId: validBranchId,
        notes: dto.notes?.trim(),
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return updatedSalaryScheme;
  }

  async deleteSalaryScheme(id: string, tenantId: string) {
    // Check if salary scheme exists and belongs to tenant
    const existingSalaryScheme = await this.prisma.salaryScheme.findFirst({
      where: { id, tenantId },
    });

    if (!existingSalaryScheme) {
      throw new NotFoundException('Salary scheme not found');
    }

    // Soft delete by setting isActive to false
    await this.prisma.salaryScheme.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return { success: true, message: 'Salary scheme deleted successfully' };
  }

  async getSalaryAnalytics(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    // Set default date range if not provided (last 30 days)
    const end = endDate || new Date();
    const start = startDate || new Date();
    start.setDate(start.getDate() - 30);

    // Get all salary schemes in the date range
    const salarySchemes = await this.prisma.salaryScheme.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: start,
          lte: end,
        },
        isActive: true,
      },
    });

    // Calculate analytics
    const totalSalarySchemes = salarySchemes.length;
    const totalSalaryAmount = salarySchemes.reduce(
      (sum, scheme) => sum + scheme.salaryAmount,
      0,
    );
    const avgSalaryAmount =
      totalSalarySchemes > 0 ? totalSalaryAmount / totalSalarySchemes : 0;

    // Salary schemes by frequency
    const salarySchemesByFrequency: Record<string, { count: number; amount: number }> = {};
    salarySchemes.forEach((scheme) => {
      const frequency = scheme.frequency;
      if (!salarySchemesByFrequency[frequency]) {
        salarySchemesByFrequency[frequency] = { count: 0, amount: 0 };
      }
      salarySchemesByFrequency[frequency].count++;
      salarySchemesByFrequency[frequency].amount += scheme.salaryAmount;
    });

    return {
      totalSalarySchemes,
      totalSalaryAmount,
      avgSalaryAmount,
      salarySchemesByFrequency,
    };
  }
}
