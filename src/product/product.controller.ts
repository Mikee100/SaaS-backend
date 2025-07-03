import { Controller, Get, Post, Put, Delete, Param, Body, Req, UseGuards } from '@nestjs/common';
import { ProductService } from './product.service';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  async findAll(@Req() req) {
    // Assuming req.user.tenantId is set by your JWT strategy
    return this.productService.findAllByTenant(req.user.tenantId);
  }

  @Post()
  async create(@Body() body, @Req() req) {
    // Attach tenantId from the authenticated user
    return this.productService.createProduct({
      ...body,
      tenantId: req.user.tenantId,
    });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body, @Req() req) {
    return this.productService.updateProduct(id, body, req.user.tenantId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req) {
    return this.productService.deleteProduct(id, req.user.tenantId);
  }
}
