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
  BadRequestException,
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
    // Get effective permissions and full user record for preferences
    const [permissions, dbUser] = await Promise.all([
      this.userService.getEffectivePermissions(
        user.userId || user.sub,
        user.tenantId,
      ),
      this.userService.findById(user.userId || user.sub, { include: undefined }),
    ]);

    const prefs = (dbUser?.preferences as Record<string, unknown>) || {};
    return {
      id: user.userId || user.sub,
      email: user.email,
      name: user.name,
      roles: user.roles || [],
      permissions: permissions.map((p) => p.name),
      tenantId: user.tenantId,
      branchId: user.branchId,
      isSuperadmin: user.isSuperadmin || false,
      language: dbUser?.language ?? undefined,
      region: dbUser?.region ?? undefined,
      notificationPreferences: dbUser?.notificationPreferences ?? undefined,
      preferences: dbUser?.preferences ?? undefined,
      themePreferences: prefs.themePreferences ?? undefined,
      dashboardPreferences: prefs.dashboardPreferences ?? undefined,
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
        (ur: any) => ur.role?.name === 'owner' && ur.tenantId === req.user.tenantId,
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
  @UseGuards(AuthGuard('jwt'))
  async getUsers(@Req() req: any) {
    const isSuperadmin = req.user.isSuperadmin;
    let tenantId = req.user.tenantId;
    if (isSuperadmin) {
      // Return all users for superadmin
      return await this.userService.findAll();
    }
    // Return users for tenant
    return await this.userService.findAllByTenant(tenantId);
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
    body: {
      notificationPreferences?: any;
      language?: string;
      region?: string;
      branchId?: string;
      preferences?: Record<string, unknown>;
      themePreferences?: Record<string, unknown>;
      dashboardPreferences?: Record<string, unknown>;
    },
  ) {
    const userId = req.user?.userId ?? req.user?.sub;
    if (!userId) throw new NotFoundException('User not found');
    return this.userService.updateUserPreferences(userId, body);
  }

  @Put('me/password')
  async changePassword(
    @Req() req,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    const userId = req.user?.userId ?? req.user?.sub;
    if (!userId) throw new NotFoundException('User not found');
    const { currentPassword, newPassword } = body;
    return this.userService.changePassword(
      userId,
      currentPassword,
      newPassword,
    );
  }

  @Post('me/contact-admin')
  async contactAdmin(
    @Req() req,
    @Body()
    body: { subject: string; message: string; isUrgent?: boolean },
  ) {
    const userId = req.user?.userId ?? req.user?.sub;
    if (!userId) throw new NotFoundException('User not found');
    const { subject, message, isUrgent = false } = body;
    if (!subject?.trim() || !message?.trim()) {
      throw new BadRequestException('Subject and message are required.');
    }
    return this.userService.contactAdmin(
      userId,
      req.user?.tenantId ?? null,
      subject.trim(),
      message.trim(),
      Boolean(isUrgent),
    );
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

    const result = await this.userService.getPlanLimits(tenantId);

    return result;
  }
}
