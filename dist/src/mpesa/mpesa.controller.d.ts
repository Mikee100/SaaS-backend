import { Response } from 'express';
export declare class MpesaController {
    initiatePayment(body: any, res: Response): Promise<Response<any, Record<string, any>>>;
}
