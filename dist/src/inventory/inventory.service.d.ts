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
    findAllByTenant(tenantId: string): Promise<({
        branch: {
            id: string;
            name: string;
            createdAt: Date;
            tenantId: string;
            updatedAt: Date;
            email: string | null;
            isActive: boolean;
            address: string | null;
            city: string | null;
            country: string | null;
            postalCode: string | null;
            state: string | null;
            isMainBranch: boolean;
            phone: string | null;
        } | null;
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
    createInventory(dto: CreateInventoryDto, tenantId: string, actorUserId?: string, ip?: string): Promise<any>;
    updateInventory(id: string, dto: UpdateInventoryDto, tenantId: string, actorUserId?: string, ip?: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    deleteInventory(id: string, tenantId: string, actorUserId?: string, ip?: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
