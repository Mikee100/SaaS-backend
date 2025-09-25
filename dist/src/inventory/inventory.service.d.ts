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
    findAllByBranch(tenantId: string, branchId: string): Promise<({
        product: {
            id: string;
            name: string;
            sku: string;
            price: number;
            description: string | null;
            tenantId: string;
            createdAt: Date;
            updatedAt: Date;
            stock: number;
            customFields: import("@prisma/client/runtime/library").JsonValue | null;
            branchId: string | null;
            cost: number;
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
    findAllByTenant(tenantId: string): Promise<({
        product: {
            id: string;
            name: string;
            sku: string;
            price: number;
            description: string | null;
            tenantId: string;
            createdAt: Date;
            updatedAt: Date;
            stock: number;
            customFields: import("@prisma/client/runtime/library").JsonValue | null;
            branchId: string | null;
            cost: number;
        };
        branch: {
            id: string;
            name: string;
            tenantId: string;
            createdAt: Date;
            updatedAt: Date;
            email: string | null;
            address: string | null;
            city: string | null;
            country: string | null;
            postalCode: string | null;
            state: string | null;
            status: string | null;
            logo: string | null;
            customField: string | null;
            manager: string | null;
            openingHours: string | null;
            phone: string | null;
            street: string | null;
        } | null;
    } & {
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        branchId: string | null;
        productId: string;
        quantity: number;
    })[]>;
    createInventory(dto: CreateInventoryDto, tenantId: string, actorUserId?: string, ip?: string): Promise<any>;
    updateInventory(id: string, dto: UpdateInventoryDto, tenantId: string, actorUserId?: string, ip?: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    deleteInventory(id: string, tenantId: string, actorUserId?: string, ip?: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
