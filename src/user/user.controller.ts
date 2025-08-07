import { Controller, Post, Body, Get, Query, UseGuards, Req, Put, Delete, Param, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('edit_users')
  async createUser(@Body() body: any, @Req() req) {
    // Use the current tenant from JWT
    return this.userService.createUser({ ...body, tenantId: req.user.tenantId }, req.user.userId, req.ip);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('view_users')
  async getUsers(@Req() req) {
    // Use the tenantId from the JWT token
    const tenantId = req.user.tenantId;
    console.log(`Fetching users for tenant: ${tenantId}`);
    const users = await this.userService.findAllByTenant(tenantId);
    console.log(`Found ${users.length} users for tenant: ${tenantId}`);
    return users;
  }

  @Get('protected')
  @UseGuards(AuthGuard('jwt'))
  getProtected(@Req() req) {
    return { message: 'You are authenticated!', user: req.user };
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getMe(@Req() req) {
    const user = await this.userService.findByEmail(req.user.email);
    if (!user) throw new NotFoundException('User not found');
    const permissions = await this.userService.getUserPermissions(user.id);
    const userRoles = await this.userService.getUserRoles(user.id);
    return {
      ...user,
      roles: userRoles.map(ur => ur.role.name),
      permissions: permissions.map(p => ({ key: p.permission.key }))
    };
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('edit_users')
  async updateUser(@Req() req, @Param('id') id: string, @Body() body: { name?: string; role?: string }) {
    const tenantId = req.user.tenantId;
    return this.userService.updateUser(id, body, tenantId, req.user.userId, req.ip);
  }

  @Put(':id/permissions')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('edit_users')
  async updatePermissions(@Param('id') id: string, @Body() body: { permissions: { key: string; note?: string }[] }, @Req() req) {
    const tenantId = req.user.tenantId;
    return this.userService.updateUserPermissionsByTenant(id, body.permissions, tenantId, req.user.userId, req.ip);
  }

  @Get(':id/permissions')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('edit_users')
  async getUserPermissions(@Param('id') id: string, @Req() req) {
    const tenantId = req.user.tenantId;
    return this.userService.getUserPermissionsByTenant(id, tenantId);
  }

  @Put('me/preferences')
  @UseGuards(AuthGuard('jwt'))
  async updatePreferences(@Req() req, @Body() body: { notificationPreferences?: any, language?: string, region?: string }) {
    return this.userService.updateUserPreferences(req.user.userId, body);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('edit_users')
  async deleteUser(@Req() req, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.userService.deleteUser(id, tenantId, req.user.userId, req.ip);
  }
} 