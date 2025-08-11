import { PaymentService } from './payment.service';
export declare class PaymentController {
    private readonly paymentService;
    constructor(paymentService: PaymentService);
    processPayment(body: {
        amount: number;
        currency: string;
        description: string;
        metadata?: Record<string, any>;
    }, req: any): Promise<{
        success: boolean;
        paymentId: string;
        clientSecret: string;
        amount: number;
        currency: string;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        paymentId?: undefined;
        clientSecret?: undefined;
        amount?: undefined;
        currency?: undefined;
    }>;
    confirmPayment(body: {
        paymentId: string;
        paymentIntentId: string;
    }, req: any): Promise<{
        success: boolean;
        paymentId: string;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        paymentId?: undefined;
    }>;
    generateInvoice(body: {
        subscriptionId: string;
        amount: number;
        currency?: string;
    }, req: any): Promise<{
        success: boolean;
        invoice: {
            id: string;
            tenantId: string;
            subscriptionId: string | null;
            amount: number;
            currency: string;
            status: string;
            dueDate: Date;
            paidAt: Date | null;
            description: string | null;
            stripeInvoiceId: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        invoice?: undefined;
    }>;
    getPaymentAnalytics(period: "month" | "quarter" | "year" | undefined, req: any): Promise<{
        success: boolean;
        analytics: {
            period: "month" | "quarter" | "year";
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
        };
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        analytics?: undefined;
    }>;
    getPaymentHistory(limit: number | undefined, offset: number | undefined, req: any): Promise<{
        success: boolean;
        history: {
            id: string;
            amount: number;
            currency: string;
            status: string;
            description: string;
            createdAt: string;
            type: string;
        }[];
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        history?: undefined;
    }>;
    refundPayment(body: {
        paymentId: string;
        amount?: number;
        reason?: string;
    }, req: any): Promise<{
        success: boolean;
        refundId: string;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        refundId?: undefined;
    }>;
    getPaymentMethods(req: any): Promise<{
        success: boolean;
        methods: {
            id: string;
            type: string;
            card: {
                brand: string;
                last4: string;
                expMonth: number;
                expYear: number;
            };
        }[];
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        methods?: undefined;
    }>;
    addPaymentMethod(body: {
        paymentMethodId: string;
    }, req: any): Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
    }>;
    removePaymentMethod(body: {
        paymentMethodId: string;
    }, req: any): Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
    }>;
    getPaymentStatus(paymentId: string, req: any): Promise<{
        success: boolean;
        paymentId: string;
        status: string;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        paymentId?: undefined;
        status?: undefined;
    }>;
}
