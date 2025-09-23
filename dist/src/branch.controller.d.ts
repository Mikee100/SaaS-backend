import { BranchService } from './branch.service';
export declare class BranchController {
    private readonly branchService;
    constructor(branchService: BranchService);
    create(body: any, req: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        tenantId: string;
        updatedAt: Date;
        email: string | null;
        isActive: boolean;
        address: string | null;
        city: string | null;
        country: string | null;
        postalCode: string | null;
        state: string | null;
        isMainBranch: boolean;
        phone: string | null;
    }>;
    findAll(req: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        tenantId: string;
        updatedAt: Date;
        email: string | null;
        isActive: boolean;
        address: string | null;
        city: string | null;
        country: string | null;
        postalCode: string | null;
        state: string | null;
        isMainBranch: boolean;
        phone: string | null;
    }[]>;
    findOne(id: string, req: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        tenantId: string;
        updatedAt: Date;
        email: string | null;
        isActive: boolean;
        address: string | null;
        city: string | null;
        country: string | null;
        postalCode: string | null;
        state: string | null;
        isMainBranch: boolean;
        phone: string | null;
    } | null>;
    update(id: string, body: any, req: any): Promise<import(".prisma/client").Prisma.BatchPayload>;
    remove(id: string, req: any): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
