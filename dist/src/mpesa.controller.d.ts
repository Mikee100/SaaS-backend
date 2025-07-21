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
    getByCheckoutId(checkoutRequestId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        amount: number;
        phoneNumber: string;
        status: string;
        mpesaReceipt: string | null;
        merchantRequestId: string | null;
        checkoutRequestId: string | null;
        responseCode: string | null;
        responseDesc: string | null;
        message: string | null;
        saleData: import("@prisma/client/runtime/library").JsonValue | null;
    } | null>;
}
