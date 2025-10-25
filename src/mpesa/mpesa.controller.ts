import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
  Get,
  Put,
  Param,
  Query,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { MpesaService } from './mpesa.service';
import { SalesService } from '../sales/sales.service';
import { CreateSaleDto } from '../sales/create-sale.dto';

@Controller('mpesa')
export class MpesaController {
  constructor(
    private readonly mpesaService: MpesaService,
    private readonly salesService: SalesService,
  ) {}

  @Post('initiate')
  async initiatePayment(@Body() body: any, @Res() res: Response) {
    try {
      const { phoneNumber, amount, reference, transactionDesc, tenantId } =
        body;

      // Get tenantId from authenticated user (assuming req.user has tenantId)
      // For now, require tenantId in body; in production, extract from JWT
      if (!tenantId) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ error: 'Tenant ID required' });
      }

      // Initiate STK Push using service
      const stkData = await this.mpesaService.initiateStkPush(
        tenantId,
        phoneNumber,
        amount,
        reference,
        transactionDesc,
      );

      // Create transaction record
      await this.mpesaService.createTransaction({
        phoneNumber,
        amount,
        status: 'pending',
        merchantRequestID: stkData.MerchantRequestID,
        checkoutRequestID: stkData.CheckoutRequestID,
        tenantId,
        saleData: body.saleData, // If initiating from sale
      });

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Payment request initiated successfully',
        data: stkData,
      });
    } catch (error) {
      console.error('M-Pesa Initiation Error:', error.message);
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        error: error.message,
      });
    }
  }

  @Post('webhook')
  async mpesaWebhook(@Body() body: any, @Res() res: Response) {
    try {
      const { Body: callbackBody } = body;
      const result = callbackBody.stkCallback;

      const checkoutRequestId = result.CheckoutRequestID;
      const status = result.ResultCode === 0 ? 'success' : 'failed';
      let mpesaReceipt = undefined;
      const message = result.ResultDesc;

      if (status === 'success') {
        const callbackMetadata = result.CallbackMetadata.Item;
        const receiptItem = callbackMetadata.find(
          (item: any) => item.Name === 'MpesaReceiptNumber',
        );
        mpesaReceipt = receiptItem ? receiptItem.Value : undefined;
      }

      // Update transaction
      await this.mpesaService.updateTransaction(checkoutRequestId, {
        status,
        mpesaReceipt,
        responseCode: result.ResultCode.toString(),
        responseDesc: message,
      });

      // If success and has saleData, process sale
      if (status === 'success') {
        const mpesaTx =
          await this.mpesaService.prisma.mpesaTransaction.findFirst({
            where: { checkoutRequestID: checkoutRequestId },
          });

        if (mpesaTx && mpesaTx.saleData) {
          const saleData = mpesaTx.saleData as any; // Cast to any for now
          // Process sale via SalesService
          await this.salesService.createSale(
            {
              items: saleData.items,
              paymentMethod: 'mpesa',
              amountReceived: mpesaTx.amount,
              customerName: saleData.customerName,
              customerPhone: saleData.customerPhone,
              mpesaTransactionId: mpesaTx.id,
              idempotencyKey: `mpesa_${mpesaTx.id}`,
            },
            mpesaTx.tenantId,
            mpesaTx.userId || '',
          );
        }
      }

      return res.status(HttpStatus.OK).json({ success: true });
    } catch (error) {
      console.error('Webhook Error:', error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ error: 'Webhook processing failed' });
    }
  }

  @Get('config')
  async getConfig(@Query('tenantId') tenantId: string, @Res() res: Response) {
    try {
      const config = await this.mpesaService.getTenantMpesaConfig(
        tenantId,
        false,
      );
      // Return config for both users and admins
      return res.json({
        consumerKey: config.consumerKey,
        consumerSecret: config.consumerSecret,
        shortCode: config.shortCode,
        passkey: config.passkey,
        callbackUrl: config.callbackUrl,
        environment: config.environment,
        isActive: config.isActive,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: error.message });
    }
  }

  @Post('config')
  async updateConfig(@Body() body: any, @Res() res: Response) {
    try {
      const {
        tenantId,
        mpesaConsumerKey,
        mpesaConsumerSecret,
        mpesaShortCode,
        mpesaPasskey,
        mpesaCallbackUrl,
        mpesaIsActive,
        mpesaEnvironment,
      } = body;

      // Validate required fields
      if (
        !mpesaConsumerKey ||
        !mpesaConsumerSecret ||
        !mpesaShortCode ||
        !mpesaPasskey ||
        !mpesaCallbackUrl
      ) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ error: 'All M-Pesa configuration fields are required' });
      }

      // Encrypt sensitive fields
      const encryptedSecret = this.mpesaService['encrypt'](mpesaConsumerSecret);
      const encryptedPasskey = this.mpesaService['encrypt'](mpesaPasskey);

      await this.mpesaService.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          mpesaConsumerKey,
          mpesaConsumerSecret: encryptedSecret,
          mpesaShortCode,
          mpesaPasskey: encryptedPasskey,
          mpesaCallbackUrl,
          mpesaIsActive,
          mpesaEnvironment,
        },
      });

      return res.json({ success: true, message: 'M-Pesa config updated' });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: error.message });
    }
  }

  @Get('transaction/:checkoutRequestId')
  async getByCheckoutId(
    @Param('checkoutRequestId') checkoutRequestId: string,
    @Res() res: Response,
  ) {
    try {
      const transaction =
        await this.mpesaService.prisma.mpesaTransaction.findFirst({
          where: { checkoutRequestID: checkoutRequestId },
        });
      return res.json(transaction);
    } catch (error) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ error: 'Failed to fetch transaction' });
    }
  }
}
