import { Controller, Post, Body, Res, Req, Get, Param } from '@nestjs/common';
import axios from 'axios';
import { Response, Request } from 'express';
import { MpesaService } from './mpesa.service';
import { SalesService } from './sales/sales.service';
import { PrismaService } from './prisma.service';

@Controller('mpesa')
export class MpesaController {
  constructor(
    private mpesaService: MpesaService,
    private salesService: SalesService,
    private prisma: PrismaService,
  ) {}

  @Post()
  async initiateMpesa(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    let { phoneNumber, amount, saleData } = body;
    amount = parseFloat(amount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount. Must be a positive number.' });
    }
    if (amount < 10) {
      return res.status(400).json({ error: 'Minimum amount is 10 KES' });
    }
    amount = Math.floor(amount);
    const consumerKey = process.env.MPESA_CONSUMER_KEY || 'JFvBXWMm0yPfiDwTWNPbc2TodFikv8VOBcIhDQ1xbRIBr7TE';
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET || 'Q16rZBLRjCN1VXaBMmzInA3QpGX0MXidMYY0EUweif6PsvbsUQ8GLBLiqZHaebk9';
    const shortCode = process.env.MPESA_SHORTCODE || '174379';
    const passkey = process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
    const callbackURL = process.env.MPESA_CALLBACK_URL || 'https://mydomain.com/path';
    if (!phoneNumber || !/^(07|2547|25407|\+2547)\d{8}$/.test(phoneNumber)) {
      return res.status(400).json({ error: 'Invalid phone number format. Use format: 07XXXXXXXX, 2547XXXXXXXX, or +2547XXXXXXXX' });
    }
    phoneNumber = phoneNumber.replace(/^0/, '254').replace(/^\+/, '');
    const now = new Date();
    const timestamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0')
    ].join('');
    const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');
    try {
      const tokenResponse = await axios.get(
        'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
        {
          auth: {
            username: consumerKey,
            password: consumerSecret,
          },
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      const accessToken = tokenResponse.data.access_token;
      const stkResponse = await axios.post(
        'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
        {
          BusinessShortCode: shortCode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: amount,
          PartyA: phoneNumber,
          PartyB: shortCode,
          PhoneNumber: phoneNumber,
          CallBackURL: callbackURL,
          AccountReference: 'SaaSPlatform',
          TransactionDesc: 'POS Payment',
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }
        }
      );
      // Save transaction as pending
      const userId = (req as any).user?.userId || undefined;
      await this.mpesaService.createTransaction({
  userId,
  phoneNumber,
  amount,
  status: 'pending',
  merchantRequestID: stkResponse.data.MerchantRequestID,
  checkoutRequestID: stkResponse.data.CheckoutRequestID,
  message: stkResponse.data.ResponseDescription,
  saleData: saleData || null, // Store sale/cart data if provided
  tenantId: body.tenantId || '',
      });
      return res.status(200).json({
        success: true,
        message: 'Payment request initiated successfully',
        data: stkResponse.data
      });
    } catch (error: any) {
      console.error('M-Pesa API Error:', {
        request: error.config?.data,
        response: error.response?.data,
        message: error.message
      });
      const errorMessage = error.response?.data?.errorMessage || 
                         error.response?.data?.message || 
                         'Failed to process payment';
      return res.status(error.response?.status || 500).json({
        success: false,
        error: errorMessage,
        code: error.response?.data?.errorCode
      });
    }
  }

  @Post('webhook')
  async mpesaWebhook(@Body() body: any, @Res() res: Response) {
  // ...existing code...
    // Parse webhook and update transaction
    try {
      const result = body.Body?.stkCallback;
      if (!result) return res.status(400).json({ error: 'Invalid webhook payload' });
      const checkoutRequestId = result.CheckoutRequestID;
      const status = result.ResultCode === 0 ? 'success' : 'failed';
      let mpesaReceipt = undefined;
      let message = result.ResultDesc;
      let responseCode = String(result.ResultCode);
      let responseDesc = result.ResultDesc;
      if (status === 'success' && result.CallbackMetadata) {
        const receiptItem = result.CallbackMetadata.Item.find((i: any) => i.Name === 'MpesaReceiptNumber');
        mpesaReceipt = receiptItem ? receiptItem.Value : undefined;
      }
      await this.mpesaService.updateTransaction(checkoutRequestId, {
        status,
        mpesaReceipt,
        responseCode,
        responseDesc,
        message,
      });
      // Create Sale if payment is successful and no Sale exists
      if (status === 'success') {
        const mpesaTx = await this.mpesaService.prisma.mpesaTransaction.findFirst({
          where: { checkoutRequestID: checkoutRequestId },
          include: { sale: true }
        }) as any;
        if (mpesaTx && !mpesaTx.sale && mpesaTx.saleData) {
          const saleData = mpesaTx.saleData;
          // Use SalesService to handle inventory and sale creation
          try {
            await this.salesService.createSale({
              items: saleData.items,
              paymentMethod: 'mpesa',
              amountReceived: mpesaTx.amount,
              customerName: saleData.customerName,
              customerPhone: saleData.customerPhone,
              mpesaTransactionId: mpesaTx.id,
              idempotencyKey: `mpesa_${mpesaTx.id}`,
            }, saleData.tenantId, saleData.userId);
          } catch (err) {
            // If inventory is insufficient, mark transaction as failed
            await this.mpesaService.updateTransaction(checkoutRequestId, {
              status: 'stock_unavailable',
              message: 'Stock unavailable for one or more items',
            });
            return res.status(409).json({ error: 'Stock unavailable for one or more items' });
          }
        }
      }
      return res.status(200).json({ received: true });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to process webhook' });
    }
  }

  @Get('by-checkout-id/:checkoutRequestId')
  async getByCheckoutId(@Param('checkoutRequestId') checkoutRequestId: string) {
  return this.mpesaService.prisma.mpesaTransaction.findFirst({ where: { checkoutRequestID: checkoutRequestId } });
  }
} 
