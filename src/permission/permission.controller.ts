import { Controller, Get, Post, Body, Param, BadRequestException, UseGuards } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('permissions')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get()
  @Permissions('edit_permissions')
  async getPermissions() {
    return this.permissionService.getAllPermissions();
  }

  @Post()
  @Permissions('edit_permissions')
  async createPermission(@Body() body) {
    if (!body.key) throw new BadRequestException('Permission key is required');
    return this.permissionService.createPermission(body.key, body.description);
  }
} 