import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  BadRequestException,
  UseGuards,
  Post,
  Req,
  Delete,
  ForbiddenException,
} from '@nestjs/common';
import { PermissionService } from './permission.service';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { TrialGuard } from '../auth/trial.guard';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
@Controller('roles')
export class RoleController {
  constructor(private readonly permissionService: PermissionService) {}

  @Post()
  @Permissions('edit_roles')
  async createRole(
    @Body() body: { name: string; description?: string; tenantId: string },
  ) {
    if (!body.name) throw new BadRequestException('Role name is required');
    if (!body.tenantId) throw new BadRequestException('Tenant ID is required');
    return this.permissionService.createRole(
      body.name,
      body.description,
      body.tenantId,
    );
  }

  @Get()
  @Permissions('edit_roles')
  async getRoles(@Req() req) {
    const currentUserRole = req.user?.roles?.includes('owner')
      ? 'owner'
      : undefined;
    const tenantId = req.user?.tenantId;
    return this.permissionService.getAllRoles(currentUserRole, tenantId);
  }

  @Put(':id')
  @Permissions('edit_roles')
  async updateRole(
    @Req() req,
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string },
  ) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context required');
    return this.permissionService.updateRole(id, tenantId, body.name, body.description);
  }

  @Delete(':id')
  @Permissions('edit_roles')
  async deleteRole(@Req() req, @Param('id') id: string) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context required');
    return this.permissionService.deleteRole(id, tenantId);
  }

  @Get(':id/permissions')
  @Permissions('edit_roles')
  async getRolePermissions(@Param('id') id: string) {
    return this.permissionService.getRolePermissions(id);
  }

  @Put(':id/permissions')
  @Permissions('edit_roles')
  async updateRolePermissions(
    @Param('id') id: string,
    @Body() body: { permissions: string[] },
  ) {
    if (!Array.isArray(body.permissions))
      throw new BadRequestException('Permissions array required');
    return this.permissionService.updateRolePermissions(id, body.permissions);
  }
}
