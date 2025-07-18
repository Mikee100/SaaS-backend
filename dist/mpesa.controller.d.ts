import { Response, Request } from 'express';
import { MpesaService } from './mpesa.service';
export declare class MpesaController {
    private mpesaService;
    constructor(mpesaService: MpesaService);
    initiateMpesa(body: any, req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    mpesaWebhook(body: any, res: Response): Promise<Response<any, Record<string, any>>>;
    getByCheckoutId(checkoutRequestId: string): Promise<{
        id: string;
        userId: string | null;
        phoneNumber: string;
        amount: number;
        status: string;
        mpesaReceipt: string | null;
        merchantRequestId: string | null;
        checkoutRequestId: string | null;
        responseCode: string | null;
        responseDesc: string | null;
        message: string | null;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
}
