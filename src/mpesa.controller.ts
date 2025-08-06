import { Controller, Post, Body, Res, Req, Get, Param, Delete } from '@nestjs/common';
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

  @Post('initiate')
  async initiateMpesa(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    let { phoneNumber, amount, saleData } = body;
    
    // Validate amount
    amount = parseFloat(amount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid amount. Must be a positive number.' 
      });
    }
    if (amount < 10) {
      return res.status(400).json({ 
        success: false,
        error: 'Minimum amount is 10 KES' 
      });
    }
    amount = Math.floor(amount);

    // Validate phone number
    if (!phoneNumber || !/^(07|2547|25407|\+2547)\d{8}$/.test(phoneNumber)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid phone number format. Use format: 07XXXXXXXX, 2547XXXXXXXX, or +2547XXXXXXXX' 
      });
    }
    phoneNumber = phoneNumber.replace(/^0/, '254').replace(/^\+/, '');

    // M-Pesa configuration
    const consumerKey = process.env.MPESA_CONSUMER_KEY || 'JFvBXWMm0yPfiDwTWNPbc2TodFikv8VOBcIhDQ1xbRIBr7TE';
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET || 'Q16rZBLRjCN1VXaBMmzInA3QpGX0MXidMYY0EUweif6PsvbsUQ8GLBLiqZHaebk9';
    const shortCode = process.env.MPESA_SHORTCODE || '174379';
    const passkey = process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
    
    // For M-Pesa sandbox, we need a publicly accessible callback URL
    // You can use ngrok: ngrok http 3001
    // Or set MPESA_CALLBACK_URL environment variable to your public URL
    let callbackURL = process.env.MPESA_CALLBACK_URL;
    if (!callbackURL) {
      // For development, you can use ngrok or a public webhook service
      // Replace this with your actual public URL
      callbackURL = 'https://webhook.site/your-unique-url';
      
      // If you're using ngrok, it would be something like:
      // callbackURL = 'https://your-ngrok-url.ngrok.io/mpesa/webhook';
      
      console.warn('⚠️  M-Pesa Callback URL not set. Using default webhook.site URL.');
      console.warn('   For production, set MPESA_CALLBACK_URL environment variable.');
      console.warn('   For development, use ngrok: ngrok http 3001');
      
      // For testing purposes, use a working webhook URL
      // You can get a unique URL from https://webhook.site/
      callbackURL = 'https://webhook.site/abc123def456'; // Replace with your actual webhook URL
    }

    // Generate timestamp and password
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
      // Get access token
      const tokenResponse = await axios.get(
        'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
        {
          auth: {
            username: consumerKey,
            password: consumerSecret,
          },
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const accessToken = tokenResponse.data.access_token;

      // Initiate STK push
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
          },
          timeout: 30000
        }
      );

      // Save transaction as pending
      const userId = (req as any).user?.userId || undefined;
      const transaction = await this.mpesaService.createTransaction({
        userId,
        phoneNumber,
        amount,
        status: 'pending',
        merchantRequestId: stkResponse.data.MerchantRequestID,
        checkoutRequestId: stkResponse.data.CheckoutRequestID,
        message: stkResponse.data.ResponseDescription,
        saleData: saleData || null,
      });

      return res.status(200).json({
        success: true,
        message: 'Payment request initiated successfully',
        data: {
          ...stkResponse.data,
          transactionId: transaction.id,
          checkoutRequestId: transaction.checkoutRequestId
        }
      });

    } catch (error: any) {
      console.error('M-Pesa API Error:', {
        request: error.config?.data,
        response: error.response?.data,
        message: error.message,
        status: error.response?.status
      });

      const errorMessage = error.response?.data?.errorMessage || 
                         error.response?.data?.message || 
                         error.message ||
                         'Failed to process payment';

      // Handle specific M-Pesa errors
      if (error.response?.data?.errorCode === '400.002.02') {
        return res.status(400).json({
          success: false,
          error: 'Invalid Callback URL. Please set MPESA_CALLBACK_URL environment variable to a publicly accessible URL.',
          code: 'INVALID_CALLBACK_URL',
          suggestion: 'Use ngrok (ngrok http 3001) or set a public webhook URL'
        });
      }

      return res.status(error.response?.status || 500).json({
        success: false,
        error: errorMessage,
        code: error.response?.data?.errorCode || 'UNKNOWN_ERROR'
      });
    }
  }

  @Post('webhook')
  async mpesaWebhook(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    console.log('M-Pesa Webhook received:', JSON.stringify(body, null, 2));
    
    try {
      const result = body.Body?.stkCallback;
      if (!result) {
        console.error('Invalid webhook payload:', body);
        return res.status(400).json({ error: 'Invalid webhook payload' });
      }

      const checkoutRequestId = result.CheckoutRequestID;
      const status = result.ResultCode === 0 ? 'success' : 'failed';
      let mpesaReceipt = undefined;
      let message = result.ResultDesc;
      let responseCode = String(result.ResultCode);
      let responseDesc = result.ResultDesc;

      // Extract receipt number if successful
      if (status === 'success' && result.CallbackMetadata) {
        const receiptItem = result.CallbackMetadata.Item.find((i: any) => i.Name === 'MpesaReceiptNumber');
        mpesaReceipt = receiptItem ? receiptItem.Value : undefined;
      }

      // Update transaction status
      await this.mpesaService.updateTransaction(checkoutRequestId, {
        status,
        mpesaReceipt,
        responseCode,
        responseDesc,
        message,
      });

      // Create Sale if payment is successful and no Sale exists
      if (status === 'success') {
        const mpesaTx = await this.mpesaService.getTransactionByCheckoutId(checkoutRequestId);
        
        if (mpesaTx && !mpesaTx.sale && mpesaTx.saleData) {
          const saleData = mpesaTx.saleData as any;
          
          try {
            // Get tenantId from user context or saleData
            const tenantId = (req as any).user?.tenantId || saleData.tenantId;
            const userId = (req as any).user?.id || saleData.userId;
            
            if (!tenantId || !userId) {
              console.error('Missing tenantId or userId for sale creation');
              await this.mpesaService.updateTransaction(checkoutRequestId, {
                status: 'failed',
                message: 'Missing tenant or user information',
              });
              return res.status(400).json({ error: 'Missing tenant or user information' });
            }
            
            await this.salesService.createSale({
              items: saleData.items,
              paymentMethod: 'mpesa',
              amountReceived: mpesaTx.amount,
              customerName: saleData.customerName,
              customerPhone: saleData.customerPhone,
              mpesaTransactionId: mpesaTx.id,
              idempotencyKey: `mpesa_${mpesaTx.id}`,
            }, tenantId, userId);
            
            console.log('Sale created successfully for M-Pesa transaction:', mpesaTx.id);
          } catch (err) {
            console.error('Failed to create sale for M-Pesa transaction:', err);
            
            // Mark transaction as failed due to stock issues
            await this.mpesaService.updateTransaction(checkoutRequestId, {
              status: 'stock_unavailable',
              message: 'Stock unavailable for one or more items',
            });
            
            return res.status(409).json({ 
              error: 'Stock unavailable for one or more items' 
            });
          }
        }
      }

      return res.status(200).json({ received: true });
    } catch (err) {
      console.error('Webhook processing error:', err);
      return res.status(500).json({ error: 'Failed to process webhook' });
    }
  }

  @Get('status/:checkoutRequestId')
  async getTransactionStatus(@Param('checkoutRequestId') checkoutRequestId: string) {
    const transaction = await this.mpesaService.getTransactionByCheckoutId(checkoutRequestId);
    
    if (!transaction) {
      return { error: 'Transaction not found' };
    }

    return {
      success: true,
      data: transaction
    };
  }

  @Get('transaction/:id')
  async getTransactionById(@Param('id') id: string) {
    const transaction = await this.mpesaService.getTransactionById(id);
    
    if (!transaction) {
      return { error: 'Transaction not found' };
    }

    return {
      success: true,
      data: transaction
    };
  }

  @Get('user/:userId')
  async getUserTransactions(@Param('userId') userId: string, @Req() req: Request) {
    const transactions = await this.mpesaService.getTransactionsByUserId(userId);
    
    return {
      success: true,
      data: transactions
    };
  }

  @Get('tenant/:tenantId')
  async getTenantTransactions(@Param('tenantId') tenantId: string) {
    const transactions = await this.mpesaService.getTransactionsByTenant(tenantId);
    
    return {
      success: true,
      data: transactions
    };
  }

  @Get('stats')
  async getTransactionStats(@Req() req: Request) {
    const stats = await this.mpesaService.getTransactionStats();
    
    return {
      success: true,
      data: stats
    };
  }

  @Delete('cancel/:checkoutRequestId')
  async cancelTransaction(@Param('checkoutRequestId') checkoutRequestId: string) {
    await this.mpesaService.cancelTransaction(checkoutRequestId);
    
    return {
      success: true,
      message: 'Transaction cancelled successfully'
    };
  }

  @Get('pending')
  async getPendingTransactions() {
    const transactions = await this.mpesaService.getPendingTransactions();
    
    return {
      success: true,
      data: transactions
    };
  }

  @Post('cleanup')
  async cleanupOldTransactions() {
    const result = await this.mpesaService.cleanupOldPendingTransactions();
    
    return {
      success: true,
      message: `Cleaned up ${result.count} old pending transactions`
    };
  }
} 