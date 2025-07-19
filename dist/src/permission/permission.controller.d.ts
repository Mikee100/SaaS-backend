import { PrismaService } from '../prisma.service';
export declare class PermissionController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getAll(): Promise<{
        id: string;
        key: string;
        description: string | null;
    }[]>;
}
