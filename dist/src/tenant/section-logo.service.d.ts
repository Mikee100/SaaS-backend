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
export declare class SectionLogoService {
    private prisma;
    private logoService;
    private readonly logger;
    constructor(prisma: PrismaService, logoService: LogoService);
    private getDefaultSettings;
    private parseLogoSettings;
    getSectionLogoConfig(tenantId: string, section: string): Promise<SectionLogoConfig | null>;
    updateSectionLogoConfig(tenantId: string, section: string, config: Partial<Omit<SectionLogoConfig, 'section'>>): Promise<SectionLogoConfig>;
    getSectionLogo(tenantId: string, section: string): Promise<SectionLogo | null>;
    getAllSectionLogos(tenantId: string): Promise<Record<string, SectionLogoConfig>>;
    updateSectionLogo(tenantId: string, sectionName: string, logo: Omit<SectionLogo, 'url'> & {
        url?: string;
    }): Promise<SectionLogoSettings>;
    removeSectionLogo(tenantId: string, sectionName: string): Promise<boolean>;
    private getDefaultLogoForSection;
    private getLogoUrlByType;
    getLogoUsageBySection(tenantId: string): Promise<Record<string, string | null>>;
    validateSectionLogoConfig(tenantId: string): Promise<{
        compliant: boolean;
        missing: string[];
        recommendations: string[];
    }>;
}
