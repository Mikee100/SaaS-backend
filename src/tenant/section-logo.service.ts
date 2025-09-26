import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { LogoService } from './logo.service';

export interface SectionLogoConfig {
  section: string;
  logoType: string;
  logoUrl?: string;
  enabled: boolean;
  dimensions?: {
    width?: number;
    height?: number;
  };
  position?: string;
}

export interface SectionLogoSettings {
  sections: {
    [section: string]: {
      logoType: string;
      enabled: boolean;
      customUrl?: string;
      dimensions?: {
        width?: number;
        height?: number;
      };
      position?: string;
    };
  };
}

export interface SectionLogo {
  url: string;
  altText?: string;
  width?: number;
  height?: number;
}

@Injectable()
export class SectionLogoService {
  private readonly logger = new Logger(SectionLogoService.name);

  constructor(
    private prisma: PrismaService,
    private logoService: LogoService,
  ) {}

  private getDefaultSettings(): SectionLogoSettings {
    return {
      sections: {
        login: {
          logoType: 'loginLogoUrl',
          enabled: true,
          dimensions: { width: 200, height: 50 },
          position: 'center',
        },
        dashboard: {
          logoType: 'dashboardLogoUrl',
          enabled: true,
          dimensions: { width: 180, height: 45 },
          position: 'left',
        },
        email: {
          logoType: 'emailLogoUrl',
          enabled: true,
          dimensions: { width: 200, height: 50 },
          position: 'center',
        },
        mobile: {
          logoType: 'mobileLogoUrl',
          enabled: true,
          dimensions: { width: 120, height: 30 },
          position: 'center',
        },
        receipt: {
          logoType: 'receiptLogoUrl',
          enabled: true,
          dimensions: { width: 200, height: 50 },
          position: 'center',
        },
      },
    };
  }

  private parseLogoSettings(settings: any): SectionLogoSettings {
    if (!settings) return this.getDefaultSettings();

    if (typeof settings === 'string') {
      try {
        return JSON.parse(settings);
      } catch (e) {
        this.logger.error('Error parsing logo settings', e);
        return this.getDefaultSettings();
      }
    }

    const defaultSettings = this.getDefaultSettings();
    const result: SectionLogoSettings = {
      sections: { ...defaultSettings.sections, ...settings.sections },
    };

    for (const [section, config] of Object.entries(result.sections)) {
      result.sections[section] = {
        ...defaultSettings.sections[
          section as keyof typeof defaultSettings.sections
        ],
        ...config,
      };
    }

    return result;
  }

  async getSectionLogoConfig(
    tenantId: string,
    section: string,
  ): Promise<SectionLogoConfig | null> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        logoSettings: true,
        logoUrl: true,
        loginLogoUrl: true,
        dashboardLogoUrl: true,
        emailLogoUrl: true,
        mobileLogoUrl: true,
        favicon: true,
        receiptLogo: true,
        watermark: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    const settings = this.parseLogoSettings(tenant.logoSettings);
    const sectionConfig = settings.sections[section];

    if (!sectionConfig) {
      return null;
    }

    let logoUrl = '';
    switch (sectionConfig.logoType) {
      case 'loginLogoUrl':
        logoUrl = tenant.loginLogoUrl || tenant.logoUrl || '';
        break;
      case 'dashboardLogoUrl':
        logoUrl = tenant.dashboardLogoUrl || tenant.logoUrl || '';
        break;
      case 'emailLogoUrl':
        logoUrl = tenant.emailLogoUrl || tenant.logoUrl || '';
        break;
      case 'mobileLogoUrl':
        logoUrl = tenant.mobileLogoUrl || tenant.logoUrl || '';
        break;
      case 'favicon':
        logoUrl = tenant.favicon || '';
        break;
      case 'receiptLogo':
        logoUrl = tenant.receiptLogo || '';
        break;
      case 'watermark':
        logoUrl = tenant.watermark || '';
        break;
      default:
        logoUrl = tenant.logoUrl || '';
    }

