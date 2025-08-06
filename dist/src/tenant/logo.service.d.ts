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
export declare class LogoService {
    private prisma;
    constructor(prisma: PrismaService);
    validateTenantLogos(tenantId: string): Promise<{
        requirements: LogoRequirements;
        missing: string[];
        compliance: boolean;
    }>;
    getLogoUsage(tenantId: string): Promise<{
        mainLogo: string | null;
        favicon: string | null;
        receiptLogo: string | null;
        etimsQrCode: string | null;
        watermark: string | null;
    }>;
    enforceLogoCompliance(tenantId: string): Promise<{
        compliant: boolean;
        missing: string[];
        recommendations: string[];
    }>;
    validateLogoFile(file: Express.Multer.File, logoType: string): Promise<LogoValidation>;
    getLogoStatistics(tenantId: string): Promise<{
        totalLogos: number;
        requiredLogos: number;
        optionalLogos: number;
        complianceScore: number;
    }>;
}
