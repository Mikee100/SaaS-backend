import {
  Controller,
  BadRequestException,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Logger,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request as ExpressRequest } from 'express';
import { AdminService } from './admin.service';
import { SuperadminGuard } from './superadmin.guard';
import { SubscriptionService } from '../billing/subscription.service';
import { TrialGuard } from '../auth/trial.guard';
import { AuditLogService } from '../audit-log.service';
import { AuthService } from '../auth/auth.services';
import { TenantConfigurationService } from '../config/tenant-configuration.service';
import { PrismaService } from '../prisma.service';
import {
  AVAILABLE_MODULES,
  DEFAULT_ENABLED_MODULES,
  getModulePreset,
  MODULES_CONFIG_KEY,
  MODULE_PRESETS,
  normalizeEnabledModules,
} from '../auth/module-access.constants';
import {
  CRM_CAPABILITIES,
  CRM_ENTITLEMENTS_CONFIG_KEY,
  CRM_PACKAGES,
  CrmAllowedProviders,
  CrmEntitlements,
  CrmLimits,
  getDefaultCrmEntitlements,
  getCrmPackageTemplate,
  normalizeCrmAllowedProviders,
  normalizeCrmCapabilities,
  normalizeCrmEntitlements,
  normalizeCrmLimits,
  normalizeCrmPackageKey,
  validateCrmCapabilityDependencies,
} from '../auth/crm-entitlements.constants';

interface UpdateCrmEntitlementsDto {
  packageKey?: string;
  enabledCapabilities?: string[];
  limits?: Partial<CrmLimits>;
  allowedProviders?: Partial<CrmAllowedProviders>;
  source?: string;
  reason?: string;
  effectiveFrom?: string;
  effectiveTo?: string | null;
}

interface CreateTenantDto {
  name: string;
  businessType: string;
  contactEmail: string;
  contactPhone?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPassword?: string;
  modulePresetKey?: string;
  crmEntitlements?: Partial<UpdateCrmEntitlementsDto>;
  crmPackageKey?: string;
  [key: string]: any;
}

type UpdateTenantBusinessDto = Partial<{
  name: string;
  businessType: string;
  contactEmail: string;
  contactPhone: string | null;
  address: string | null;
  country: string | null;
  kraEnabled: boolean;
  kraPin: string | null;
  vatNumber: string | null;
  etimsQrUrl: string | null;
  restaurantFeaturesEnabled: boolean;
}>;

type CreatePlanDto = {
  name: string;
  description: string;
  price: number;
  interval: string;
  maxUsers?: number;
  maxProducts?: number;
  maxSalesPerMonth?: number;
  maxBranches?: number;
  isActive?: boolean;
  stripePriceId?: string;
  featureIds: string[];
};

type UpdatePlanDto = Partial<CreatePlanDto>;

const MODULE_PERMISSION_REQUIREMENTS: Array<{
  module: (typeof AVAILABLE_MODULES)[number];
  requiredPermissions: string[];
}> = [
  { module: 'dashboard', requiredPermissions: [] },
  { module: 'payroll', requiredPermissions: ['view_sales'] },
  { module: 'sales', requiredPermissions: ['view_sales'] },
  { module: 'credits', requiredPermissions: ['view_users'] },
  {
    module: 'inventory',
    requiredPermissions: ['view_products', 'view_inventory'],
  },
  { module: 'accounts', requiredPermissions: [] },
  { module: 'analytics', requiredPermissions: ['view_analytics'] },
  { module: 'reports', requiredPermissions: ['view_reports'] },
  { module: 'expenses', requiredPermissions: ['view_users'] },
  { module: 'crm', requiredPermissions: ['view_sales'] },
  { module: 'ai', requiredPermissions: [] },
  { module: 'settings', requiredPermissions: [] },
  { module: 'billing', requiredPermissions: [] },
];

