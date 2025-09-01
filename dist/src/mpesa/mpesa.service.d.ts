export declare class MpesaService {
    initiatePayment(dto: any): Promise<{
        success: boolean;
        message: string;
        data: any;
    }>;
    handleCallback(dto: any): Promise<{
        success: boolean;
        message: string;
        data: any;
    }>;
    getPaymentStatus(transactionId: string): Promise<{
        success: boolean;
        message: string;
        transactionId: string;
        status: string;
    }>;
    simulatePayment(dto: any): Promise<{
        success: boolean;
        message: string;
        data: any;
    }>;
}
