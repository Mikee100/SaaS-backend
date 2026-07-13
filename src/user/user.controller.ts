import {
  Controller,
  Post,
  Body,
  Get,
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
import { PrismaService } from '../prisma.service';
import {
  MODULES_CONFIG_KEY,
  normalizeEnabledModules,
} from '../auth/module-access.constants';
import {
  CRM_ENTITLEMENTS_CONFIG_KEY,
  getDefaultCrmEntitlements,
  normalizeCrmEntitlements,
} from '../auth/crm-entitlements.constants';
import { AuthenticatedRequest } from '../auth/request.types';

interface UserRoleLike {
  tenantId?: string | null;
  role?: { id?: string; name?: string | null } | null;
}

interface UserPermissionLike {
  permission?: string;
}

interface UserListItemLike {
  id: string;
  tenantId?: string | null;
  preferences?: unknown;
  userPermissions?: UserPermissionLike[];
  [key: string]: unknown;
}

type CreateUserBody = {
  email: string;
  password: string;
  name: string;
  role: string;
  branchId?: string;
};

const getActorUserId = (req: AuthenticatedRequest): string | undefined =>
  req.user.userId ?? req.user.sub;

@UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('me')
  async getMe(@Req() req: AuthenticatedRequest) {
    const user = req.user;
    const actorUserId = user.userId ?? user.sub;
    if (!actorUserId) {
      throw new ForbiddenException('Missing authenticated user context');
    }
    const tenantId = user?.tenantId ? String(user.tenantId) : null;
    // Get effective permissions and full user record for preferences
    const [permissions, dbUser] = await Promise.all([
      this.userService.getEffectivePermissions(
        actorUserId,
        tenantId,
      ),
      this.userService.findById(actorUserId, {
        include: undefined,
      }),
    ]);

    const [moduleConfig, crmConfig, tenant] = tenantId
      ? await Promise.all([
          this.prisma.tenantConfiguration.findUnique({
            where: {
              tenantId_key: {
                tenantId,
                key: MODULES_CONFIG_KEY,
              },
            },
            select: { value: true },
          }),
          this.prisma.tenantConfiguration.findUnique({
            where: {
              tenantId_key: {
                tenantId,
                key: CRM_ENTITLEMENTS_CONFIG_KEY,
              },
            },
            select: { value: true },
          }),
          this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { restaurantFeaturesEnabled: true },
          }),
        ])
      : [null, null, null];

    let parsedModules: unknown;
    try {
      parsedModules = moduleConfig?.value
        ? JSON.parse(moduleConfig.value)
        : undefined;
    } catch {
      parsedModules = undefined;
    }
    const enabledModules = normalizeEnabledModules(parsedModules);

    let parsedCrm: unknown;
    try {
      parsedCrm = crmConfig?.value ? JSON.parse(crmConfig.value) : undefined;
    } catch {
      parsedCrm = undefined;
    }
    const crmEntitlements = normalizeCrmEntitlements(
      parsedCrm || getDefaultCrmEntitlements(),
    );

    const prefs = (dbUser?.preferences as Record<string, unknown>) || {};
    return {
      id: actorUserId,
      email: user.email,
      name: user.name,
      roles: user.roles || [],
      permissions: permissions.map((p) => p.name),
      tenantId: user.tenantId,
      branchId: user.branchId,
      isSuperadmin: user.isSuperadmin || false,
      impersonating: user.impersonating ?? false,
      impersonatingAsTenantName: user.impersonatingTenantName ?? null,
      language: dbUser?.language ?? undefined,
      region: dbUser?.region ?? undefined,
      notificationPreferences: dbUser?.notificationPreferences ?? undefined,
      preferences: dbUser?.preferences ?? undefined,
      themePreferences: prefs.themePreferences ?? undefined,
      dashboardPreferences: prefs.dashboardPreferences ?? undefined,
      enabledModules,
      crmEntitlements,
      restaurantFeaturesEnabled: tenant?.restaurantFeaturesEnabled ?? false,
    };
  }

  @Put(':id/permissions')
  @Permissions('edit_users')
  async updateUserPermissions(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { permissions: string[] },
  ) {
    // Only allow owners to update permissions for users in their tenant

    const actorUserId = getActorUserId(req);
    if (!actorUserId || !req.user.tenantId) {
      throw new ForbiddenException('Missing authenticated user context');
    }

    const actorUser = await this.userService.findById(actorUserId);
    const actorRoles = Array.isArray(actorUser?.userRoles)
      ? (actorUser.userRoles as UserRoleLike[])
      : [];
    const isOwner =
      !!actorUser &&
      actorRoles.some(
        (ur) => ur.role?.name === 'owner' && ur.tenantId === req.user.tenantId,
      );
    if (!isOwner)
      throw new ForbiddenException('Only owners can update user permissions');
    // Check target user is in same tenant
    const targetUser = await this.userService.findById(id);
    const sameTenant = targetUser && targetUser.tenantId === req.user.tenantId;
    if (!sameTenant)
      throw new ForbiddenException('Can only update users in your tenant');

    const targetRoles = Array.isArray(targetUser?.userRoles)
      ? (targetUser.userRoles as UserRoleLike[])
      : [];
    const isTenantUser = targetRoles.some(
      (ur) =>
        ur.tenantId === req.user.tenantId &&
        (ur.role?.name?.toLowerCase() === 'owner' ||
          ur.role?.name?.toLowerCase() === 'admin'),
    );
    if (isTenantUser)
      throw new ForbiddenException(
        'This is the tenant and permissions cannot be edited.',
      );

    return this.userService.updateUserPermissions(
      id,
      body.permissions,
      req.user.tenantId,
      actorUserId,
      req.ip,
    );
  }

  @Post()
  @Permissions('edit_users')
  async createUser(
    @Body() body: CreateUserBody,
    @Req() req: AuthenticatedRequest,
  ) {
    const actorUserId = getActorUserId(req);
    if (!req.user.tenantId || !actorUserId) {
      throw new ForbiddenException('Missing authenticated user context');
    }
    // Use the current tenant from JWT
    return this.userService.createUser(
      { ...body, tenantId: req.user.tenantId },
      actorUserId,
      req.ip,
    );
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async getUsers(@Req() req: AuthenticatedRequest) {
    const isSuperadmin = req.user.isSuperadmin === true;
    const tenantId = req.user.tenantId;
    const normalizePermissions = async (users: UserListItemLike[]) =>
      Promise.all(
        users.map(async (u) => {
          const directPermissions = Array.isArray(u.userPermissions)
            ? u.userPermissions
                .map((up) => up?.permission)
                .filter(
                  (perm: unknown): perm is string =>
                    typeof perm === 'string' && perm.length > 0,
                )
            : [];

          const effectivePermissions = (
            await this.userService.getEffectivePermissions(
              u.id,
              u.tenantId || tenantId || undefined,
            )
          )
            .map((p) => p.name)
            .filter(
              (perm): perm is string =>
                typeof perm === 'string' && perm.length > 0,
            );

          const inheritedPermissions = effectivePermissions.filter(
            (perm) => !directPermissions.includes(perm),
          );

          const rawPreferences =
            u?.preferences &&
            typeof u.preferences === 'object' &&
            !Array.isArray(u.preferences)
              ? { ...(u.preferences as Record<string, unknown>) }
              : undefined;
          const hasPosPin = Boolean(
            rawPreferences &&
              typeof rawPreferences.posPinHash === 'string' &&
              rawPreferences.posPinHash.length > 0,
          );
          if (rawPreferences && 'posPinHash' in rawPreferences) {
            delete rawPreferences.posPinHash;
          }

          return {
            ...u,
            preferences: rawPreferences,
            hasPosPin,
            permissions: directPermissions,
            effectivePermissions,
            inheritedPermissions,
          };
        }),
      );

    if (isSuperadmin) {
      // Return all users for superadmin
      const users = await this.userService.findAll();
      return await normalizePermissions(users as UserListItemLike[]);
    }
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required');
    }
    // Return users for tenant
    const users = await this.userService.findAllByTenant(tenantId);
    return await normalizePermissions(users as UserListItemLike[]);
  }

  @Get('protected')
  getProtected(@Req() req: AuthenticatedRequest) {
    return { message: 'You are authenticated!', user: req.user };
  }

  @Put(':id')
  @Permissions('edit_users')
  async updateUser(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      role?: string;
      branchId?: string | null;
      auditNote?: string;
    },
  ) {
    const tenantId = req.user.tenantId;
    const actorUserId = getActorUserId(req);
    if (!tenantId || !actorUserId) {
      throw new ForbiddenException('Missing authenticated user context');
    }
    return this.userService.updateUser(id, body, tenantId, actorUserId, req.ip);
  }

  @Put('me/preferences')
  async updatePreferences(
    @Req() req: AuthenticatedRequest,
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
    const userId = getActorUserId(req);
    if (!userId) throw new NotFoundException('User not found');
    return this.userService.updateUserPreferences(userId, body);
  }

  @Put('me/password')
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    const userId = getActorUserId(req);
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
    @Req() req: AuthenticatedRequest,
    @Body()
    body: { subject: string; message: string; isUrgent?: boolean },
  ) {
    const userId = getActorUserId(req);
    if (!userId) throw new NotFoundException('User not found');
    const { subject, message, isUrgent = false } = body;
    if (!subject?.trim() || !message?.trim()) {
      throw new BadRequestException('Subject and message are required.');
    }
    return this.userService.contactAdmin(
      userId,
      req.user.tenantId ?? null,
      subject.trim(),
      message.trim(),
      Boolean(isUrgent),
    );
  }

  @Delete(':id')
  @Permissions('edit_users')
  async deleteUser(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<unknown> {
    const actorUserId = getActorUserId(req);
    const tenantId = req.user.tenantId;
    if (!tenantId || !actorUserId) {
      throw new ForbiddenException('Missing authenticated user context');
    }
    return this.userService.deleteUser(id, tenantId, actorUserId, req.ip);
  }

  @Put(':id/pos-pin')
  @Permissions('edit_users')
  async setUserPosPin(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { pin: string },
  ) {
    const actorUserId = getActorUserId(req);
    const tenantId = req.user.tenantId;
    if (!tenantId || !actorUserId) {
      throw new ForbiddenException('Missing authenticated user context');
    }
    return this.userService.setUserPosPin(
      id,
      tenantId,
      body.pin,
      actorUserId,
      req.ip,
    );
  }

  @Post('verify-pos-pin')
  async verifyUserPosPin(
    @Req() req: AuthenticatedRequest,
    @Body() body: { userId: string; pin: string; requireManagerRole?: boolean },
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required');
    }
    return this.userService.verifyUserPosPin(
      body.userId,
      tenantId,
      body.pin,
      !!body.requireManagerRole,
    );
  }

  @Get('me/plan-limits')
  async getPlanLimits(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required');
    }

    const result = await this.userService.getPlanLimits(tenantId);

    return result;
  }
}
