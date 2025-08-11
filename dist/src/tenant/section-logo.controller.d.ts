import { SectionLogoService, SectionLogo, SectionLogoConfig } from './section-logo.service';
import { Request } from 'express';
interface UserPayload {
    id: string;
    tenantId: string;
}
interface RequestWithUser extends Request {
    user: UserPayload;
}
export declare class SectionLogoController {
    private readonly sectionLogoService;
    constructor(sectionLogoService: SectionLogoService);
    getAllSectionLogos(req: RequestWithUser): Promise<Record<string, SectionLogoConfig>>;
    getSectionLogo(req: RequestWithUser, section: string): Promise<SectionLogo>;
    uploadSectionLogo(req: RequestWithUser, file: Express.Multer.File, section: string, body: any): Promise<import("./section-logo.service").SectionLogoSettings>;
    updateSectionLogoConfig(req: RequestWithUser, section: string, config: Partial<SectionLogoConfig>): Promise<SectionLogoConfig>;
    removeSectionLogo(req: RequestWithUser, section: string): Promise<{
        success: boolean;
    }>;
    validateSectionLogoConfig(req: RequestWithUser): Promise<{
        compliant: boolean;
        missing: string[];
        recommendations: string[];
    }>;
}
export {};
