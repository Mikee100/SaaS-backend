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
        userId: string | null;
        phoneNumber: string;
        amount: number;
        status: string;
        merchantRequestId: string | null;
        checkoutRequestID: string | null;
        mpesaReceipt: string | null;
        responseCode: string | null;
        responseDesc: string | null;
        message: string | null;
        saleId: string | null;
        saleData: import("@prisma/client/runtime/library").JsonValue | null;
        transactionId: string | null;
        transactionType: string | null;
        transactionTime: Date | null;
        businessShortCode: string | null;
        billRefNumber: string | null;
        invoiceNumber: string | null;
        orgAccountBalance: string | null;
        thirdPartyTransID: string | null;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
}
