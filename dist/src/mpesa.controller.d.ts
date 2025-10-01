import { Response, Request } from 'express';
import { MpesaService } from './mpesa.service';
import { SalesService } from './sales/sales.service';
import { PrismaService } from './prisma.service';
export declare class MpesaController {
    private mpesaService;
    private salesService;
    private prisma;
    constructor(mpesaService: MpesaService, salesService: SalesService, prisma: PrismaService);
    initiateMpesa(body: any, req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    mpesaWebhook(body: any, res: Response): Promise<Response<any, Record<string, any>>>;
    getByCheckoutId(checkoutRequestId: string): Promise<any>;
}
