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
import {
  TenantConfigurationService,
  TenantConfigurationItem,
} from '../config/tenant-configuration.service';
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
  async getEnabledModules(@Req() req) {
    const tenantId = req.user.tenantId;
    const configured = await this.tenantConfigurationService.getTenantConfiguration(
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
  async getCrmRuntimeStatus(@Req() req) {
    const tenantId = req.user.tenantId;

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
  async updateEnabledModules(@Req() req, @Body() body: { enabledModules?: string[] }) {
    if (!req?.user?.isSuperadmin) {
      throw new ForbiddenException(
        'Module entitlements are managed by the platform administrator only',
      );
    }

    const tenantId = req.user.tenantId;
    const actorUserId = req.user.userId || req.user.sub || null;
    const configured = await this.tenantConfigurationService.getTenantConfiguration(
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
  async getAllConfigurations(@Req() req) {
    const tenantId = req.user.tenantId;
    return this.tenantConfigurationService.getAllTenantConfigurations(tenantId);
  }

  @Get('category/:category')
  @Permissions('view_settings')
  async getConfigurationsByCategory(
    @Param('category') category: string,
    @Req() req,
  ) {
    const tenantId = req.user.tenantId;
    return this.tenantConfigurationService.getAllTenantConfigurations(
      tenantId,
      category,
    );
  }

  @Get(':key')
  @Permissions('view_settings')
  async getConfiguration(@Param('key') key: string, @Req() req) {
    const tenantId = req.user.tenantId;
    const value = await this.tenantConfigurationService.getTenantConfiguration(
      tenantId,
      key,
    );
    return { key, value };
  }

  @Post()
  @Permissions('edit_settings')
  async createConfiguration(@Body() dto: CreateConfigurationDto, @Req() req) {
    const tenantId = req.user.tenantId;
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
    @Req() req,
  ) {
    const tenantId = req.user.tenantId;
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
  async deleteConfiguration(@Param('key') key: string, @Req() req) {
    const tenantId = req.user.tenantId;
    await this.tenantConfigurationService.deleteTenantConfiguration(
      tenantId,
      key,
    );
    return { message: 'Configuration deleted successfully' };
  }

  // Stripe-specific endpoints
  @Get('stripe/status')
  @Permissions('view_billing')
  async getStripeStatus(@Req() req) {
    const tenantId = req.user.tenantId;
    const isConfigured =
      await this.tenantConfigurationService.isStripeConfigured(tenantId);
    return { isConfigured };
  }

  @Get('stripe/keys')
  @Permissions('view_billing')
  async getStripeKeys(@Req() req) {
    const tenantId = req.user.tenantId;
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
  async configureStripe(@Body() dto: StripeConfigurationDto, @Req() req) {
    const tenantId = req.user.tenantId;

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
      const stripeService = req.app.get('StripeService');
      await stripeService.createStripeProductsAndPrices(tenantId);
    }

    // Update prices if provided
    if (dto.prices) {
      const stripeService = req.app.get('StripeService');
      await stripeService.updateStripePrices(tenantId, dto.prices);
    }

    return { message: 'Stripe configuration updated successfully' };
  }

  @Get('stripe/price-ids')
  @Permissions('view_billing')
  async getStripePriceIds(@Req() req) {
    const tenantId = req.user.tenantId;
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
  async createStripeProducts(@Req() req) {
    const tenantId = req.user.tenantId;
    const stripeService = req.app.get('StripeService');

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
    @Req() req,
  ) {
    const tenantId = req.user.tenantId;
    const stripeService = req.app.get('StripeService');

    const priceIds = await stripeService.updateStripePrices(tenantId, dto);

    return {
      message: 'Stripe prices updated successfully',
      priceIds,
    };
  }
}
