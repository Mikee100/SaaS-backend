import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Req,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ProductAttributeService } from './product-attribute.service';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/permissions.decorator';
import { AuthenticatedRequest } from '../auth/request.types';
import {
  CreateProductAttributeDto,
  UpdateProductAttributeDto,
  AddAttributeValueDto,
} from './dto/product-attribute.dto';

@Controller('product-attributes')
export class ProductAttributeController {
  constructor(private readonly attributeService: ProductAttributeService) {}

  private getTenantId(req: AuthenticatedRequest): string {
    if (!req.user?.tenantId) {
      throw new BadRequestException(
        'User context is missing or invalid. Authentication required.',
      );
    }
    return req.user.tenantId;
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @Permissions('view_products')
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query('includeValues') includeValues?: string,
  ) {
    const tenantId = this.getTenantId(req);
    return this.attributeService.findAll(tenantId, includeValues === 'true');
  }

  @Get('common')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('view_products')
  async getOrCreateCommon(@Req() req: AuthenticatedRequest) {
    const tenantId = this.getTenantId(req);
    return this.attributeService.getOrCreateCommonAttributes(tenantId);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('view_products')
  async findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const tenantId = this.getTenantId(req);
    return this.attributeService.findOne(id, tenantId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @Permissions('create_products')
  async create(
    @Body() dto: CreateProductAttributeDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    return this.attributeService.create(tenantId, dto);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('edit_products')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductAttributeDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    return this.attributeService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('delete_products')
  async delete(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const tenantId = this.getTenantId(req);
    return this.attributeService.delete(id, tenantId);
  }

  @Post(':id/values')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('create_products')
  async addValue(
    @Param('id') id: string,
    @Body() dto: AddAttributeValueDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    return this.attributeService.addValue(id, tenantId, dto);
  }

  @Put('values/:valueId')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('edit_products')
  async updateValue(
    @Param('valueId') valueId: string,
    @Body() dto: Partial<AddAttributeValueDto>,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    return this.attributeService.updateValue(valueId, tenantId, dto);
  }

  @Delete('values/:valueId')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('delete_products')
  async deleteValue(
    @Param('valueId') valueId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    return this.attributeService.deleteValue(valueId, tenantId);
  }
}
