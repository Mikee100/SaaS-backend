import { Response } from 'express';
import { MpesaService } from './mpesa.service';
import { SalesService } from '../sales/sales.service';
export declare class MpesaController {
    private readonly mpesaService;
    private readonly salesService;
    constructor(mpesaService: MpesaService, salesService: SalesService);
    initiatePayment(body: any, res: Response): Promise<Response<any, Record<string, any>>>;
    mpesaWebhook(body: any, res: Response): Promise<Response<any, Record<string, any>>>;
    getConfig(tenantId: string, res: Response): Promise<Response<any, Record<string, any>>>;
    updateConfig(body: any, res: Response): Promise<Response<any, Record<string, any>>>;
    getByCheckoutId(checkoutRequestId: string, res: Response): Promise<Response<any, Record<string, any>>>;
}
