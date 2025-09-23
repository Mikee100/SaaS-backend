import { PrismaService } from '../prisma.service';
import { StripeService } from './stripe.service';
import { AuditLogService } from '../audit-log.service';
export declare class PaymentService {
    private readonly prisma;
    private readonly stripeService;
    private readonly auditLogService;
    private readonly logger;
    constructor(prisma: PrismaService, stripeService: StripeService, auditLogService: AuditLogService);
    processOneTimePayment(tenantId: string, amount: number, currency: string, description: string, metadata?: Record<string, any>): Promise<{
        paymentId: string;
        clientSecret: string;
        amount: number;
        currency: string;
    }>;
    confirmPayment(paymentId: string, paymentIntentId: string): Promise<{
        success: boolean;
        paymentId: string;
    }>;
    generateInvoice(subscriptionId: string, amount: number, currency?: string): Promise<{
        number: string;
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        amount: number;
        status: string;
        dueDate: Date | null;
        paidAt: Date | null;
        subscriptionId: string | null;
    }>;
    getPaymentAnalytics(tenantId: string, period?: 'month' | 'quarter' | 'year'): Promise<{
        period: "month" | "year" | "quarter";
        totalRevenue: number;
        paymentCount: number;
        averagePayment: number;
        paymentMethods: {
            paymentMethod: string;
            _count: {
                paymentMethod: number;
            };
            _sum: {
                amount: number;
            };
        }[];
        currency: string;
    }>;
    getPaymentHistory(tenantId: string, limit?: number, offset?: number): Promise<{
        id: string;
        amount: number;
        currency: string;
        status: string;
        description: string;
        createdAt: string;
        type: string;
    }[]>;
    refundPayment(paymentId: string, amount?: number, reason?: string): Promise<{
        success: boolean;
        refundId: string;
    }>;
    getPaymentMethods(tenantId: string): Promise<{
        id: string;
        type: string;
        card: {
            brand: string;
            last4: string;
            expMonth: number;
            expYear: number;
        };
    }[]>;
    addPaymentMethod(tenantId: string, paymentMethodId: string): Promise<{
        success: boolean;
    }>;
    removePaymentMethod(tenantId: string, paymentMethodId: string): Promise<{
        success: boolean;
    }>;
}
