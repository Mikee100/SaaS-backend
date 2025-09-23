import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './create-inventory.dto';
import { UpdateInventoryDto } from './update-inventory.dto';
export declare class InventoryController {
    private readonly inventoryService;
    constructor(inventoryService: InventoryService);
    findAll(req: any): Promise<({
        product: {
            id: string;
            name: string;
            sku: string;
            price: number;
            cost: number;
            description: string | null;
            stock: number;
            tenantId: string;
            createdAt: Date;
            updatedAt: Date;
            customFields: import("@prisma/client/runtime/library").JsonValue | null;
            branchId: string | null;
        };
    } & {
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        branchId: string | null;
        productId: string;
        quantity: number;
    })[]>;
    create(req: any, dto: CreateInventoryDto): Promise<any>;
    update(req: any, id: string, dto: UpdateInventoryDto): Promise<import(".prisma/client").Prisma.BatchPayload>;
    remove(req: any, id: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
