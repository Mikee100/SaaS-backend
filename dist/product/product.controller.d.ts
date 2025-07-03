import { ProductService } from './product.service';
export declare class ProductController {
    private readonly productService;
    constructor(productService: ProductService);
    findAll(req: any): Promise<{
        id: string;
        name: string;
        sku: string;
        price: number;
        description: string | null;
        stock: number;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    create(body: any, req: any): Promise<{
        id: string;
        name: string;
        sku: string;
        price: number;
        description: string | null;
        stock: number;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: string, body: any, req: any): Promise<import(".prisma/client").Prisma.BatchPayload>;
    remove(id: string, req: any): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
