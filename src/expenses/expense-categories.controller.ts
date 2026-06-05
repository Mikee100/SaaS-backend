import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ExpenseCategoriesService } from './expense-categories.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { AuthenticatedRequest } from '../auth/request.types';
import { BadRequestException } from '@nestjs/common';

type ExpenseCategoryBody = {
  name?: string;
  description?: string;
  color?: string;
};

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('expense-categories')
export class ExpenseCategoriesController {
  constructor(
    private readonly expenseCategoriesService: ExpenseCategoriesService,
  ) {}

  private getTenantId(req: AuthenticatedRequest): string {
    if (!req.user?.tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    return req.user.tenantId;
  }

  private getUserId(req: AuthenticatedRequest): string {
    if (!req.user?.userId) {
      throw new BadRequestException('User ID is required');
    }
    return req.user.userId;
  }

  @Post()
  @Permissions('create_sales')
  async createCategory(
    @Body() dto: ExpenseCategoryBody,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.expenseCategoriesService.createCategory(
      dto,
      this.getTenantId(req),
      this.getUserId(req),
    );
  }

  @Get()
  @Permissions('view_sales')
  async getCategories(@Req() req: AuthenticatedRequest) {
    return this.expenseCategoriesService.getCategories(this.getTenantId(req));
  }

  @Get(':id')
  @Permissions('view_sales')
  async getCategoryById(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.expenseCategoriesService.getCategoryById(
      id,
      this.getTenantId(req),
    );
  }

  @Put(':id')
  @Permissions('create_sales')
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: ExpenseCategoryBody,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.expenseCategoriesService.updateCategory(
      id,
      dto,
      this.getTenantId(req),
      this.getUserId(req),
    );
  }

  @Delete(':id')
  @Permissions('create_sales')
  async deleteCategory(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.expenseCategoriesService.deleteCategory(
      id,
      this.getTenantId(req),
      this.getUserId(req),
    );
  }
}
