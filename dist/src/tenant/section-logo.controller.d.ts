import { SectionLogoService, SectionLogo, SectionLogoConfig } from './section-logo.service';
export declare class SectionLogoController {
    private readonly sectionLogoService;
    constructor(sectionLogoService: SectionLogoService);
    getAllSectionLogos(req: any): Promise<Record<string, SectionLogoConfig>>;
    getSectionLogo(req: any, section: string): Promise<SectionLogo>;
    uploadSectionLogo(req: any, file: Express.Multer.File, section: string, body: any): Promise<import("./section-logo.service").SectionLogoSettings>;
    updateSectionLogoConfig(req: any, section: string, config: Partial<SectionLogoConfig>): Promise<SectionLogoConfig>;
    removeSectionLogo(req: any, section: string): Promise<{
        success: boolean;
    }>;
    validateSectionLogoConfig(req: any): Promise<{
        compliant: boolean;
        missing: string[];
        recommendations: string[];
    }>;
}
