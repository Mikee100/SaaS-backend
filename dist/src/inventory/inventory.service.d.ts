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
            createdAt: Date;
            name: string;
            updatedAt: Date;
            tenantId: string;
            branchId: string | null;
            description: string | null;
            sku: string;
            price: number;
            cost: number;
            stock: number;
            customFields: import("@prisma/client/runtime/library").JsonValue | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        branchId: string | null;
        productId: string;
        quantity: number;
    })[]>;
    findAllByTenant(tenantId: string): Promise<({
        branch: {
            id: string;
            createdAt: Date;
            name: string;
            email: string | null;
            updatedAt: Date;
            tenantId: string;
            status: string | null;
            address: string | null;
            city: string | null;
            state: string | null;
            country: string | null;
            postalCode: string | null;
            street: string | null;
            phone: string | null;
            manager: string | null;
            openingHours: string | null;
            logo: string | null;
            customField: string | null;
        } | null;
        product: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            tenantId: string;
            branchId: string | null;
            description: string | null;
            sku: string;
            price: number;
            cost: number;
            stock: number;
            customFields: import("@prisma/client/runtime/library").JsonValue | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        branchId: string | null;
        productId: string;
        quantity: number;
    })[]>;
    createInventory(dto: CreateInventoryDto, tenantId: string, actorUserId?: string, ip?: string): Promise<any>;
    updateInventory(id: string, dto: UpdateInventoryDto, tenantId: string, actorUserId?: string, ip?: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    deleteInventory(id: string, tenantId: string, actorUserId?: string, ip?: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
