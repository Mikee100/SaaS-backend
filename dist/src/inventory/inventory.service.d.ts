import { PrismaService } from '../prisma.service';
import { CreateInventoryDto } from './create-inventory.dto';
import { UpdateInventoryDto } from './update-inventory.dto';
import { AuditLogService } from '../audit-log.service';
import { RealtimeGateway } from '../realtime.gateway';
export declare class InventoryService {
    private prisma;
    private auditLogService;
    private realtimeGateway;
    constructor(prisma: PrismaService, auditLogService: AuditLogService, realtimeGateway: RealtimeGateway);
    findAllByTenant(tenantId: string): Promise<({
        product: {
            id: string;
            description: string | null;
            name: string;
            sku: string;
            price: number;
            stock: number;
            tenantId: string;
            createdAt: Date;
            updatedAt: Date;
            customFields: import("@prisma/client/runtime/library").JsonValue | null;
        };
    } & {
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        productId: string;
        quantity: number;
    })[]>;
    createInventory(dto: CreateInventoryDto, tenantId: string, actorUserId?: string, ip?: string): Promise<{
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        productId: string;
        quantity: number;
    }>;
    updateInventory(id: string, dto: UpdateInventoryDto, tenantId: string, actorUserId?: string, ip?: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    deleteInventory(id: string, tenantId: string, actorUserId?: string, ip?: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
