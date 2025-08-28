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
export interface MulterFile extends Express.Multer.File {
}
export declare class LogoService {
    private prisma;
    private readonly logger;
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
    validateLogoFile(file: MulterFile, logoType: string): Promise<LogoValidation>;
    getLogoStatistics(tenantId: string): Promise<{
        totalLogos: number;
        requiredLogos: number;
        optionalLogos: number;
        complianceScore: number;
    }>;
    getLogoRequirements(tenantId: string): Promise<{
        logo: {
            required: boolean;
            current: string | null;
            maxSize: number;
            allowedTypes: string[];
            dimensions: {
                width: number;
                height: number;
            };
        };
        etimsQrCode: {
            required: boolean;
            current: string | null;
            maxSize: number;
            allowedTypes: string[];
            dimensions: {
                width: number;
                height: number;
            };
        };
    }>;
    updateLogo(tenantId: string, file: MulterFile): Promise<{
        logoUrl: string | null;
        message: string;
    }>;
    updateEtimsQrCode(tenantId: string, file: MulterFile): Promise<{
        etimsQrUrl: string | null;
        message: string;
    }>;
    private uploadFile;
}
