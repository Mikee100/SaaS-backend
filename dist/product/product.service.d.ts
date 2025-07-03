import { PrismaService } from '../prisma.service';
export declare class ProductService {
    private prisma;
    constructor(prisma: PrismaService);
    findAllByTenant(tenantId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        sku: string;
        price: number;
        description: string | null;
        stock: number;
    }[]>;
    createProduct(data: {
        name: string;
        sku: string;
        price: number;
        description?: string;
        tenantId: string;
    }): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        sku: string;
        price: number;
        description: string | null;
        stock: number;
    }>;
    updateProduct(id: string, data: any, tenantId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    deleteProduct(id: string, tenantId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
