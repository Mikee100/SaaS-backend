import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { TrialGuard } from '../auth/trial.guard';
import { TenantConfigurationService } from '../config/tenant-configuration.service';
import {
  AVAILABLE_MODULES,
  DEFAULT_ENABLED_MODULES,
  MODULES_CONFIG_KEY,
  normalizeEnabledModules,
} from '../auth/module-access.constants';
import { AuditLogService } from '../audit-log.service';
import {
  CRM_ENTITLEMENTS_CONFIG_KEY,
  CRM_USAGE_CONFIG_KEY,
  CrmLimitKey,
  evaluateCrmLimit,
  getDefaultCrmEntitlements,
  normalizeCrmEntitlements,
  normalizeCrmUsage,
} from '../auth/crm-entitlements.constants';
import { AuthenticatedRequest } from '../auth/request.types';

interface StripeServiceLike {
  createStripeProductsAndPrices(tenantId: string): Promise<unknown>;
  updateStripePrices(
    tenantId: string,
    prices: {
      basicPrice?: number;
      proPrice?: number;
      enterprisePrice?: number;
    },
  ): Promise<unknown>;
}

const isStripeServiceLike = (value: unknown): value is StripeServiceLike => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.createStripeProductsAndPrices === 'function' &&
    typeof obj.updateStripePrices === 'function'
  );
};

const getActorUserId = (req: AuthenticatedRequest): string | null =>
  req.user.userId ?? req.user.sub ?? null;

const getStripeService = (req: AuthenticatedRequest): StripeServiceLike => {
  const service: unknown = req.app.get('StripeService');
  if (!isStripeServiceLike(service)) {
    throw new ForbiddenException('Stripe service unavailable');
  }
  return service;
};

interface CreateConfigurationDto {
  key: string;
  value: string;
  description?: string;
  category: 'stripe' | 'payment' | 'billing' | 'general';
  isEncrypted?: boolean;
  isPublic?: boolean;
}

interface UpdateConfigurationDto {
  value: string;
  description?: string;
  category?: 'stripe' | 'payment' | 'billing' | 'general';
  isEncrypted?: boolean;
  isPublic?: boolean;
}

interface StripeConfigurationDto {
  secretKey: string;
  publishableKey: string;
  webhookSecret?: string;
  autoCreateProducts?: boolean;
  prices?: {
    basicPrice?: number;
    proPrice?: number;
    enterprisePrice?: number;
  };
}

