import { Controller, Get, Post, Body } from '@nestjs/common';
import { TenantService } from './tenant.service';

@Controller('tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  async createTenant(@Body() body: { name: string; businessType: string; contactEmail: string; contactPhone?: string }) {
    return this.tenantService.createTenant(body);
  }

  @Get()
  async getAllTenants() {
    return this.tenantService.getAllTenants();
  }
}
