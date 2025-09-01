import { Controller, Post, Body, Get, Query, UseGuards, Req, Put, Delete, Param, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('user')
export class UserController {
  @Put(':id/permissions')
  @Permissions('edit_users')
  async updateUserPermissions(@Req() req, @Param('id') id: string, @Body() body: { permissions: string[] }) {
    // Only allow owners to update permissions for users in their tenant
    const actorUser = await this.userService.findById(req.user.userId);
    const isOwner = actorUser && actorUser.userRoles && actorUser.userRoles.some(ur => ur.role.name === 'owner' && ur.tenantId === req.user.tenantId);
    if (!isOwner) throw new ForbiddenException('Only owners can update user permissions');
    // Check target user is in same tenant
    const targetUser = await this.userService.findById(id);
    const sameTenant = targetUser && targetUser.tenantId === req.user.tenantId;
    if (!sameTenant) throw new ForbiddenException('Can only update users in your tenant');
    return this.userService.updateUserPermissions(id, body.permissions, req.user.tenantId, req.user.userId, req.ip);
  }
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
    const users = await this.userService.findAllByTenant(tenantId);
    // For each user, fetch their effective permissions
    const usersWithPermissions = await Promise.all(users.map(async user => {
      const permissions = await this.userService.getEffectivePermissions(user.id, tenantId);
      return {
        ...user,
        permissions: permissions.map(p => p.name)
      };
    }));
    return usersWithPermissions;
  }

  @Get('protected')
  getProtected(@Req() req) {
    return { message: 'You are authenticated!', user: req.user };
  }

@Get('me')
async getMe(@Req() req) {
  const user = await this.userService.findByEmail(req.user.email);
  if (!user) throw new NotFoundException('User not found');
  const permissions = await this.userService.getEffectivePermissions(user.id, req.user.tenantId);

  return {
    ...user,
    id: req.user.id ?? user.id, // Ensure id is present
    tenantId: req.user.tenantId ?? user.tenantId, // Ensure tenantId is present
    permissions: permissions.map(p => p.name)
  };
}

  @Put(':id')
  @Permissions('edit_users')
  async updateUser(@Req() req, @Param('id') id: string, @Body() body: { name?: string; role?: string }) {
    const tenantId = req.user.tenantId;
    return this.userService.updateUser(id, body, tenantId, req.user.userId, req.ip);
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