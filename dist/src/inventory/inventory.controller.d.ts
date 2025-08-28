import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './create-inventory.dto';
import { UpdateInventoryDto } from './update-inventory.dto';
export declare class InventoryController {
    private readonly inventoryService;
    constructor(inventoryService: InventoryService);
    findAll(req: any): Promise<({
        product: {
            description: string | null;
            id: string;
            tenantId: string;
            branchId: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            sku: string;
            price: number;
            cost: number;
            stock: number;
            customFields: import("@prisma/client/runtime/library").JsonValue | null;
        };
    } & {
        id: string;
        productId: string;
        quantity: number;
        tenantId: string;
        branchId: string | null;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    create(req: any, dto: CreateInventoryDto): Promise<{
        id: string;
        productId: string;
        quantity: number;
        tenantId: string;
        branchId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(req: any, id: string, dto: UpdateInventoryDto): Promise<import(".prisma/client").Prisma.BatchPayload>;
    remove(req: any, id: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
