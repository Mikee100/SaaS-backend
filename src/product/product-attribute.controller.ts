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
import {
  CreateProductAttributeDto,
  UpdateProductAttributeDto,
  AddAttributeValueDto,
} from './dto/product-attribute.dto';

@Controller('product-attributes')
export class ProductAttributeController {
  constructor(
    private readonly attributeService: ProductAttributeService,
  ) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @Permissions('view_products')
  async findAll(
    @Req() req,
    @Query('includeValues') includeValues?: string,
  ) {
    if (!req.user || !req.user.tenantId) {
      throw new BadRequestException(
        'User context is missing or invalid. Authentication required.',
      );
    }
    return this.attributeService.findAll(
      req.user.tenantId,
      includeValues === 'true',
    );
  }

  @Get('common')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('view_products')
  async getOrCreateCommon(@Req() req) {
    if (!req.user || !req.user.tenantId) {
      throw new BadRequestException(
        'User context is missing or invalid. Authentication required.',
      );
    }
    return this.attributeService.getOrCreateCommonAttributes(
      req.user.tenantId,
    );
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('view_products')
  async findOne(@Param('id') id: string, @Req() req) {
    if (!req.user || !req.user.tenantId) {
      throw new BadRequestException(
        'User context is missing or invalid. Authentication required.',
      );
    }
    return this.attributeService.findOne(id, req.user.tenantId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @Permissions('create_products')
  async create(
    @Body() dto: CreateProductAttributeDto,
    @Req() req,
  ) {
    if (!req.user || !req.user.tenantId) {
      throw new BadRequestException(
        'User context is missing or invalid. Authentication required.',
      );
    }
    return this.attributeService.create(req.user.tenantId, dto);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('edit_products')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductAttributeDto,
    @Req() req,
  ) {
    if (!req.user || !req.user.tenantId) {
      throw new BadRequestException(
        'User context is missing or invalid. Authentication required.',
      );
    }
    return this.attributeService.update(id, req.user.tenantId, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('delete_products')
  async delete(@Param('id') id: string, @Req() req) {
    if (!req.user || !req.user.tenantId) {
      throw new BadRequestException(
        'User context is missing or invalid. Authentication required.',
      );
    }
    return this.attributeService.delete(id, req.user.tenantId);
  }

  @Post(':id/values')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('create_products')
  async addValue(
    @Param('id') id: string,
    @Body() dto: AddAttributeValueDto,
    @Req() req,
  ) {
    if (!req.user || !req.user.tenantId) {
      throw new BadRequestException(
        'User context is missing or invalid. Authentication required.',
      );
    }
    return this.attributeService.addValue(id, req.user.tenantId, dto);
  }

  @Put('values/:valueId')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('edit_products')
  async updateValue(
    @Param('valueId') valueId: string,
    @Body() dto: Partial<AddAttributeValueDto>,
    @Req() req,
  ) {
    if (!req.user || !req.user.tenantId) {
      throw new BadRequestException(
        'User context is missing or invalid. Authentication required.',
      );
    }
    return this.attributeService.updateValue(valueId, req.user.tenantId, dto);
  }

  @Delete('values/:valueId')
  @UseGuards(AuthGuard('jwt'))
  @Permissions('delete_products')
  async deleteValue(@Param('valueId') valueId: string, @Req() req) {
    if (!req.user || !req.user.tenantId) {
      throw new BadRequestException(
        'User context is missing or invalid. Authentication required.',
      );
    }
    return this.attributeService.deleteValue(valueId, req.user.tenantId);
  }
}
