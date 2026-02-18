import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SuperadminGuard } from './superadmin.guard';
import { TrialGuard } from '../auth/trial.guard';
import { ConfigurationService } from '../config/configuration.service';

const PLATFORM_KEYS = {
  platformName: 'platform_name',
  supportEmail: 'platform_supportEmail',
  defaultPlan: 'platform_defaultPlan',
  requireEmailVerification: 'platform_requireEmailVerification',
  twoFactorAuth: 'platform_twoFactorAuth',
  currency: 'platform_currency',
  trialPeriodDays: 'platform_trialPeriodDays',
} as const;

@Controller('admin/settings')
@UseGuards(AuthGuard('jwt'), SuperadminGuard, TrialGuard)
export class PlatformSettingsController {
  constructor(private readonly configurationService: ConfigurationService) {}

  @Get('platform')
  async getPlatformSettings() {
    const [
      platformName,
      supportEmail,
      defaultPlan,
      requireEmailVerification,
      twoFactorAuth,
      currency,
      trialPeriodDays,
    ] = await Promise.all([
      this.configurationService.getConfiguration(PLATFORM_KEYS.platformName),
      this.configurationService.getConfiguration(PLATFORM_KEYS.supportEmail),
      this.configurationService.getConfiguration(PLATFORM_KEYS.defaultPlan),
      this.configurationService.getConfiguration(PLATFORM_KEYS.requireEmailVerification),
      this.configurationService.getConfiguration(PLATFORM_KEYS.twoFactorAuth),
      this.configurationService.getConfiguration(PLATFORM_KEYS.currency),
      this.configurationService.getConfiguration(PLATFORM_KEYS.trialPeriodDays),
    ]);

    return {
      platformName: platformName || 'SaaS Platform',
      supportEmail: supportEmail || 'support@saasplatform.com',
      defaultPlan: defaultPlan || 'basic',
      requireEmailVerification: requireEmailVerification === 'true',
      twoFactorAuth: twoFactorAuth === 'true',
      currency: currency || 'KES',
      trialPeriodDays: trialPeriodDays ? parseInt(trialPeriodDays, 10) : 14,
    };
  }

  @Put('platform')
  async savePlatformSettings(
    @Body()
    body: {
      platformName?: string;
      supportEmail?: string;
      defaultPlan?: string;
      requireEmailVerification?: boolean;
      twoFactorAuth?: boolean;
      currency?: string;
      trialPeriodDays?: number;
    },
  ) {
    const updates: Array<Promise<void>> = [];

    if (body.platformName !== undefined) {
      updates.push(
        this.configurationService.setConfiguration(
          PLATFORM_KEYS.platformName,
          body.platformName,
          { category: 'general' },
        ),
      );
    }
    if (body.supportEmail !== undefined) {
      updates.push(
        this.configurationService.setConfiguration(
          PLATFORM_KEYS.supportEmail,
          body.supportEmail,
          { category: 'general' },
        ),
      );
    }
    if (body.defaultPlan !== undefined) {
      updates.push(
        this.configurationService.setConfiguration(
          PLATFORM_KEYS.defaultPlan,
          body.defaultPlan,
          { category: 'general' },
        ),
      );
    }
    if (body.requireEmailVerification !== undefined) {
      updates.push(
        this.configurationService.setConfiguration(
          PLATFORM_KEYS.requireEmailVerification,
          String(body.requireEmailVerification),
          { category: 'security' },
        ),
      );
    }
    if (body.twoFactorAuth !== undefined) {
      updates.push(
        this.configurationService.setConfiguration(
          PLATFORM_KEYS.twoFactorAuth,
          String(body.twoFactorAuth),
          { category: 'security' },
        ),
      );
    }
    if (body.currency !== undefined) {
      updates.push(
        this.configurationService.setConfiguration(
          PLATFORM_KEYS.currency,
          body.currency,
          { category: 'general' },
        ),
      );
    }
    if (body.trialPeriodDays !== undefined) {
      updates.push(
        this.configurationService.setConfiguration(
          PLATFORM_KEYS.trialPeriodDays,
          String(body.trialPeriodDays),
          { category: 'general' },
        ),
      );
    }

    await Promise.all(updates);
    return { success: true, message: 'Platform settings saved successfully' };
  }
}
