import { CustomerService } from '../services/customer.service';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';
export declare class CustomerController {
    private readonly customerService;
    constructor(customerService: CustomerService);
    create(req: any, createCustomerDto: CreateCustomerDto): Promise<any>;
    findAll(req: any, page?: number, limit?: number, search?: string): Promise<{
        data: any[];
        meta: any;
    }>;
    getStats(req: any): Promise<{
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
    findOne(req: any, id: string): Promise<any>;
    update(req: any, id: string, updateCustomerDto: UpdateCustomerDto): Promise<any>;
    remove(req: any, id: string): Promise<void>;
}
