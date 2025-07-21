import { Controller, Get, Put, Body, Param, BadRequestException, UseGuards } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('roles')
export class RoleController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get()
  @Permissions('edit_roles')
  async getRoles() {
    return this.permissionService.getAllRoles();
  }

  @Put()
  @Permissions('edit_roles')
  async createRole(@Body() body) {
    if (!body.name) throw new BadRequestException('Role name is required');
    return this.permissionService.createRole(body.name, body.description);
  }

  @Get(':id/permissions')
  @Permissions('edit_roles')
  async getRolePermissions(@Param('id') id: string) {
    return this.permissionService.getRolePermissions(id);
  }

  @Put(':id/permissions')
  @Permissions('edit_roles')
  async updateRolePermissions(@Param('id') id: string, @Body() body) {
    if (!Array.isArray(body.permissions)) throw new BadRequestException('Permissions array required');
    return this.permissionService.updateRolePermissions(id, body.permissions);
  }
} 