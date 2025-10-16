import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UseGuards,
  Req,
  Put,
  Delete,
  Param,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { TrialGuard } from '../auth/trial.guard';

@UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  async getMe(@Req() req) {
    const user = req.user;
    // Get effective permissions for the user
    const permissions = await this.userService.getEffectivePermissions(
      user.userId || user.sub,
      user.tenantId,
    );

    // Return only the fields your frontend expects
    return {
      id: user.userId || user.sub,
      email: user.email,
      name: user.name,
      roles: user.roles || [],
      permissions: permissions.map((p) => p.name), // Convert to array of permission names
      tenantId: user.tenantId,
      branchId: user.branchId,
      isSuperadmin: user.isSuperadmin || false,
    };
  }

  @Put(':id/permissions')
  @Permissions('edit_users')
  async updateUserPermissions(
    @Req() req,
    @Param('id') id: string,
    @Body() body: { permissions: string[] },
  ) {
    // Only allow owners to update permissions for users in their tenant

    const actorUser = await this.userService.findById(req.user.userId);
    const isOwner =
      actorUser &&
      actorUser.userRoles &&
      actorUser.userRoles.some(
        (ur) => ur.role.name === 'owner' && ur.tenantId === req.user.tenantId,
      );
    if (!isOwner)
      throw new ForbiddenException('Only owners can update user permissions');
    // Check target user is in same tenant
    const targetUser = await this.userService.findById(id);
    const sameTenant = targetUser && targetUser.tenantId === req.user.tenantId;
    if (!sameTenant)
      throw new ForbiddenException('Can only update users in your tenant');
    return this.userService.updateUserPermissions(
      id,
      body.permissions,
      req.user.tenantId,
      req.user.userId,
      req.ip,
    );
  }

  @Post()
  @Permissions('edit_users')
  async createUser(@Body() body: any, @Req() req) {
    // Use the current tenant from JWT
    return this.userService.createUser(
      { ...body, tenantId: req.user.tenantId },
      req.user.userId,
      req.ip,
    );
  }

  @Get()
  @Permissions('view_users')
  async getUsers(@Req() req, @Query('branchId') branchId?: string) {
    // Defensive check for req.user and tenantId
    if (!req.user || !req.user.tenantId) {
      throw new ForbiddenException('Missing or invalid authentication');
    }
    const tenantId = req.user.tenantId;

    try {
      const users = branchId
        ? await this.userService.findByTenantAndBranch(tenantId, branchId)
        : await this.userService.findAllByTenant(tenantId);

      const usersWithPermissions = await Promise.all(
        users.map(async (user) => {
          const permissions = await this.userService.getEffectivePermissions(
            user.id,
            tenantId,
          );
          return {
            ...user,
            permissions: permissions.map((p) => p.name),
          };
        }),
      );

      return usersWithPermissions;
    } catch (err) {
      console.error('Error in getUsers:', err);
      throw new Error('Failed to fetch users: ' + err.message);
    }
  }

  @Get('protected')
  getProtected(@Req() req) {
    return { message: 'You are authenticated!', user: req.user };
  }

  @Put(':id')
  @Permissions('edit_users')
  async updateUser(
    @Req() req,
    @Param('id') id: string,
    @Body() body: { name?: string; role?: string },
  ) {
    const tenantId = req.user.tenantId;
    return this.userService.updateUser(
      id,
      body,
      tenantId,
      req.user.userId,
      req.ip,
    );
  }

  @Put('me/preferences')
  async updatePreferences(
    @Req() req,
    @Body()
    body: { notificationPreferences?: any; language?: string; region?: string },
  ) {
    return this.userService.updateUserPreferences(req.user.userId, body);
  }

  @Put('me/password')
  async changePassword(
    @Req() req,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    const { currentPassword, newPassword } = body;
    return this.userService.changePassword(req.user.userId, currentPassword, newPassword);
  }

  @Delete(':id')
  @Permissions('edit_users')
  async deleteUser(@Req() req, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.userService.deleteUser(id, tenantId, req.user.userId, req.ip);
  }

  @Get('me/plan-limits')
  async getPlanLimits(@Req() req) {
    const tenantId = req.user.tenantId;
    console.log('UserController.getPlanLimits called for tenantId:', tenantId);
    const result = await this.userService.getPlanLimits(tenantId);
    console.log('UserController.getPlanLimits result:', result);
    return result;
  }
}
