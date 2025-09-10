import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';
import { PrismaService } from 'src/prisma.service';
export declare class CustomerService {
    private prisma;
    constructor(prisma: PrismaService);
    private mapToDto;
    create(tenantId: string, createCustomerDto: CreateCustomerDto): Promise<any>;
    findAll(tenantId: string, page?: number, limit?: number, search?: string): Promise<{
        data: any[];
        meta: any;
    }>;
    findOne(tenantId: string, id: string): Promise<any>;
    update(tenantId: string, id: string, updateCustomerDto: UpdateCustomerDto): Promise<any>;
    remove(tenantId: string, id: string): Promise<void>;
    getCustomerStats(tenantId: string): Promise<{
        totalCustomers: number;
        customerGrowth: number;
        recentCustomers: {
            id: string;
            firstName: string;
            lastName: string;
            email: string | undefined;
            phone: string | undefined;
            address: string | undefined;
            city: string | undefined;
            country: string | undefined;
            postalCode: string | undefined;
            notes: string | undefined;
            createdAt: Date;
            updatedAt: Date;
            totalPurchases: number;
            totalSpent: number;
            loyaltyPoints: number;
        }[];
        topCustomers: unknown;
    }>;
}