@Controller('admin')
@UseGuards(AuthGuard('jwt'), SuperadminGuard, TrialGuard)
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly adminService: AdminService,
    private readonly subscriptionService: SubscriptionService,
    private readonly auditLogService: AuditLogService,
    private readonly authService: AuthService,
    private readonly tenantConfigurationService: TenantConfigurationService,
    private readonly prisma: PrismaService,
  ) {}

  private asObject(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : null;
  }

  private asString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private getActorUserId(req: ExpressRequest): string | null {
    const user = this.asObject(
      (req as ExpressRequest & { user?: unknown }).user,
    );
    return this.asString(user?.userId) || this.asString(user?.sub) || null;
  }

  private getRequestIp(req: ExpressRequest): string | undefined {
    return typeof req.ip === 'string' ? req.ip : undefined;
  }

  @Get('stats')
  async getPlatformStats() {
    this.logger.log('AdminController: getPlatformStats called');
    return this.adminService.getPlatformStats();
  }

  @Get('stats/revenue-history')
  async getRevenueHistory(@Query('months') months?: string) {
    this.logger.log('AdminController: getRevenueHistory called');
    const monthsNum = months ? Number(months) : 12;
    return this.adminService.getRevenueHistory(monthsNum);
  }

  @Get('stats/tenant-growth')
  async getTenantGrowth(@Query('months') months?: string) {
    this.logger.log('AdminController: getTenantGrowth called');
    const monthsNum = months ? Number(months) : 12;
    return this.adminService.getTenantGrowth(monthsNum);
  }

  @Get('billing/metrics')
  async getBillingMetrics() {
    this.logger.log('AdminController: getBillingMetrics called');
    return this.adminService.getBillingMetrics();
  }

  @Get('billing/subscriptions')
  async getAllSubscriptions() {
    this.logger.log('AdminController: getAllSubscriptions called');
    return this.adminService.getAllSubscriptions();
  }

  @Get('tenants')
  async getAllTenants() {
    this.logger.log('AdminController: getAllTenants called');
    const result = await this.adminService.getAllTenants();
    this.logger.log(
      `AdminController: getAllTenants returning ${result.length} tenants`,
    );
    return result;
  }

  @Get('tenants/deleted')
  async getDeletedTenants() {
    return this.adminService.getDeletedTenants();
  }

  // Specific routes must be defined BEFORE parameterized routes
  @Get('tenants/space-usage')
  async getTenantsSpaceUsage() {
    this.logger.log('AdminController: getTenantsSpaceUsage called');
    return this.adminService.getTenantsSpaceUsage();
  }

  @Get('tenants/analytics')
  async getTenantsAnalytics() {
    this.logger.log('AdminController: getTenantsAnalytics called');
    const stats = await this.adminService.getTenantsSpaceUsage();
    return stats;
  }

  @Get('tenants/:id')
  async getTenantById(@Param('id') tenantId: string) {
    this.logger.log(
      `AdminController: getTenantById called with tenantId: ${tenantId}`,
    );
    return this.adminService.getTenantById(tenantId);
  }

  @Put('tenants/:id')
  async updateTenant(
    @Param('id') tenantId: string,
    @Body() body: Record<string, unknown>,
  ) {
    this.logger.log(
      `AdminController: updateTenant called with tenantId: ${tenantId}`,
    );
    return this.adminService.updateTenantBusiness(
      tenantId,
      body as UpdateTenantBusinessDto,
    );
  }

  @Get('tenants/:id/products')
  async getTenantProducts(@Param('id') tenantId: string) {
    this.logger.log(
      `AdminController: getTenantProducts called with tenantId: ${tenantId}`,
    );
    return this.adminService.getTenantProducts(tenantId);
  }

  @Get('tenants/:id/transactions')
  async getTenantTransactions(@Param('id') tenantId: string) {
    this.logger.log(
      `AdminController: getTenantTransactions called with tenantId: ${tenantId}`,
    );
    return this.adminService.getTenantTransactions(tenantId);
  }

  @Get('tenants/:id/branches')
  async getTenantBranches(@Param('id') tenantId: string) {
    this.logger.log(
      `AdminController: getTenantBranches called with tenantId: ${tenantId}`,
    );
    return this.adminService.getTenantBranches(tenantId);
  }

  @Get('tenants/:id/modules')
  async getTenantModules(@Param('id') tenantId: string) {
    const configured =
      await this.tenantConfigurationService.getTenantConfiguration(
        tenantId,
        MODULES_CONFIG_KEY,
      );

    let parsed: unknown;
    try {
      parsed = configured ? JSON.parse(configured) : undefined;
    } catch {
      parsed = undefined;
    }

    const enabledModules = normalizeEnabledModules(parsed);
    return {
      tenantId,
      key: MODULES_CONFIG_KEY,
      enabledModules,
      availableModules: AVAILABLE_MODULES,
      defaultEnabledModules: DEFAULT_ENABLED_MODULES,
    };
  }

  @Get('module-presets')
  getModulePresets() {
    return {
      presets: MODULE_PRESETS,
    };
  }

  @Put('tenants/:id/modules')
  async updateTenantModules(
    @Param('id') tenantId: string,
    @Body() body: { enabledModules?: string[] },
    @Req() req: ExpressRequest,
  ) {
    const configured =
      await this.tenantConfigurationService.getTenantConfiguration(
        tenantId,
        MODULES_CONFIG_KEY,
      );
    let previousParsed: unknown;
    try {
      previousParsed = configured ? JSON.parse(configured) : undefined;
    } catch {
      previousParsed = undefined;
    }
    const previousModules = normalizeEnabledModules(previousParsed);
    const enabledModules = normalizeEnabledModules(body?.enabledModules || []);

    await this.tenantConfigurationService.setTenantConfiguration(
      tenantId,
      MODULES_CONFIG_KEY,
      JSON.stringify(enabledModules),
      {
        description: 'Tenant module entitlements (platform admin)',
        category: 'general',
        isEncrypted: false,
        isPublic: false,
      },
    );

    const actorUserId = this.getActorUserId(req);
    await this.auditLogService.log(
      actorUserId,
      'platform_tenant_modules_updated',
      {
        tenantId,
        previousModules,
        enabledModules,
      },
      this.getRequestIp(req),
    );

    return {
      message: 'Tenant module entitlements updated successfully',
      tenantId,
      enabledModules,
      availableModules: AVAILABLE_MODULES,
    };
  }

  @Put('tenants/:id/modules/preset')
  async applyTenantModulePreset(
    @Param('id') tenantId: string,
    @Body() body: { presetKey?: string },
    @Req() req: ExpressRequest,
  ) {
    const preset = getModulePreset(body?.presetKey);
    if (!preset) {
      throw new BadRequestException('Invalid module preset key');
    }

    const configured =
      await this.tenantConfigurationService.getTenantConfiguration(
        tenantId,
        MODULES_CONFIG_KEY,
      );
    let previousParsed: unknown;
    try {
      previousParsed = configured ? JSON.parse(configured) : undefined;
    } catch {
      previousParsed = undefined;
    }
    const previousModules = normalizeEnabledModules(previousParsed);
    const enabledModules = normalizeEnabledModules(preset.enabledModules);

    await this.tenantConfigurationService.setTenantConfiguration(
      tenantId,
      MODULES_CONFIG_KEY,
      JSON.stringify(enabledModules),
      {
        description: 'Tenant module entitlements (platform admin preset)',
        category: 'general',
        isEncrypted: false,
        isPublic: false,
      },
    );

    const actorUserId = this.getActorUserId(req);
    await this.auditLogService.log(
      actorUserId,
      'platform_tenant_module_preset_applied',
      {
        tenantId,
        presetKey: preset.key,
        previousModules,
        enabledModules,
      },
      this.getRequestIp(req),
    );

    return {
      message: 'Tenant module preset applied successfully',
      tenantId,
      preset,
      enabledModules,
      availableModules: AVAILABLE_MODULES,
    };
  }

  @Get('tenants/:id/module-permission-matrix')
  async getTenantModulePermissionMatrix(@Param('id') tenantId: string) {
    const configured =
      await this.tenantConfigurationService.getTenantConfiguration(
        tenantId,
        MODULES_CONFIG_KEY,
      );

    let parsed: unknown;
    try {
      parsed = configured ? JSON.parse(configured) : undefined;
    } catch {
      parsed = undefined;
    }

    const enabledModules = normalizeEnabledModules(parsed);

    const userRoles = await this.prisma.userRole.findMany({
      where: { tenantId },
      include: {
        role: {
          select: {
            name: true,
            permissions: {
              select: {
                permission: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    });

    const rolePermissions = new Map<string, Set<string>>();
    for (const userRole of userRoles) {
      const roleName = String(userRole.role?.name || '')
        .toLowerCase()
        .trim();
      if (!roleName) continue;

      if (!rolePermissions.has(roleName)) {
        rolePermissions.set(roleName, new Set<string>());
      }

      const permissions = userRole.role?.permissions || [];
      for (const entry of permissions) {
        const permissionName = String(entry.permission?.name || '').trim();
        if (permissionName) {
          rolePermissions.get(roleName)?.add(permissionName);
        }
      }
    }

    const roles = Array.from(rolePermissions.keys()).sort((a, b) =>
      a.localeCompare(b),
    );

    const matrix = MODULE_PERMISSION_REQUIREMENTS.map((entry) => {
      const roleChecks = roles.map((roleName) => {
        const required = entry.requiredPermissions;
        const roleHasBypass = roleName === 'owner' || roleName === 'admin';
        const granted = rolePermissions.get(roleName) || new Set<string>();
        const missing = roleHasBypass
          ? []
          : required.filter((permission) => !granted.has(permission));

        return {
          roleName,
          allowed: missing.length === 0,
          missing,
        };
      });

      return {
        module: entry.module,
        enabled: enabledModules.includes(entry.module),
        requiredPermissions: entry.requiredPermissions,
        roleChecks,
      };
    });

    return {
      tenantId,
      enabledModules,
      roles,
      matrix,
    };
  }

  @Get('tenants/:id/crm-entitlements')
  async getTenantCrmEntitlements(@Param('id') tenantId: string) {
    const configured =
      await this.tenantConfigurationService.getTenantConfiguration(
        tenantId,
        CRM_ENTITLEMENTS_CONFIG_KEY,
      );

    let parsed: unknown;
    try {
      parsed = configured ? JSON.parse(configured) : undefined;
    } catch {
      parsed = undefined;
    }

    const entitlements = normalizeCrmEntitlements(
      parsed || getDefaultCrmEntitlements(),
    );

    return {
      tenantId,
      key: CRM_ENTITLEMENTS_CONFIG_KEY,
      entitlements,
      availablePackages: CRM_PACKAGES,
      availableCapabilities: CRM_CAPABILITIES,
    };
  }

  @Put('tenants/:id/crm-entitlements')
  async updateTenantCrmEntitlements(
    @Param('id') tenantId: string,
    @Body() body: UpdateCrmEntitlementsDto,
    @Req() req: ExpressRequest,
  ) {
    const configured =
      await this.tenantConfigurationService.getTenantConfiguration(
        tenantId,
        CRM_ENTITLEMENTS_CONFIG_KEY,
      );

    let previousParsed: unknown;
    try {
      previousParsed = configured ? JSON.parse(configured) : undefined;
    } catch {
      previousParsed = undefined;
    }

    const previous = normalizeCrmEntitlements(
      previousParsed || getDefaultCrmEntitlements(),
    );
    const base = body?.packageKey
      ? getCrmPackageTemplate(normalizeCrmPackageKey(body.packageKey))
      : previous;

    const nextCapabilitiesRaw = body?.enabledCapabilities
      ? normalizeCrmCapabilities(body.enabledCapabilities)
      : base.enabledCapabilities;
    const nextCapabilities =
      nextCapabilitiesRaw.length > 0
        ? nextCapabilitiesRaw
        : base.enabledCapabilities;

    const dependencyErrors =
      validateCrmCapabilityDependencies(nextCapabilities);
    if (dependencyErrors.length > 0) {
      throw new BadRequestException({
        message: 'Invalid CRM capability combination',
        errors: dependencyErrors,
      });
    }

    const next: CrmEntitlements = {
      packageKey: base.packageKey,
      enabledCapabilities: nextCapabilities,
      limits: normalizeCrmLimits(body?.limits, base.limits),
      allowedProviders: normalizeCrmAllowedProviders(
        body?.allowedProviders,
        base.allowedProviders,
      ),
    };

    await this.tenantConfigurationService.setTenantConfiguration(
      tenantId,
      CRM_ENTITLEMENTS_CONFIG_KEY,
      JSON.stringify(next),
      {
        description: 'Tenant CRM entitlements (platform admin)',
        category: 'general',
        isEncrypted: false,
        isPublic: false,
      },
    );

    const actorUserId = this.getActorUserId(req);
    await this.auditLogService.log(
      actorUserId,
      'platform_tenant_crm_entitlements_updated',
      {
        actorUserId,
        tenantId,
        source: body?.source || 'manual_override',
        reason: body?.reason || 'superadmin update',
        effectiveFrom: body?.effectiveFrom || new Date().toISOString(),
        effectiveTo: body?.effectiveTo ?? null,
        previous,
        next,
      },
      this.getRequestIp(req),
    );

    return {
      message: 'Tenant CRM entitlements updated successfully',
      tenantId,
      key: CRM_ENTITLEMENTS_CONFIG_KEY,
      entitlements: next,
      availablePackages: CRM_PACKAGES,
      availableCapabilities: CRM_CAPABILITIES,
    };
  }

  @Post('tenants/:id/switch')
  async switchToTenant(@Param('id') tenantId: string) {
    this.logger.log(
      `AdminController: switchToTenant called with tenantId: ${tenantId}`,
    );
    return this.adminService.switchToTenant(tenantId);
  }

  @Post('trials')
  async createTrial(
    @Body() body: { tenantId: string; durationHours: number; planId: string },
  ) {
    this.logger.log(
      `AdminController: createTrial called for tenant: ${body.tenantId}`,
    );
    return this.subscriptionService.createTrialSubscription(
      body.tenantId,
      body.durationHours,
      body.planId,
    );
  }

  @Get('trials/:tenantId')
  async getTrialStatus(@Param('tenantId') tenantId: string) {
    this.logger.log(
      `AdminController: getTrialStatus called for tenant: ${tenantId}`,
    );
    return this.subscriptionService.checkTrialStatus(tenantId);
  }

  // Plan Management Endpoints
  @Get('plans')
  async getAllPlans() {
    this.logger.log('AdminController: getAllPlans called');
    return this.adminService.getAllPlans();
  }

  @Get('plans/:id')
  async getPlanById(@Param('id') planId: string) {
    this.logger.log(
      `AdminController: getPlanById called with planId: ${planId}`,
    );
    return this.adminService.getPlanById(planId);
  }

  @Post('plans')
  async createPlan(@Body() planData: CreatePlanDto) {
    this.logger.log('AdminController: createPlan called');
    return this.adminService.createPlan(planData);
  }

  @Put('plans/:id')
  async updatePlan(
    @Param('id') planId: string,
    @Body() planData: UpdatePlanDto,
  ) {
    this.logger.log(
      `AdminController: updatePlan called with planId: ${planId}`,
    );
    return this.adminService.updatePlan(planId, planData);
  }

  @Delete('plans/:id')
  async deletePlan(@Param('id') planId: string) {
    this.logger.log(
      `AdminController: deletePlan called with planId: ${planId}`,
    );
    return this.adminService.deletePlan(planId);
  }

  @Get('plan-features')
  async getAllPlanFeatures() {
    this.logger.log('AdminController: getAllPlanFeatures called');
    return this.adminService.getAllPlanFeatures();
  }

  @Post('tenants')
  async createTenant(
    @Body() tenantData: CreateTenantDto,
    @Req() req: ExpressRequest,
  ) {
    this.logger.log('AdminController: createTenant called');
    const packageFromRequest =
      tenantData?.crmEntitlements?.packageKey || tenantData?.crmPackageKey;
    const defaultTemplate = getCrmPackageTemplate(
      normalizeCrmPackageKey(packageFromRequest),
    );

    const requestedCapabilities = tenantData?.crmEntitlements
      ?.enabledCapabilities
      ? normalizeCrmCapabilities(tenantData.crmEntitlements.enabledCapabilities)
      : defaultTemplate.enabledCapabilities;
    const enabledCapabilities =
      requestedCapabilities.length > 0
        ? requestedCapabilities
        : defaultTemplate.enabledCapabilities;

    const dependencyErrors =
      validateCrmCapabilityDependencies(enabledCapabilities);
    if (dependencyErrors.length > 0) {
      throw new BadRequestException({
        message: 'Invalid CRM capability combination for tenant creation',
        errors: dependencyErrors,
      });
    }

    const created = await this.adminService.createTenant(tenantData);

    const next: CrmEntitlements = {
      packageKey: defaultTemplate.packageKey,
      enabledCapabilities,
      limits: normalizeCrmLimits(
        tenantData?.crmEntitlements?.limits,
        defaultTemplate.limits,
      ),
      allowedProviders: normalizeCrmAllowedProviders(
        tenantData?.crmEntitlements?.allowedProviders,
        defaultTemplate.allowedProviders,
      ),
    };

    await this.tenantConfigurationService.setTenantConfiguration(
      created.tenant.id,
      CRM_ENTITLEMENTS_CONFIG_KEY,
      JSON.stringify(next),
      {
        description: 'Tenant CRM entitlements (platform admin onboarding)',
        category: 'general',
        isEncrypted: false,
        isPublic: false,
      },
    );

    const selectedPreset =
      getModulePreset(tenantData?.modulePresetKey) ||
      getModulePreset('full_suite');
    const enabledModules = normalizeEnabledModules(
      selectedPreset?.enabledModules || DEFAULT_ENABLED_MODULES,
    );

    await this.tenantConfigurationService.setTenantConfiguration(
      created.tenant.id,
      MODULES_CONFIG_KEY,
      JSON.stringify(enabledModules),
      {
        description: 'Tenant module entitlements (platform admin onboarding)',
        category: 'general',
        isEncrypted: false,
        isPublic: false,
      },
    );

    const actorUserId = this.getActorUserId(req);
    await this.auditLogService.log(
      actorUserId,
      'platform_tenant_crm_entitlements_updated',
      {
        actorUserId,
        tenantId: created.tenant.id,
        source: 'tenant_create',
        reason: 'initial package assignment',
        effectiveFrom: new Date().toISOString(),
        effectiveTo: null,
        previous: null,
        next,
      },
      this.getRequestIp(req),
    );

    await this.auditLogService.log(
      actorUserId,
      'platform_tenant_modules_updated',
      {
        actorUserId,
        tenantId: created.tenant.id,
        source: 'tenant_create_preset',
        presetKey: selectedPreset?.key || 'full_suite',
        previousModules: [],
        enabledModules,
      },
      this.getRequestIp(req),
    );

    return created;
  }

  @Get('tenants/:id/crm-entitlements/timeline')
  async getTenantCrmEntitlementsTimeline(
    @Param('id') tenantId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = Number.isFinite(Number(limit))
      ? Math.min(Math.max(Number(limit), 1), 200)
      : 50;
    const logs = await this.auditLogService.getLogs(500);

    const filtered = logs
      .filter(
        (log) => log.action === 'platform_tenant_crm_entitlements_updated',
      )
      .filter((log) => {
        const details = this.asObject(log.details) ?? {};
        return details?.tenantId === tenantId;
      })
      .slice(0, limitNum)
      .map((log) => {
        const details = this.asObject(log.details) ?? {};
        return {
          id: log.id,
          action: log.action,
          createdAt: log.createdAt,
          ip: log.ip,
          actor: log.User
            ? {
                id: log.User.id,
                name: log.User.name,
                email: log.User.email,
              }
            : null,
          source: this.asString(details.source) || null,
          reason: this.asString(details.reason) || null,
          effectiveFrom: this.asString(details.effectiveFrom) || null,
          effectiveTo: details?.effectiveTo ?? null,
          previous: details?.previous || null,
          next: details?.next || null,
        };
      });

    return {
      tenantId,
      total: filtered.length,
      items: filtered,
    };
  }

  @Post('tenants/:id/restore')
  async restoreTenant(@Param('id') tenantId: string) {
    this.logger.log(
      `AdminController: restoreTenant called with tenantId: ${tenantId}`,
    );
    return this.adminService.restoreTenant(tenantId);
  }

  @Delete('tenants/:id')
  async deleteTenant(@Param('id') tenantId: string) {
    this.logger.log(
      `AdminController: deleteTenant called with tenantId: ${tenantId}`,
    );
    return this.adminService.deleteTenant(tenantId);
  }

  @Get('users')
  async getAllUsers() {
    this.logger.log('AdminController: getAllUsers called');
    return this.adminService.getAllUsers();
  }

  @Put('users/:id/status')
  async updateUserStatus(
    @Param('id') userId: string,
    @Body() body: { isDisabled: boolean },
  ) {
    this.logger.log(
      `AdminController: updateUserStatus called for userId: ${userId}, isDisabled: ${body.isDisabled}`,
    );
    return this.adminService.updateUserStatus(userId, body.isDisabled);
  }

  @Put('users/:id/role')
  async updateUserRole(
    @Param('id') userId: string,
    @Body() body: { roleId: string; tenantId?: string },
  ) {
    this.logger.log(
      `AdminController: updateUserRole called for userId: ${userId}, roleId: ${body.roleId}`,
    );
    return this.adminService.updateUserRole(userId, body.roleId, body.tenantId);
  }

  @Post('users/:id/logout-all')
  async logoutAllSessions(@Param('id') userId: string) {
    this.logger.log(`AdminController: logout-all called for userId: ${userId}`);
    const count = await this.authService.revokeAllSessionsForUser(userId);
    return { revoked: count };
  }

  @Get('users/:id/activity')
  async getUserActivity(
    @Param('id') userId: string,
    @Query('limit') limit: string,
  ) {
    this.logger.log(
      `AdminController: getUserActivity called for userId: ${userId}`,
    );
    const limitNum = limit ? Number(limit) : 50;
    return this.adminService.getUserActivity(userId, limitNum);
  }

  @Get('logs')
  async getAuditLogs(
    @Query('limit') limit: string,
    @Query('tenantId') tenantId?: string,
  ) {
    this.logger.log('AdminController: getAuditLogs called');
    const limitNum = limit ? Number(limit) : 100;
    return this.auditLogService.getLogs(limitNum, tenantId);
  }
}
