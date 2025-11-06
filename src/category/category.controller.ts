import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { CategoryService, CreateCategoryDto, UpdateCategoryDto } from './category.service';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { TrialGuard } from '../auth/trial.guard';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  // @Permissions('view_categories')
  async findAll(@Req() req) {
    const branchId = req.headers['x-branch-id'] || req.user?.branchId;
    const tenantId = req.user?.tenantId || '038fe688-49b2-434f-86dd-ca14378868df';

    return this.categoryService.findAll(tenantId, branchId);
  }

  @Get(':id')
  // @Permissions('view_categories')
  async findOne(@Param('id') id: string, @Req() req) {
    const tenantId = req.user?.tenantId || '038fe688-49b2-434f-86dd-ca14378868df';

    return this.categoryService.findOne(id, tenantId);
  }

  @Post()
  // @Permissions('create_categories')
  // @UseGuards(AuthGuard('jwt'), TrialGuard)
  async create(@Body() body: CreateCategoryDto, @Req() req) {
    const branchId = req.headers['x-branch-id'] || req.user?.branchId;
    const tenantId = req.user?.tenantId || '038fe688-49b2-434f-86dd-ca14378868df';
    const userId = req.user?.userId;

    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    return this.categoryService.create(body, tenantId, branchId, userId);
  }

  @Put(':id')
  // @Permissions('edit_categories')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateCategoryDto,
    @Req() req
  ) {
    const tenantId = req.user?.tenantId || '038fe688-49b2-434f-86dd-ca14378868df';
    const userId = req.user?.userId;

    return this.categoryService.update(id, body, tenantId, userId);
  }

  @Delete(':id')
  // @Permissions('delete_categories')
  async delete(@Param('id') id: string, @Req() req) {
    const tenantId = req.user?.tenantId || '038fe688-49b2-434f-86dd-ca14378868df';
    const userId = req.user?.userId;

    return this.categoryService.delete(id, tenantId, userId);
  }

  @Get(':id/fields')
  // @Permissions('view_categories')
  async getCategoryFields(@Param('id') id: string, @Req() req) {
    const tenantId = req.user?.tenantId || '038fe688-49b2-434f-86dd-ca14378868df';

    return this.categoryService.getCategoryFields(id, tenantId);
  }
}
