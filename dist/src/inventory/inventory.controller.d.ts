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
            description: string | null;
            createdAt: Date;
            tenantId: string;
            updatedAt: Date;
            branchId: string | null;
            isActive: boolean;
            sku: string;
            price: number;
            cost: number | null;
            barcode: string | null;
            quantity: number;
            minStock: number;
            categoryId: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        tenantId: string;
        updatedAt: Date;
        branchId: string | null;
        quantity: number;
        productId: string;
    })[]>;
    create(req: any, dto: CreateInventoryDto): Promise<any>;
    update(req: any, id: string, dto: UpdateInventoryDto): Promise<import(".prisma/client").Prisma.BatchPayload>;
    remove(req: any, id: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
