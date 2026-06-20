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
import { ClassificationService } from '../classification/classification.service';
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
import type { Prisma } from '@prisma/client';
import { BlueprintManifestService } from '../blueprints/blueprint-manifest.service';
import { BlueprintMigrationHelperService } from '../blueprints/blueprint-migration-helper.service';
import {
  BLUEPRINT_KEY_CONFIG_KEY,
  BLUEPRINT_VERSION_CONFIG_KEY,
  BUSINESS_TYPE_CONFIG_KEY,
  FEATURE_FLAGS_CONFIG_KEY,
  INSTALLED_APPS_CONFIG_KEY,
} from '../blueprints/blueprint-manifest.constants';
import {
  BLUEPRINT_MANIFESTS_V1,
  getBlueprintManifestV1,
} from '../blueprints/blueprint-manifest.definitions';

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

interface UpdateTenantBlueprintDto {
  businessType?: string;
  blueprintKey?: string;
  blueprintVersion?: string;
  installedApps?: string[];
  featureFlags?: Record<string, boolean>;
  enabledModules?: string[];
}

interface RollbackTenantBlueprintDto {
  auditLogId?: string;
}

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
    private readonly classificationService: ClassificationService,
    private readonly blueprintManifestService: BlueprintManifestService,
    private readonly blueprintMigrationHelperService: BlueprintMigrationHelperService,
  ) {}

  private normalizeBusinessType(value: unknown): string {
    const normalized = String(value || '')
      .trim()
      .toLowerCase();
    if (
      normalized === 'fashion' ||
      normalized === 'restaurant' ||
      normalized === 'spa_barber'
    ) {
      return normalized;
    }
    return '';
  }

  private normalizeInstalledApps(input: unknown): string[] {
    if (!Array.isArray(input)) {
      return [];
    }
    return Array.from(
      new Set(
        input
          .map((entry) => String(entry || '').trim().toLowerCase())
          .filter((entry) => entry.length > 0),
      ),
    );
  }

  private normalizeFeatureFlags(
    input: unknown,
  ): Record<string, boolean> {
    if (!input || typeof input !== 'object') {
      return {};
    }

    const entries = Object.entries(input as Record<string, unknown>).filter(
      ([key, value]) =>
        String(key || '').trim().length > 0 && typeof value === 'boolean',
    );
    return Object.fromEntries(entries) as Record<string, boolean>;
  }

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

  private async persistTenantBlueprintConfiguration(
    tenantId: string,
    input: {
      businessType: string;
      blueprintKey: string;
      blueprintVersion: string;
      installedApps: string[];
      featureFlags: Record<string, boolean>;
      enabledModules: string[];
    },
  ): Promise<void> {
    await Promise.all([
      this.tenantConfigurationService.setTenantConfiguration(
        tenantId,
        BUSINESS_TYPE_CONFIG_KEY,
        input.businessType,
        {
          description: 'Tenant business type (platform admin)',
          category: 'general',
          isEncrypted: false,
          isPublic: false,
        },
      ),
      this.tenantConfigurationService.setTenantConfiguration(
        tenantId,
        BLUEPRINT_KEY_CONFIG_KEY,
        input.blueprintKey,
        {
          description: 'Tenant blueprint key (platform admin)',
          category: 'general',
          isEncrypted: false,
          isPublic: false,
        },
      ),
      this.tenantConfigurationService.setTenantConfiguration(
        tenantId,
        BLUEPRINT_VERSION_CONFIG_KEY,
        input.blueprintVersion,
        {
          description: 'Tenant blueprint version (platform admin)',
          category: 'general',
          isEncrypted: false,
          isPublic: false,
        },
      ),
      this.tenantConfigurationService.setTenantConfiguration(
        tenantId,
        INSTALLED_APPS_CONFIG_KEY,
        JSON.stringify(input.installedApps),
        {
          description: 'Tenant installed apps (platform admin)',
          category: 'general',
          isEncrypted: false,
          isPublic: false,
        },
      ),
      this.tenantConfigurationService.setTenantConfiguration(
        tenantId,
        FEATURE_FLAGS_CONFIG_KEY,
        JSON.stringify(input.featureFlags),
        {
          description: 'Tenant feature flags (platform admin)',
          category: 'general',
          isEncrypted: false,
          isPublic: false,
        },
      ),
      this.tenantConfigurationService.setTenantConfiguration(
        tenantId,
        MODULES_CONFIG_KEY,
        JSON.stringify(input.enabledModules),
        {
          description: 'Tenant module entitlements (blueprint sync)',
          category: 'general',
          isEncrypted: false,
          isPublic: false,
        },
      ),
    ]);
  }

  private extractBlueprintConfigSnapshot(
    input: unknown,
  ): UpdateTenantBlueprintDto | null {
    const obj = this.asObject(input);
    if (!obj) {
      return null;
    }

    return {
      businessType: this.asString(obj.businessType),
      blueprintKey: this.asString(obj.blueprintKey),
      blueprintVersion: this.asString(obj.blueprintVersion),
      installedApps: this.normalizeInstalledApps(obj.installedApps),
      featureFlags: this.normalizeFeatureFlags(obj.featureFlags),
      enabledModules: normalizeEnabledModules(obj.enabledModules),
    };
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

  @Get('classifications')
  async getClassifications(@Query('includeInactive') includeInactive?: string) {
    return this.classificationService.findAllClassifications(
      includeInactive === 'true',
    );
  }

  @Post('classifications/bootstrap-defaults')
  async bootstrapClassifications() {
    return this.classificationService.bootstrapDefaultClassifications();
  }

  @Get('classifications/:id')
  async getClassificationById(@Param('id') id: string) {
    return this.classificationService.findClassificationById(id);
  }

  @Post('classifications')
  async createClassification(@Body() body: Record<string, unknown>) {
    return this.classificationService.createClassification(body as any);
  }

  @Put('classifications/:id')
  async updateClassification(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.classificationService.updateClassification(id, body as any);
  }

  @Delete('classifications/:id')
  async deleteClassification(@Param('id') id: string) {
    return this.classificationService.deleteClassification(id);
  }

  @Get('classifications/:id/units')
  async getClassificationUnits(@Param('id') id: string) {
    return this.classificationService.findUnitsByClassification(id);
  }

  @Post('classifications/:id/units')
  async createClassificationUnit(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.classificationService.createUnit(id, body as any);
  }

  @Put('classifications/units/:unitId')
  async updateClassificationUnit(
    @Param('unitId') unitId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.classificationService.updateUnit(unitId, body as any);
  }

  @Delete('classifications/units/:unitId')
  async deleteClassificationUnit(@Param('unitId') unitId: string) {
    return this.classificationService.deactivateUnit(unitId);
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

  @Get('blueprints')
  getBlueprints() {
    const blueprints = BLUEPRINT_MANIFESTS_V1.map((entry) => ({
      businessType: entry.businessType,
      blueprintKey: entry.blueprintKey,
      blueprintVersion: entry.blueprintVersion,
      displayName: entry.displayName,
      description: entry.description,
      enabledModules: entry.enabledModules,
      apps: entry.apps,
      features: entry.features,
    }));

    return {
      version: 'v1',
      total: blueprints.length,
      blueprints,
    };
  }

  @Get('tenants/:id/blueprint')
  async getTenantBlueprint(@Param('id') tenantId: string) {
    const [
      configuredBlueprintKey,
      configuredBlueprintVersion,
      configuredBusinessType,
      configuredInstalledApps,
      configuredFeatureFlags,
      configuredModules,
      effective,
    ] = await Promise.all([
      this.tenantConfigurationService.getTenantConfiguration(
        tenantId,
        BLUEPRINT_KEY_CONFIG_KEY,
      ),
      this.tenantConfigurationService.getTenantConfiguration(
        tenantId,
        BLUEPRINT_VERSION_CONFIG_KEY,
      ),
      this.tenantConfigurationService.getTenantConfiguration(
        tenantId,
        BUSINESS_TYPE_CONFIG_KEY,
      ),
      this.tenantConfigurationService.getTenantConfiguration(
        tenantId,
        INSTALLED_APPS_CONFIG_KEY,
      ),
      this.tenantConfigurationService.getTenantConfiguration(
        tenantId,
        FEATURE_FLAGS_CONFIG_KEY,
      ),
      this.tenantConfigurationService.getTenantConfiguration(
        tenantId,
        MODULES_CONFIG_KEY,
      ),
      this.blueprintManifestService.resolveEffectiveManifest(tenantId),
    ]);

    let modulesParsed: unknown;
    try {
      modulesParsed = configuredModules ? JSON.parse(configuredModules) : undefined;
    } catch {
      modulesParsed = undefined;
    }

    let installedAppsParsed: unknown;
    try {
      installedAppsParsed = configuredInstalledApps
        ? JSON.parse(configuredInstalledApps)
        : undefined;
    } catch {
      installedAppsParsed = undefined;
    }

    let featureFlagsParsed: unknown;
    try {
      featureFlagsParsed = configuredFeatureFlags
        ? JSON.parse(configuredFeatureFlags)
        : undefined;
    } catch {
      featureFlagsParsed = undefined;
    }

    return {
      tenantId,
      configured: {
        businessType: this.normalizeBusinessType(configuredBusinessType),
        blueprintKey: String(configuredBlueprintKey || '').trim().toLowerCase(),
        blueprintVersion: String(configuredBlueprintVersion || 'v1')
          .trim()
          .toLowerCase(),
        installedApps: this.normalizeInstalledApps(installedAppsParsed),
        featureFlags: this.normalizeFeatureFlags(featureFlagsParsed),
        enabledModules: normalizeEnabledModules(modulesParsed),
      },
      effective,
    };
  }

  @Get('tenants/:id/blueprint/migration-dry-run')
  async getTenantBlueprintMigrationDryRun(@Param('id') tenantId: string) {
    const report =
      await this.blueprintMigrationHelperService.generateTenantDryRunReport(
        tenantId,
      );

    return {
      mode: 'dry-run',
      report,
    };
  }

  @Get('blueprints/migration-dry-run')
  async getBlueprintMigrationDryRun(@Query('limit') limit?: string) {
    const parsedLimit = Number(limit || 50);
    const safeLimit = Number.isFinite(parsedLimit)
      ? Math.max(1, Math.min(500, Math.floor(parsedLimit)))
      : 50;

    const tenants = await this.adminService.getAllTenants();
    const selectedTenants = Array.isArray(tenants)
      ? tenants.slice(0, safeLimit)
      : [];

    const reports = await Promise.all(
      selectedTenants.map((tenant: { id: string; businessType?: string }) =>
        this.blueprintMigrationHelperService.generateTenantDryRunReport(
          tenant.id,
          this.normalizeBusinessType(tenant.businessType),
        ),
      ),
    );

    return {
      mode: 'dry-run',
      analyzedTenants: reports.length,
      reports,
    };
  }

  @Get('blueprints/migration-dry-run/summary')
  async getBlueprintMigrationDryRunSummary(@Query('limit') limit?: string) {
    const parsedLimit = Number(limit || 200);
    const safeLimit = Number.isFinite(parsedLimit)
      ? Math.max(1, Math.min(2000, Math.floor(parsedLimit)))
      : 200;

    const tenants = await this.adminService.getAllTenants();
    const selectedTenants = Array.isArray(tenants)
      ? tenants.slice(0, safeLimit)
      : [];

    const reports = await Promise.all(
      selectedTenants.map((tenant: { id: string; businessType?: string }) =>
        this.blueprintMigrationHelperService.generateTenantDryRunReport(
          tenant.id,
          this.normalizeBusinessType(tenant.businessType),
        ),
      ),
    );

    const byBlueprint = reports.reduce(
      (acc, report) => {
        const key = report.recommendation.blueprintKey;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const byConfidenceBand = reports.reduce(
      (acc, report) => {
        const confidence = report.recommendation.confidence;
        const band =
          confidence >= 0.8
            ? 'high'
            : confidence >= 0.5
              ? 'medium'
              : 'low';
        acc[band] = (acc[band] || 0) + 1;
        return acc;
      },
      { high: 0, medium: 0, low: 0 } as Record<'high' | 'medium' | 'low', number>,
    );

    const withBlueprintChange = reports.filter(
      (report) => report.changes.blueprintWillChange,
    ).length;

    return {
      mode: 'dry-run-summary',
      analyzedTenants: reports.length,
      byBlueprint,
      byConfidenceBand,
      withBlueprintChange,
      withoutBlueprintChange: reports.length - withBlueprintChange,
    };
  }

  @Put('tenants/:id/blueprint')
  async updateTenantBlueprint(
    @Param('id') tenantId: string,
    @Body() body: UpdateTenantBlueprintDto,
    @Req() req: ExpressRequest,
  ) {
    const normalizedBlueprintKey = String(body?.blueprintKey || '')
      .trim()
      .toLowerCase();

    const blueprint = getBlueprintManifestV1(normalizedBlueprintKey);
    if (!blueprint) {
      throw new BadRequestException('Invalid blueprint key');
    }

    const normalizedBlueprintVersion = String(
      body?.blueprintVersion || blueprint.blueprintVersion || 'v1',
    )
      .trim()
      .toLowerCase();

    if (normalizedBlueprintVersion !== 'v1') {
      throw new BadRequestException('Invalid blueprint version');
    }

    const normalizedBusinessType =
      this.normalizeBusinessType(body?.businessType) || blueprint.businessType;

    const normalizedInstalledApps = this.normalizeInstalledApps(
      body?.installedApps || [],
    );
    const normalizedFeatureFlags = this.normalizeFeatureFlags(
      body?.featureFlags || {},
    );
    const normalizedModules = normalizeEnabledModules(
      body?.enabledModules || blueprint.enabledModules,
    );

    const previous = await this.getTenantBlueprint(tenantId);

    await this.persistTenantBlueprintConfiguration(tenantId, {
      businessType: normalizedBusinessType,
      blueprintKey: normalizedBlueprintKey,
      blueprintVersion: normalizedBlueprintVersion,
      installedApps: normalizedInstalledApps,
      featureFlags: normalizedFeatureFlags,
      enabledModules: normalizedModules,
    });

    const actorUserId = this.getActorUserId(req);
    await this.auditLogService.log(
      actorUserId,
      'platform_tenant_blueprint_updated',
      {
        tenantId,
        previousConfigured: previous.configured,
        nextConfigured: {
          businessType: normalizedBusinessType,
          blueprintKey: normalizedBlueprintKey,
          blueprintVersion: normalizedBlueprintVersion,
          installedApps: normalizedInstalledApps,
          featureFlags: normalizedFeatureFlags,
          enabledModules: normalizedModules,
        },
      } as unknown as Prisma.InputJsonValue,
      this.getRequestIp(req),
    );

    const updated = await this.getTenantBlueprint(tenantId);
    return {
      message: 'Tenant blueprint updated successfully',
      ...updated,
    };
  }

  @Post('tenants/:id/blueprint/preview')
  async previewTenantBlueprint(
    @Param('id') tenantId: string,
    @Body() body: UpdateTenantBlueprintDto,
  ) {
    const normalizedBlueprintKey = String(body?.blueprintKey || '')
      .trim()
      .toLowerCase();

    const blueprint = getBlueprintManifestV1(normalizedBlueprintKey);
    if (!blueprint) {
      throw new BadRequestException('Invalid blueprint key');
    }

    const normalizedBlueprintVersion = String(
      body?.blueprintVersion || blueprint.blueprintVersion || 'v1',
    )
      .trim()
      .toLowerCase();

    if (normalizedBlueprintVersion !== 'v1') {
      throw new BadRequestException('Invalid blueprint version');
    }

    const normalizedBusinessType =
      this.normalizeBusinessType(body?.businessType) || blueprint.businessType;

    const normalizedInstalledApps = this.normalizeInstalledApps(
      body?.installedApps || [],
    );
    const normalizedFeatureFlags = this.normalizeFeatureFlags(
      body?.featureFlags || {},
    );
    const normalizedModules = normalizeEnabledModules(
      body?.enabledModules || blueprint.enabledModules,
    );

    const current = await this.getTenantBlueprint(tenantId);

    const effectivePreview = {
      manifest: {
        ...blueprint,
        businessType: normalizedBusinessType,
        enabledModules: normalizedModules,
        apps: (blueprint.apps || []).map((app) => ({
          ...app,
          enabledByDefault:
            Boolean(app.enabledByDefault) ||
            normalizedInstalledApps.includes(app.key),
        })),
        featureFlags: {
          ...(blueprint.featureFlags || {}),
          ...normalizedFeatureFlags,
        },
      },
      source: {
        blueprintKey: normalizedBlueprintKey,
        blueprintVersion: normalizedBlueprintVersion,
        businessType: normalizedBusinessType,
        fallbackFromEnabledModules: false,
      },
    };

    return {
      tenantId,
      mode: 'preview',
      current: current.configured,
      proposed: {
        businessType: normalizedBusinessType,
        blueprintKey: normalizedBlueprintKey,
        blueprintVersion: normalizedBlueprintVersion,
        installedApps: normalizedInstalledApps,
        featureFlags: normalizedFeatureFlags,
        enabledModules: normalizedModules,
      },
      effectivePreview,
    };
  }

  @Post('tenants/:id/blueprint/rollback')
  async rollbackTenantBlueprint(
    @Param('id') tenantId: string,
    @Body() body: RollbackTenantBlueprintDto,
    @Req() req: ExpressRequest,
  ) {
    const previous = await this.getTenantBlueprint(tenantId);

    const candidateEvents = body?.auditLogId
      ? await this.prisma.auditLog.findMany({
          where: {
            id: String(body.auditLogId),
            action: 'platform_tenant_blueprint_updated',
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        })
      : await this.prisma.auditLog.findMany({
          where: {
            action: 'platform_tenant_blueprint_updated',
          },
          orderBy: { createdAt: 'desc' },
          take: 200,
        });

    let rollbackSnapshot: UpdateTenantBlueprintDto | null = null;
    let rollbackEventId: string | null = null;

    for (const event of candidateEvents) {
      const details = this.asObject(event.details);
      if (!details) {
        continue;
      }

      const eventTenantId = this.asString(details.tenantId);
      if (eventTenantId !== tenantId) {
        continue;
      }

      const snapshot = this.extractBlueprintConfigSnapshot(
        details.previousConfigured,
      );
      if (!snapshot) {
        continue;
      }

      rollbackSnapshot = snapshot;
      rollbackEventId = event.id;
      break;
    }

    if (!rollbackSnapshot?.blueprintKey) {
      throw new BadRequestException(
        'No rollback snapshot found for tenant blueprint',
      );
    }

    const rollbackBlueprint = getBlueprintManifestV1(rollbackSnapshot.blueprintKey);
    if (!rollbackBlueprint) {
      throw new BadRequestException(
        'Rollback target blueprint is no longer available',
      );
    }

    const normalizedBusinessType =
      this.normalizeBusinessType(rollbackSnapshot.businessType) ||
      rollbackBlueprint.businessType;
    const normalizedBlueprintKey = String(rollbackSnapshot.blueprintKey)
      .trim()
      .toLowerCase();
    const normalizedBlueprintVersion = String(
      rollbackSnapshot.blueprintVersion || rollbackBlueprint.blueprintVersion || 'v1',
    )
      .trim()
      .toLowerCase();
    const normalizedInstalledApps = this.normalizeInstalledApps(
      rollbackSnapshot.installedApps || [],
    );
    const normalizedFeatureFlags = this.normalizeFeatureFlags(
      rollbackSnapshot.featureFlags || {},
    );
    const normalizedModules = normalizeEnabledModules(
      rollbackSnapshot.enabledModules || rollbackBlueprint.enabledModules,
    );

    await this.persistTenantBlueprintConfiguration(tenantId, {
      businessType: normalizedBusinessType,
      blueprintKey: normalizedBlueprintKey,
      blueprintVersion: normalizedBlueprintVersion,
      installedApps: normalizedInstalledApps,
      featureFlags: normalizedFeatureFlags,
      enabledModules: normalizedModules,
    });

    const actorUserId = this.getActorUserId(req);
    await this.auditLogService.log(
      actorUserId,
      'platform_tenant_blueprint_rolled_back',
      {
        tenantId,
        rollbackSourceEventId: rollbackEventId,
        previousConfigured: previous.configured,
        restoredConfigured: {
          businessType: normalizedBusinessType,
          blueprintKey: normalizedBlueprintKey,
          blueprintVersion: normalizedBlueprintVersion,
          installedApps: normalizedInstalledApps,
          featureFlags: normalizedFeatureFlags,
          enabledModules: normalizedModules,
        },
      } as unknown as Prisma.InputJsonValue,
      this.getRequestIp(req),
    );

    const updated = await this.getTenantBlueprint(tenantId);
    return {
      message: 'Tenant blueprint rollback completed successfully',
      rollbackSourceEventId: rollbackEventId,
      ...updated,
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
      } as unknown as Prisma.InputJsonValue,
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
      } as unknown as Prisma.InputJsonValue,
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
