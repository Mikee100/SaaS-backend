export declare class MpesaController {
    initiatePayment(body: any): Promise<{
        success: boolean;
        message: string;
        data: any;
    }>;
}
