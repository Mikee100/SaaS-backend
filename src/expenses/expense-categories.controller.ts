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

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('expense-categories')
export class ExpenseCategoriesController {
  constructor(
    private readonly expenseCategoriesService: ExpenseCategoriesService,
  ) {}

  @Post()
  @Permissions('create_sales')
  async createCategory(@Body() dto: any, @Req() req: any) {
    const { tenantId, userId } = req.user;
    return this.expenseCategoriesService.createCategory(dto, tenantId, userId);
  }

  @Get()
  @Permissions('view_sales')
  async getCategories(@Req() req: any) {
    const { tenantId } = req.user;
    return this.expenseCategoriesService.getCategories(tenantId);
  }

  @Get(':id')
  @Permissions('view_sales')
  async getCategoryById(@Param('id') id: string, @Req() req: any) {
    const { tenantId } = req.user;
    return this.expenseCategoriesService.getCategoryById(id, tenantId);
  }

  @Put(':id')
  @Permissions('create_sales')
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: any,
    @Req() req: any,
  ) {
    const { tenantId, userId } = req.user;
    return this.expenseCategoriesService.updateCategory(
      id,
      dto,
      tenantId,
      userId,
    );
  }

  @Delete(':id')
  @Permissions('create_sales')
  async deleteCategory(@Param('id') id: string, @Req() req: any) {
    const { tenantId, userId } = req.user;
    return this.expenseCategoriesService.deleteCategory(id, tenantId, userId);
  }
}