@Controller('tenant/configurations')
@UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
export class TenantConfigurationController {
  constructor(
    private readonly tenantConfigurationService: TenantConfigurationService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get('modules')
  @Permissions('view_settings')
  async getEnabledModules(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required');
    }
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
      key: MODULES_CONFIG_KEY,
      enabledModules,
      availableModules: AVAILABLE_MODULES,
      defaultEnabledModules: DEFAULT_ENABLED_MODULES,
    };
  }

  @Get('crm/runtime')
  @Permissions('view_settings')
  async getCrmRuntimeStatus(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required');
    }

    const [crmEntitlementConfig, crmUsageConfig] = await Promise.all([
      this.tenantConfigurationService.getTenantConfiguration(
        tenantId,
        CRM_ENTITLEMENTS_CONFIG_KEY,
      ),
      this.tenantConfigurationService.getTenantConfiguration(
        tenantId,
        CRM_USAGE_CONFIG_KEY,
      ),
    ]);

    let parsedEntitlements: unknown;
    try {
      parsedEntitlements = crmEntitlementConfig
        ? JSON.parse(crmEntitlementConfig)
        : undefined;
    } catch {
      parsedEntitlements = undefined;
    }

    let parsedUsage: unknown;
    try {
      parsedUsage = crmUsageConfig ? JSON.parse(crmUsageConfig) : undefined;
    } catch {
      parsedUsage = undefined;
    }

    const entitlements = normalizeCrmEntitlements(
      parsedEntitlements || getDefaultCrmEntitlements(),
    );
    const usage = normalizeCrmUsage(parsedUsage);

    const limitKeys: CrmLimitKey[] = [
      'pipelines',
      'automationRules',
      'documentStorageGb',
      'integrationConnections',
      'telephonyMinutesMonthly',
      'proposalsMonthly',
      'contractsMonthly',
    ];

    const limits = limitKeys.map((key) =>
      evaluateCrmLimit(entitlements.limits, usage, key),
    );

    return {
      key: CRM_USAGE_CONFIG_KEY,
      usage,
      limits,
      hasWarnings: limits.some((entry) => entry.warning),
      hasBlockingLimits: limits.some((entry) => entry.blocked),
    };
  }

  @Put('modules')
  @Permissions('edit_settings')
  async updateEnabledModules(
    @Req() req: AuthenticatedRequest,
    @Body() body: { enabledModules?: string[] },
  ) {
    if (!req?.user?.isSuperadmin) {
      throw new ForbiddenException(
        'Module entitlements are managed by the platform administrator only',
      );
    }

    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required');
    }
    const actorUserId = getActorUserId(req);
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
        description: 'Tenant module entitlements',
        category: 'general',
        isEncrypted: false,
        isPublic: false,
      },
    );

    await this.auditLogService.log(
      actorUserId,
      'tenant_modules_updated',
      {
        tenantId,
        key: MODULES_CONFIG_KEY,
        previousModules,
        enabledModules,
      },
      req.ip,
    );

    return {
      message: 'Module entitlements updated successfully',
      key: MODULES_CONFIG_KEY,
      enabledModules,
      availableModules: AVAILABLE_MODULES,
    };
  }

  @Get()
  @Permissions('view_settings')
  async getAllConfigurations(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required');
    }
    return this.tenantConfigurationService.getAllTenantConfigurations(tenantId);
  }

  @Get('category/:category')
  @Permissions('view_settings')
  async getConfigurationsByCategory(
    @Param('category') category: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required');
    }
    return this.tenantConfigurationService.getAllTenantConfigurations(
      tenantId,
      category,
    );
  }

  @Get(':key')
  @Permissions('view_settings')
  async getConfiguration(
    @Param('key') key: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required');
    }
    const value = await this.tenantConfigurationService.getTenantConfiguration(
      tenantId,
      key,
    );
    return { key, value };
  }

  @Post()
  @Permissions('edit_settings')
  async createConfiguration(
    @Body() dto: CreateConfigurationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required');
    }
    await this.tenantConfigurationService.setTenantConfiguration(
      tenantId,
      dto.key,
      dto.value,
      {
        description: dto.description,
        category: dto.category,
        isEncrypted: dto.isEncrypted || false,
        isPublic: dto.isPublic || false,
      },
    );
    return { message: 'Configuration created successfully' };
  }

  @Put(':key')
  @Permissions('edit_settings')
  async updateConfiguration(
    @Param('key') key: string,
    @Body() dto: UpdateConfigurationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required');
    }
    await this.tenantConfigurationService.setTenantConfiguration(
      tenantId,
      key,
      dto.value,
      {
        description: dto.description,
        category: dto.category,
        isEncrypted: dto.isEncrypted,
        isPublic: dto.isPublic,
      },
    );
    return { message: 'Configuration updated successfully' };
  }

  @Delete(':key')
  @Permissions('edit_settings')
  async deleteConfiguration(
    @Param('key') key: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required');
    }
    await this.tenantConfigurationService.deleteTenantConfiguration(
      tenantId,
      key,
    );
    return { message: 'Configuration deleted successfully' };
  }

  // Stripe-specific endpoints
  @Get('stripe/status')
  @Permissions('view_billing')
  async getStripeStatus(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required');
    }
    const isConfigured =
      await this.tenantConfigurationService.isStripeConfigured(tenantId);
    return { isConfigured };
  }

  @Get('stripe/keys')
  @Permissions('view_billing')
  async getStripeKeys(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required');
    }
    const [secretKey, publishableKey, webhookSecret] = await Promise.all([
      this.tenantConfigurationService.getStripeSecretKey(tenantId),
      this.tenantConfigurationService.getStripePublishableKey(tenantId),
      this.tenantConfigurationService.getStripeWebhookSecret(tenantId),
    ]);

    return {
      secretKey: secretKey ? '[CONFIGURED]' : null,
      publishableKey,
      webhookSecret: webhookSecret ? '[CONFIGURED]' : null,
    };
  }

  @Post('stripe/configure')
  @Permissions('edit_billing')
  async configureStripe(
    @Body() dto: StripeConfigurationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required');
    }

    // Set Stripe keys
    await Promise.all([
      this.tenantConfigurationService.setStripeSecretKey(
        tenantId,
        dto.secretKey,
      ),
      this.tenantConfigurationService.setStripePublishableKey(
        tenantId,
        dto.publishableKey,
      ),
      ...(dto.webhookSecret
        ? [
            this.tenantConfigurationService.setStripeWebhookSecret(
              tenantId,
              dto.webhookSecret,
            ),
          ]
        : []),
    ]);

    // Auto-create products and prices if requested
    if (dto.autoCreateProducts) {
      const stripeService = getStripeService(req);
      await stripeService.createStripeProductsAndPrices(tenantId);
    }

    // Update prices if provided
    if (dto.prices) {
      const stripeService = getStripeService(req);
      await stripeService.updateStripePrices(tenantId, dto.prices);
    }

    return { message: 'Stripe configuration updated successfully' };
  }

  @Get('stripe/price-ids')
  @Permissions('view_billing')
  async getStripePriceIds(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required');
    }
    const [basicPriceId, proPriceId, enterprisePriceId] = await Promise.all([
      this.tenantConfigurationService.getStripePriceId(tenantId, 'basic'),
      this.tenantConfigurationService.getStripePriceId(tenantId, 'pro'),
      this.tenantConfigurationService.getStripePriceId(tenantId, 'enterprise'),
    ]);

    return {
      basicPriceId,
      proPriceId,
      enterprisePriceId,
    };
  }

  @Post('stripe/create-products')
  @Permissions('edit_billing')
  async createStripeProducts(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required');
    }
    const stripeService = getStripeService(req);

    const priceIds =
      await stripeService.createStripeProductsAndPrices(tenantId);

    return {
      message: 'Stripe products and prices created successfully',
      priceIds,
    };
  }

  @Post('stripe/update-prices')
  @Permissions('edit_billing')
  async updateStripePrices(
    @Body()
    dto: { basicPrice?: number; proPrice?: number; enterprisePrice?: number },
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required');
    }
    const stripeService = getStripeService(req);

    const priceIds = await stripeService.updateStripePrices(tenantId, dto);

    return {
      message: 'Stripe prices updated successfully',
      priceIds,
    };
  }
}