    return {
      section,
      logoType: sectionConfig.logoType,
      logoUrl,
      enabled: sectionConfig.enabled !== false,
      dimensions: sectionConfig.dimensions,
      position: sectionConfig.position,
    };
  }

  async updateSectionLogoConfig(
    tenantId: string,
    section: string,
    config: Partial<Omit<SectionLogoConfig, 'section'>>,
  ): Promise<SectionLogoConfig> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { logoSettings: true },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    const currentSettings = this.parseLogoSettings(tenant.logoSettings);
    const sectionConfig = currentSettings.sections[section] || {
      logoType: 'logoUrl',
      enabled: true,
    };

    currentSettings.sections[section] = {
      ...sectionConfig,
      ...config,
      logoType: config.logoType || sectionConfig.logoType,
      enabled:
        config.enabled !== undefined ? config.enabled : sectionConfig.enabled,
      dimensions: {
        ...(sectionConfig.dimensions || {}),
        ...(config.dimensions || {}),
      },
    };

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { logoSettings: currentSettings as any },
    });

    return this.getSectionLogoConfig(
      tenantId,
      section,
    ) as Promise<SectionLogoConfig>;
  }

  async getSectionLogo(
    tenantId: string,
    section: string,
  ): Promise<SectionLogo | null> {
    const config = await this.getSectionLogoConfig(tenantId, section);
    if (!config || !config.enabled) {
      return null;
    }
    let logoUrl = config.logoUrl || '';
    // If logoUrl is set and not already in section-logos, rewrite to section-logos path
    if (logoUrl && !logoUrl.includes('/uploads/section-logos/')) {
      // Extract filename from logoUrl
      const filename = logoUrl.split('/').pop();
      logoUrl = `/uploads/section-logos/${filename}`;
    }
    return {
      url: logoUrl,
      width: config.dimensions?.width,
      height: config.dimensions?.height,
    };
  }

  async getAllSectionLogos(
    tenantId: string,
  ): Promise<Record<string, SectionLogoConfig>> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        logoSettings: true,
        logoUrl: true,
        loginLogoUrl: true,
        dashboardLogoUrl: true,
        emailLogoUrl: true,
        mobileLogoUrl: true,
      },
    });

    if (!tenant) return {};

    const sections = [
      'main',
      'favicon',
      'receipt',
      'watermark',
      'login',
      'dashboard',
      'email',
      'mobile',
      'sidebar',
      'header',
    ];

    const result: Record<string, SectionLogoConfig> = {};

    for (const section of sections) {
      const config = await this.getSectionLogoConfig(tenantId, section);
      if (config) {
        result[section] = config;
      }
    }

    return result;
  }

  async updateSectionLogo(
    tenantId: string,
    sectionName: string,
    logo: Omit<SectionLogo, 'url'> & { url?: string },
  ): Promise<SectionLogoSettings> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { logoSettings: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const currentSettings: SectionLogoSettings = this.parseLogoSettings(
      tenant.logoSettings,
    );

    currentSettings.sections[sectionName] = {
      logoType: 'custom',
      enabled: true,
      customUrl: logo.url,
      dimensions: {
        width: logo.width,
        height: logo.height,
      },
    };

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        logoSettings: currentSettings as any,
      },
    });

    return currentSettings;
  }

  async removeSectionLogo(
    tenantId: string,
    sectionName: string,
  ): Promise<boolean> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { logoSettings: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (!tenant.logoSettings) {
      return false;
    }

    const currentSettings: SectionLogoSettings = this.parseLogoSettings(
      tenant.logoSettings,
    );

    if (!currentSettings.sections || !currentSettings.sections[sectionName]) {
      return false;
    }

    delete currentSettings.sections[sectionName];

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        logoSettings: currentSettings as any,
      },
    });

    return true;
  }

  private getDefaultLogoForSection(
    tenant: any,
    section: string,
  ): SectionLogoConfig {
    const logoMap: Record<string, string> = {
      main: 'logoUrl',
      favicon: 'faviconUrl',
      receipt: 'receiptLogoUrl',
      watermark: 'watermarkUrl',
      login: 'loginLogoUrl',
      dashboard: 'dashboardLogoUrl',
      email: 'emailLogoUrl',
      mobile: 'mobileLogoUrl',
      sidebar: 'logoUrl',
      header: 'logoUrl',
    };

    const logoType = logoMap[section] || 'logoUrl';
    const logoUrl = tenant[logoType as keyof typeof tenant] as string;

    return {
      section,
      logoType,
      logoUrl: logoUrl || tenant.logoUrl,
      enabled: true,
    };
  }

  private getLogoUrlByType(tenant: any, logoType: string): string | undefined {
    const logoMap: Record<string, string> = {
      main: 'logoUrl',
      favicon: 'faviconUrl',
      receipt: 'receiptLogoUrl',
      watermark: 'watermarkUrl',
      login: 'loginLogoUrl',
      dashboard: 'dashboardLogoUrl',
      email: 'emailLogoUrl',
      mobile: 'mobileLogoUrl',
    };

    return tenant[logoMap[logoType] as keyof typeof tenant] as string;
  }

  async getLogoUsageBySection(
    tenantId: string,
  ): Promise<Record<string, string | null>> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        logoUrl: true,
        favicon: true,
        receiptLogo: true,
        watermark: true,
        loginLogoUrl: true,
        dashboardLogoUrl: true,
        emailLogoUrl: true,
        mobileLogoUrl: true,
      },
    });

    if (!tenant) return {};

    return {
      main: tenant.logoUrl,
      favicon: tenant.favicon,
      receipt: tenant.receiptLogo,
      watermark: tenant.watermark,
      login: tenant.loginLogoUrl,
      dashboard: tenant.dashboardLogoUrl,
      email: tenant.emailLogoUrl,
      mobile: tenant.mobileLogoUrl,
    };
  }

  async validateSectionLogoConfig(tenantId: string): Promise<{
    compliant: boolean;
    missing: string[];
    recommendations: string[];
  }> {
    const sections = await this.getAllSectionLogos(tenantId);
    const missing: string[] = [];
    const recommendations: string[] = [];

    for (const [section, config] of Object.entries(sections)) {
      if (config.enabled && !config.logoUrl) {
        missing.push(section);
      }
    }

    if (missing.length > 0) {
      recommendations.push(`Upload logos for sections: ${missing.join(', ')}`);
    }

    const compliant = missing.length === 0;

    return {
      compliant,
      missing,
      recommendations,
    };
  }
}
