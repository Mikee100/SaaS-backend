import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './create-inventory.dto';
import { UpdateInventoryDto } from './update-inventory.dto';
export declare class InventoryController {
    private readonly inventoryService;
    constructor(inventoryService: InventoryService);
    findAll(req: any): Promise<({
        product: {
            id: string;
            description: string | null;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            sku: string;
            price: number;
            stock: number;
            customFields: import("@prisma/client/runtime/library").JsonValue | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        productId: string;
        quantity: number;
    })[]>;
    create(req: any, dto: CreateInventoryDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        productId: string;
        quantity: number;
    }>;
    update(req: any, id: string, dto: UpdateInventoryDto): Promise<import(".prisma/client").Prisma.BatchPayload>;
    remove(req: any, id: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
