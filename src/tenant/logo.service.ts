import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface LogoValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface LogoRequirements {
  mainLogo: boolean;
  etimsQrCode: boolean;
  favicon: boolean;
  receiptLogo: boolean;
  watermark: boolean;
}

@Injectable()
export class LogoService {
  constructor(private prisma: PrismaService) {}

  async validateTenantLogos(tenantId: string): Promise<{
    requirements: LogoRequirements;
    missing: string[];
    compliance: boolean;
  }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        logoUrl: true,
       
        etimsQrUrl: true,
        country: true,
      }
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const requirements: LogoRequirements = {
      mainLogo: true, // Always required
      etimsQrCode: tenant.country === 'Kenya', // Required for Kenya
      favicon: false, // Optional
      receiptLogo: false, // Optional
      watermark: false, // Optional
    };

    const missing: string[] = [];
    
    if (requirements.mainLogo && !tenant.logoUrl) {
      missing.push('Main Logo');
    }
    
    if (requirements.etimsQrCode && !tenant.etimsQrUrl) {
      missing.push('KRA eTIMS QR Code');
    }

    const compliance = missing.length === 0;

    return {
      requirements,
      missing,
      compliance
    };
  }

  async getLogoUsage(tenantId: string): Promise<{
    mainLogo: string | null;
    favicon: string | null;
    receiptLogo: string | null;
    etimsQrCode: string | null;
    watermark: string | null;
  }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        logoUrl: true,

        etimsQrUrl: true,
       
      }
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    return {
      mainLogo: tenant.logoUrl,
      favicon: null,
      receiptLogo: null,
      etimsQrCode: tenant.etimsQrUrl,
      watermark: null,
    };
  }

  async enforceLogoCompliance(tenantId: string): Promise<{
    compliant: boolean;
    missing: string[];
    recommendations: string[];
  }> {
    const validation = await this.validateTenantLogos(tenantId);
    
    const recommendations: string[] = [];
    
    if (!validation.compliance) {
      recommendations.push('Upload required logos to ensure compliance');
    }
    
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { country: true }
    });

    if (tenant?.country === 'Kenya' && !validation.missing.includes('KRA eTIMS QR Code')) {
      recommendations.push('Consider uploading a KRA eTIMS QR code for tax compliance');
    }

    return {
      compliant: validation.compliance,
      missing: validation.missing,
      recommendations
    };
  }

  async validateLogoFile(file: Express.Multer.File, logoType: string): Promise<LogoValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // File size validation
    const maxSizes = {
      main: 2 * 1024 * 1024, // 2MB
      favicon: 0.5 * 1024 * 1024, // 0.5MB
      receiptLogo: 1 * 1024 * 1024, // 1MB
      etimsQrCode: 1 * 1024 * 1024, // 1MB
      watermark: 1 * 1024 * 1024, // 1MB
    };

    const maxSize = maxSizes[logoType as keyof typeof maxSizes] || 2 * 1024 * 1024;
    if (file.size > maxSize) {
      errors.push(`File size must be less than ${maxSize / (1024 * 1024)}MB`);
    }

    // File type validation
    const allowedTypes = {
      main: ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'],
      favicon: ['image/x-icon', 'image/png'],
      receiptLogo: ['image/jpeg', 'image/jpg', 'image/png'],
      etimsQrCode: ['image/jpeg', 'image/jpg', 'image/png'],
      watermark: ['image/jpeg', 'image/jpg', 'image/png'],
    };

    const allowedMimes = allowedTypes[logoType as keyof typeof allowedTypes] || ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedMimes.includes(file.mimetype)) {
      errors.push(`File type must be one of: ${allowedMimes.join(', ')}`);
    }

    // Special validation for eTIMS QR code
    if (logoType === 'etimsQrCode') {
      warnings.push('Ensure this is a valid KRA eTIMS QR code for tax compliance');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async getLogoStatistics(tenantId: string): Promise<{
    totalLogos: number;
    requiredLogos: number;
    optionalLogos: number;
    complianceScore: number;
  }> {
    const logos = await this.getLogoUsage(tenantId);
    const validation = await this.validateTenantLogos(tenantId);
    
    const totalLogos = Object.values(logos).filter(Boolean).length;
    const requiredLogos = Object.values(validation.requirements).filter(Boolean).length;
    const optionalLogos = totalLogos - requiredLogos;
    const complianceScore = validation.compliance ? 100 : Math.round((requiredLogos - validation.missing.length) / requiredLogos * 100);

    return {
      totalLogos,
      requiredLogos,
      optionalLogos,
      complianceScore
    };
  }
} 