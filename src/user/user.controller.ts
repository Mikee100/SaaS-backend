import { Controller, Post, Body, Get, Query, UseGuards, Req, Put, Delete, Param, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Permissions('edit_users')
  async createUser(@Body() body: any, @Req() req) {
    // Use the current tenant from JWT
    return this.userService.createUser({ ...body, tenantId: req.user.tenantId }, req.user.userId, req.ip);
  }

  @Get()
  @Permissions('view_users')
  async getUsers(@Query('tenantId') tenantId: string) {
    return this.userService.findAllByTenant(tenantId);
  }

  @Get('protected')
  getProtected(@Req() req) {
    return { message: 'You are authenticated!', user: req.user };
  }

  @Get('me')
  async getMe(@Req() req) {
    const user = await this.userService.findByEmail(req.user.email);
    if (!user) throw new NotFoundException('User not found');
    const permissions = await this.userService.getUserPermissions(user.id);
    return {
      ...user,
      permissions: permissions.map(p => ({ key: p.permission.key }))
    };
  }

  @Put(':id')
  @Permissions('edit_users')
  async updateUser(@Req() req, @Param('id') id: string, @Body() body: { name?: string; role?: string }) {
    const tenantId = req.user.tenantId;
    return this.userService.updateUser(id, body, tenantId, req.user.userId, req.ip);
  }

  @Put(':id/permissions')
  @Permissions('edit_users')
  async updatePermissions(@Param('id') id: string, @Body() body: { permissions: { key: string; note?: string }[] }, @Req() req) {
    return this.userService.updateUserPermissions(id, body.permissions, req.user.userId, req.ip);
  }

  @Get(':id/permissions')
  @Permissions('edit_users')
  async getUserPermissions(@Param('id') id: string, @Req() req) {
    return this.userService.getUserPermissions(id);
  }

  @Put('me/preferences')
  async updatePreferences(@Req() req, @Body() body: { notificationPreferences?: any, language?: string, region?: string }) {
    return this.userService.updateUserPreferences(req.user.userId, body);
  }

  @Delete(':id')
  @Permissions('edit_users')
  async deleteUser(@Req() req, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.userService.deleteUser(id, tenantId, req.user.userId, req.ip);
  }
} 