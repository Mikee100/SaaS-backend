import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { TenantConfigurationService, TenantConfigurationItem } from '../config/tenant-configuration.service';

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
  basicPriceId?: string;
  proPriceId?: string;
  enterprisePriceId?: string;
}

@Controller('tenant/configurations')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class TenantConfigurationController {
  constructor(private readonly tenantConfigurationService: TenantConfigurationService) {}

  @Get()
  @Permissions('view_billing')
  async getAllConfigurations(@Req() req) {
    const tenantId = req.user.tenantId;
    return this.tenantConfigurationService.getAllTenantConfigurations(tenantId);
  }

  @Get('category/:category')
  @Permissions('view_billing')
  async getConfigurationsByCategory(@Param('category') category: string, @Req() req) {
    const tenantId = req.user.tenantId;
    return this.tenantConfigurationService.getAllTenantConfigurations(tenantId, category);
  }

  @Get(':key')
  @Permissions('view_billing')
  async getConfiguration(@Param('key') key: string, @Req() req) {
    const tenantId = req.user.tenantId;
    const value = await this.tenantConfigurationService.getTenantConfiguration(tenantId, key);
    return { key, value };
  }

  @Post()
  @Permissions('edit_billing')
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
      }
    );
    return { message: 'Configuration created successfully' };
  }

  @Put(':key')
  @Permissions('edit_billing')
  async updateConfiguration(@Param('key') key: string, @Body() dto: UpdateConfigurationDto, @Req() req) {
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
      }
    );
    return { message: 'Configuration updated successfully' };
  }

  @Delete(':key')
  @Permissions('edit_billing')
  async deleteConfiguration(@Param('key') key: string, @Req() req) {
    const tenantId = req.user.tenantId;
    await this.tenantConfigurationService.deleteTenantConfiguration(tenantId, key);
    return { message: 'Configuration deleted successfully' };
  }

  // Stripe-specific endpoints
  @Get('stripe/status')
  @Permissions('view_billing')
  async getStripeStatus(@Req() req) {
    const tenantId = req.user.tenantId;
    const isConfigured = await this.tenantConfigurationService.isStripeConfigured(tenantId);
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
      this.tenantConfigurationService.setStripeSecretKey(tenantId, dto.secretKey),
      this.tenantConfigurationService.setStripePublishableKey(tenantId, dto.publishableKey),
      ...(dto.webhookSecret ? [this.tenantConfigurationService.setStripeWebhookSecret(tenantId, dto.webhookSecret)] : []),
      ...(dto.basicPriceId ? [this.tenantConfigurationService.setStripePriceId(tenantId, 'basic', dto.basicPriceId)] : []),
      ...(dto.proPriceId ? [this.tenantConfigurationService.setStripePriceId(tenantId, 'pro', dto.proPriceId)] : []),
      ...(dto.enterprisePriceId ? [this.tenantConfigurationService.setStripePriceId(tenantId, 'enterprise', dto.enterprisePriceId)] : []),
    ]);

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

  @Post('stripe/price-ids')
  @Permissions('edit_billing')
  async setStripePriceIds(@Body() dto: { basicPriceId?: string; proPriceId?: string; enterprisePriceId?: string }, @Req() req) {
    const tenantId = req.user.tenantId;

    await Promise.all([
      ...(dto.basicPriceId ? [this.tenantConfigurationService.setStripePriceId(tenantId, 'basic', dto.basicPriceId)] : []),
      ...(dto.proPriceId ? [this.tenantConfigurationService.setStripePriceId(tenantId, 'pro', dto.proPriceId)] : []),
      ...(dto.enterprisePriceId ? [this.tenantConfigurationService.setStripePriceId(tenantId, 'enterprise', dto.enterprisePriceId)] : []),
    ]);

    return { message: 'Stripe price IDs updated successfully' };
  }
} 