import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './create-inventory.dto';
import { UpdateInventoryDto } from './update-inventory.dto';
export declare class InventoryController {
    private readonly inventoryService;
    constructor(inventoryService: InventoryService);
    findAll(req: any): Promise<({
        product: {
            id: string;
            tenantId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            sku: string;
            price: number;
            description: string | null;
            stock: number;
        };
    } & {
        id: string;
        productId: string;
        quantity: number;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    create(req: any, dto: CreateInventoryDto): Promise<{
        id: string;
        productId: string;
        quantity: number;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(req: any, id: string, dto: UpdateInventoryDto): Promise<import(".prisma/client").Prisma.BatchPayload>;
    remove(req: any, id: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
