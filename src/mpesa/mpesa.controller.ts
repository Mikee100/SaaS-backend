import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
  Get,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { MpesaService } from './mpesa.service';
import { SalesService } from '../sales/sales.service';
import { AuthenticatedRequest } from '../auth/request.types';

interface InitiatePaymentBody {
  phoneNumber?: string;
  amount?: number | string;
  reference?: string;
  transactionDesc?: string;
  tenantId?: string;
  saleData?: unknown;
}

interface MpesaCallbackItem {
  Name?: string;
  Value?: string | number;
}

interface MpesaCallbackBody {
  Body?: {
    stkCallback?: {
      MerchantRequestID?: string;
      CheckoutRequestID?: string;
      ResultCode?: number;
      ResultDesc?: string;
      CallbackMetadata?: {
        Item?: MpesaCallbackItem[];
      };
    };
  };
}

interface MpesaConfigBody {
  tenantId?: string;
  mpesaConsumerKey?: string;
  mpesaConsumerSecret?: string;
  mpesaShortCode?: string;
  mpesaPasskey?: string;
  mpesaCallbackUrl?: string;
  mpesaIsActive?: boolean | string;
  mpesaEnvironment?: string;
}

@Controller('mpesa')
export class MpesaController {
  constructor(
    private readonly mpesaService: MpesaService,
    private readonly salesService: SalesService,
  ) {}

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private getErrorMessage(error: unknown): string {
    if (this.isRecord(error) && typeof error.message === 'string') {
      return error.message;
    }
    return 'Failed to process payment';
  }

  private getNestedErrorData(error: unknown): Record<string, unknown> | null {
    if (!this.isRecord(error) || !this.isRecord(error.response)) {
      return null;
    }
    if (!this.isRecord(error.response.data)) {
      return null;
    }
    return error.response.data;
  }

  private normalizeMpesaStatus(
    status: string,
    message?: string | null,
    mpesaReceipt?: string | null,
    createdAt?: Date | string,
  ):
    | 'pending'
    | 'success'
    | 'failed'
    | 'cancelled'
    | 'timeout'
    | 'stock_unavailable' {
    const normalizedStatus = String(status || '').toLowerCase();
    const normalizedMessage = String(message || '').toLowerCase();
    const hasReceipt = Boolean(String(mpesaReceipt || '').trim());
    const indicatesProcessing =
      normalizedMessage.includes('under processing') ||
      normalizedMessage.includes('being processed') ||
      normalizedMessage.includes('request accepted for processing');

    // M-Pesa receipt is definitive proof of successful payment.
    if (hasReceipt) {
      return 'success';
    }

    // Stale pending payments should not remain pending indefinitely.
    if (normalizedStatus === 'pending' && createdAt) {
      const created = new Date(createdAt);
      const isValidDate = !Number.isNaN(created.getTime());
      if (isValidDate) {
        const ageMs = Date.now() - created.getTime();
        const timeoutMs = 30 * 60 * 1000; // 30 minutes
        if (ageMs > timeoutMs) {
          return 'timeout';
        }
      }
    }

    if (indicatesProcessing && normalizedStatus !== 'pending') {
      return 'pending';
    }

    if (
      normalizedStatus === 'success' ||
      normalizedStatus === 'failed' ||
      normalizedStatus === 'cancelled' ||
      normalizedStatus === 'timeout' ||
      normalizedStatus === 'stock_unavailable' ||
      normalizedStatus === 'pending'
    ) {
      return normalizedStatus;
    }

    return 'pending';
  }

  private normalizeMpesaMessage(
    status: string,
    message?: string | null,
    mpesaReceipt?: string | null,
  ): string | undefined {
    const normalizedStatus = String(status || '').toLowerCase();
    const trimmed = typeof message === 'string' ? message.trim() : '';
    const hasReceipt = Boolean(String(mpesaReceipt || '').trim());

    if (!trimmed) {
      if (normalizedStatus === 'timeout') {
        return 'No callback received in expected time window.';
      }
      return undefined;
    }

    if (normalizedStatus === 'success' || hasReceipt) {
      const lower = trimmed.toLowerCase();
      if (
        lower.includes('under processing') ||
        lower.includes('being processed') ||
        lower.includes('request accepted for processing')
      ) {
        return undefined;
      }
    }

    if (normalizedStatus === 'timeout') {
      const lower = trimmed.toLowerCase();
      if (
        lower.includes('under processing') ||
        lower.includes('being processed') ||
        lower.includes('request accepted for processing')
      ) {
        return 'No callback received in expected time window.';
      }
    }

    return trimmed;
  }

  @Post('initiate')
  @UseGuards(AuthGuard('jwt'))
  async initiatePayment(
    @Body() body: InitiatePaymentBody,
    @Res() res: Response,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const { phoneNumber, amount, reference, transactionDesc, tenantId } =
        body;

      console.log(
        'M-Pesa initiate request received:',
        JSON.stringify(body, null, 2),
      );

      if (!tenantId) {
        console.log('Tenant ID validation failed');
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ error: 'Tenant ID required' });
      }

      const user = req?.user;
      const canInitiate =
        !!user && (user.tenantId === tenantId || user.isSuperadmin === true);
      if (!canInitiate) {
        return res.status(HttpStatus.FORBIDDEN).json({
          error: 'You can only initiate payments for your own tenant.',
        });
      }

      // Validate amount
      const parsedAmount = Number(amount);
      console.log('Parsed amount:', parsedAmount);

      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        console.log('Invalid amount validation failed');
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: 'Invalid amount. Must be a positive number.',
        });
      }
      if (parsedAmount < 10) {
        console.log('Minimum amount validation failed');
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ success: false, error: 'Minimum amount is 10 KES' });
      }
      const flooredAmount = Math.floor(parsedAmount);
      console.log('Floored amount:', flooredAmount);

      // Validate phone number
      console.log(
        'Phone number validation:',
        phoneNumber,
        'regex test:',
        /^(07|2547|25407|\+2547|\b712)\d{8}$/.test(phoneNumber),
      );

      if (
        !phoneNumber ||
        !/^(07|2547|25407|\+2547|\b712)\d{8}$/.test(phoneNumber)
      ) {
        console.log('Invalid phone number format');
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error:
            'Invalid phone number format. Use format: 07XXXXXXXX, 2547XXXXXXXX, or +2547XXXXXXXX',
        });
      }

      // Initiate STK Push using service
      const stkData = await this.mpesaService.initiateStkPush(
        tenantId,
        phoneNumber,
        flooredAmount,
        reference,
        transactionDesc,
      );

      // Create transaction record
      await this.mpesaService.createTransaction({
        phoneNumber,
        amount: flooredAmount,
        status: 'pending',
        merchantRequestId:
          this.isRecord(stkData) &&
          typeof stkData.MerchantRequestID === 'string'
            ? stkData.MerchantRequestID
            : undefined,
        checkoutRequestID:
          this.isRecord(stkData) &&
          typeof stkData.CheckoutRequestID === 'string'
            ? stkData.CheckoutRequestID
            : undefined,
        tenantId,
        saleData: body.saleData, // If initiating from sale
        // updatedAt is set inside the service, so do not add id or updatedAt here
      });

      const response = {
        success: true,
        message: 'Payment request initiated successfully',
        data: {
          transactionId:
            this.isRecord(stkData) &&
            typeof stkData.MerchantRequestID === 'string'
              ? stkData.MerchantRequestID
              : this.isRecord(stkData) &&
                  typeof stkData.CheckoutRequestID === 'string'
                ? stkData.CheckoutRequestID
                : undefined,
          checkoutRequestId:
            this.isRecord(stkData) &&
            typeof stkData.CheckoutRequestID === 'string'
              ? stkData.CheckoutRequestID
              : undefined,
        },
      };
      console.log('Sending response:', JSON.stringify(response, null, 2));

      return res.status(HttpStatus.OK).json(response);
    } catch (error: unknown) {
      console.error('=== M-PESA INITIATION ERROR START ===');
      console.error('Error message:', this.getErrorMessage(error));
      console.error(
        'Error name:',
        this.isRecord(error) ? error.name : undefined,
      );
      console.error(
        'Error code:',
        this.isRecord(error) ? error.code : undefined,
      );
      console.error('Full error object:', JSON.stringify(error, null, 2));

      if (this.isRecord(error) && this.isRecord(error.response)) {
        console.error('Response status:', error.response.status);
        console.error('Response statusText:', error.response.statusText);
        console.error(
          'Response data:',
          JSON.stringify(error.response.data, null, 2),
        );
        console.error('Response headers:', error.response.headers);
      } else if (this.isRecord(error) && this.isRecord(error.request)) {
        console.error('No response received. Request details:', error.request);
      } else {
        console.error('Error setting up request:', this.getErrorMessage(error));
      }

      console.error('=== M-PESA INITIATION ERROR END ===');

      const errorData = this.getNestedErrorData(error);
      const errorMessage =
        (typeof errorData?.errorMessage === 'string' &&
          errorData.errorMessage) ||
        (typeof errorData?.message === 'string' && errorData.message) ||
        this.getErrorMessage(error);

      const errorResponse = {
        success: false,
        error: errorMessage,
        code:
          typeof errorData?.errorCode === 'string'
            ? errorData.errorCode
            : undefined,
      };
      console.log(
        'Sending error response:',
        JSON.stringify(errorResponse, null, 2),
      );
      return res.status(HttpStatus.BAD_REQUEST).json(errorResponse);
    }
  }

  @Post('callback')
  async mpesaWebhook(
    @Body() body: MpesaCallbackBody,
    @Query('token') token: string | undefined,
    @Res() res: Response,
  ) {
    console.log('=== M-PESA CALLBACK RECEIVED ===');
    console.log('Callback body:', JSON.stringify(body, null, 2));

    try {
      const { Body } = body;

      if (Body && Body.stkCallback) {
        const {
          MerchantRequestID,
          CheckoutRequestID,
          ResultCode,
          CallbackMetadata,
          ResultDesc,
        } = Body.stkCallback;

        console.log(
          `M-Pesa callback - ResultCode: ${ResultCode}, MerchantRequestID: ${MerchantRequestID}, CheckoutRequestID: ${CheckoutRequestID}`,
        );

        const checkoutRequestId = CheckoutRequestID;

        // Safaricom doesn't sign callbacks, so we verify against the
        // per-tenant HMAC token we embedded in the CallBackURL we registered
        // for this checkout request, and confirm the checkout ID corresponds
        // to a transaction we actually initiated.
        const pendingTx = checkoutRequestId
          ? await this.mpesaService.prisma.mpesaTransaction.findFirst({
              where: { checkoutRequestID: checkoutRequestId },
            })
          : null;

        if (!pendingTx || !pendingTx.tenantId) {
          console.warn(
            `M-Pesa callback rejected: unknown CheckoutRequestID ${checkoutRequestId ?? ''}`,
          );
          return res
            .status(HttpStatus.NOT_FOUND)
            .json({ error: 'Unknown transaction' });
        }

        if (!this.mpesaService.verifyCallbackToken(pendingTx.tenantId, token)) {
          console.warn(
            `M-Pesa callback rejected: invalid token for CheckoutRequestID ${checkoutRequestId ?? ''}`,
          );
          return res
            .status(HttpStatus.FORBIDDEN)
            .json({ error: 'Invalid callback token' });
        }
        const status = ResultCode === 0 ? 'success' : 'failed';
        let mpesaReceipt = undefined;
        let transactionId = undefined;
        let transactionTime: Date | undefined = undefined;
        let businessShortCode = undefined;
        let billRefNumber = undefined;
        let orgAccountBalance = undefined;
        let phoneNumber: string | undefined = undefined;
        let amount = undefined;
        const message = ResultDesc;

        console.log(
          `Processing callback for CheckoutRequestID: ${checkoutRequestId}, Status: ${status}`,
        );

        if (status === 'success' && CallbackMetadata) {
          const callbackMetadata = CallbackMetadata.Item;
          console.log(
            'Callback metadata:',
            JSON.stringify(callbackMetadata, null, 2),
          );

          // Extract all relevant metadata
          callbackMetadata.forEach((item) => {
            switch (item.Name) {
              case 'MpesaReceiptNumber':
                mpesaReceipt = item.Value;
                break;
              case 'TransactionId':
                transactionId = item.Value;
                break;
              case 'TransactionDate':
                transactionTime = new Date(item.Value);
                break;
              case 'BusinessShortCode':
                businessShortCode = item.Value;
                break;
              case 'BillRefNumber':
                billRefNumber = item.Value;
                break;
              case 'OrgAccountBalance':
                orgAccountBalance = item.Value;
                break;
              case 'PhoneNumber':
                phoneNumber =
                  item.Value !== undefined ? String(item.Value) : undefined;
                break;
              case 'Amount':
                amount = item.Value;
                break;
            }
          });

          console.log('Extracted metadata:', {
            mpesaReceipt,
            transactionId,
            transactionTime,
            businessShortCode,
            billRefNumber,
            orgAccountBalance,
            phoneNumber,
            amount,
          });
        }

        // Update transaction with all extracted data
        const updateData: {
          status: string;
          responseCode: string;
          responseDesc?: string;
          mpesaReceipt?: string | number;
          transactionId?: string | number;
          transactionTime?: Date;
          businessShortCode?: string | number;
          billRefNumber?: string | number;
          orgAccountBalance?: string | number;
          phoneNumber?: string;
          amount?: string | number;
        } = {
          status,
          responseCode: ResultCode.toString(),
          responseDesc: message,
        };

        if (mpesaReceipt) updateData.mpesaReceipt = mpesaReceipt;
        if (transactionId) updateData.transactionId = transactionId;
        if (transactionTime) updateData.transactionTime = transactionTime;
        if (businessShortCode) updateData.businessShortCode = businessShortCode;
        if (billRefNumber) updateData.billRefNumber = billRefNumber;
        if (orgAccountBalance) updateData.orgAccountBalance = orgAccountBalance;
        if (phoneNumber) updateData.phoneNumber = phoneNumber;
        if (amount) updateData.amount = amount;

        console.log(
          'Updating transaction with data:',
          JSON.stringify(updateData, null, 2),
        );

        await this.mpesaService.updateTransaction(
          checkoutRequestId,
          updateData,
        );

        // If success and has saleData, process sale
        if (status === 'success') {
          const mpesaTx =
            await this.mpesaService.prisma.mpesaTransaction.findFirst({
              where: { checkoutRequestID: checkoutRequestId },
            });

          console.log(
            'Found M-Pesa transaction:',
            JSON.stringify(mpesaTx, null, 2),
          );

          if (mpesaTx && mpesaTx.saleData) {
            // Check if sale already exists for this M-Pesa transaction
            const existingSale = await this.mpesaService.prisma.sale.findFirst({
              where: { mpesaTransactionId: mpesaTx.id },
            });

            if (existingSale) {
              console.log(
                'Sale already exists for this M-Pesa transaction, skipping creation',
              );
              return res.status(HttpStatus.OK).json({ received: true });
            }

            const saleData = this.isRecord(mpesaTx.saleData)
              ? mpesaTx.saleData
              : {}; // Graceful fallback for invalid payload
            console.log(
              'Processing sale with data:',
              JSON.stringify(saleData, null, 2),
            );

            // Process sale via SalesService
            const saleResult = await this.salesService.createSale(
              {
                items: saleData.items,
                paymentMethod: 'mpesa',
                amountReceived: mpesaTx.amount,
                customerName:
                  typeof saleData.customerName === 'string'
                    ? saleData.customerName
                    : undefined,
                customerPhone:
                  typeof saleData.customerPhone === 'string'
                    ? saleData.customerPhone
                    : undefined,
                branchId:
                  typeof saleData.branchId === 'string'
                    ? saleData.branchId
                    : undefined,
                mpesaTransactionId: mpesaTx.id,
                mpesaReceipt: mpesaReceipt, // Include the M-Pesa receipt number
                idempotencyKey: `mpesa_${mpesaTx.id}`,
              },
              mpesaTx.tenantId,
              typeof saleData.userId === 'string' ? saleData.userId : '',
            );

            console.log(
              'Sale created successfully:',
              JSON.stringify(saleResult, null, 2),
            );
          }
        }

        console.log('=== M-PESA CALLBACK PROCESSING COMPLETE ===');
        return res.status(HttpStatus.OK).json({ received: true });
      } else {
        console.log(
          'Invalid M-Pesa callback format - missing Body or stkCallback',
        );
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ error: 'Invalid callback format' });
      }
    } catch (error) {
      console.error('=== CALLBACK ERROR ===');
      console.error('Error details:', error);
      console.error('=== CALLBACK ERROR END ===');
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ error: 'Callback processing failed' });
    }
  }

  @Get('config')
  @UseGuards(AuthGuard('jwt'))
  async getConfig(
    @Query('tenantId') tenantId: string,
    @Res() res: Response,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const user = req?.user;
      if (!user) {
        return res
          .status(HttpStatus.UNAUTHORIZED)
          .json({ error: 'Unauthorized' });
      }
      if (!tenantId) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ error: 'tenantId is required' });
      }
      const canAccess =
        user.tenantId === tenantId || user.isSuperadmin === true;
      if (!canAccess) {
        throw new ForbiddenException(
          'You can only view M-Pesa config for your own tenant.',
        );
      }
      const config = await this.mpesaService.getTenantMpesaConfig(
        tenantId,
        false,
      );
      return res.json({
        consumerKey: config.consumerKey,
        consumerSecret: config.consumerSecret,
        shortCode: config.shortCode,
        passkey: config.passkey,
        callbackUrl: config.callbackUrl,
        environment: config.environment,
        isActive: config.isActive,
      });
    } catch (error: unknown) {
      const status =
        error instanceof ForbiddenException
          ? HttpStatus.FORBIDDEN
          : HttpStatus.BAD_REQUEST;
      return res
        .status(status)
        .json({ error: this.getErrorMessage(error) || 'Failed to get config' });
    }
  }

  @Post('config')
  @UseGuards(AuthGuard('jwt'))
  async updateConfig(
    @Body() body: MpesaConfigBody,
    @Res() res: Response,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const user = req?.user;
      if (!user) {
        return res
          .status(HttpStatus.UNAUTHORIZED)
          .json({ error: 'Unauthorized' });
      }
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

      if (!tenantId) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ error: 'tenantId is required' });
      }
      const canUpdate =
        user.tenantId === tenantId || user.isSuperadmin === true;
      if (!canUpdate) {
        throw new ForbiddenException(
          'Only an administrator can add or edit M-Pesa for this tenant.',
        );
      }

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
          mpesaIsActive: mpesaIsActive === true || mpesaIsActive === 'true',
          mpesaEnvironment: mpesaEnvironment || 'sandbox',
        },
      });

      return res.json({ success: true, message: 'M-Pesa config updated' });
    } catch (error: unknown) {
      const status =
        error instanceof ForbiddenException
          ? HttpStatus.FORBIDDEN
          : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        error: this.getErrorMessage(error) || 'Failed to update config',
      });
    }
  }

  @Get('status/:checkoutRequestId')
  @UseGuards(AuthGuard('jwt'))
  async getStatus(
    @Param('checkoutRequestId') checkoutRequestId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    console.log('Getting status for checkoutRequestId:', checkoutRequestId);
    let transaction = await this.mpesaService.prisma.mpesaTransaction.findFirst(
      {
        where: { checkoutRequestID: checkoutRequestId },
      },
    );

    if (!transaction) {
      console.log(
        'Transaction not found for checkoutRequestId:',
        checkoutRequestId,
      );
      return { success: false, error: 'Transaction not found' };
    }

    const user = req?.user;
    const canView =
      !!user &&
      (user.tenantId === transaction.tenantId || user.isSuperadmin === true);
    if (!canView) {
      throw new ForbiddenException(
        'You can only view M-Pesa transactions for your own tenant.',
      );
    }

    if (transaction.status === 'pending' && transaction.tenantId) {
      try {
        const stkQuery = await this.mpesaService.queryStkPushStatus(
          transaction.tenantId,
          checkoutRequestId,
        );

        const resultCodeRaw =
          typeof stkQuery.ResultCode === 'string' ||
          typeof stkQuery.ResultCode === 'number'
            ? String(stkQuery.ResultCode)
            : undefined;
        const resultDesc =
          typeof stkQuery.ResultDesc === 'string'
            ? stkQuery.ResultDesc
            : typeof stkQuery.ResponseDescription === 'string'
              ? stkQuery.ResponseDescription
              : undefined;

        if (resultCodeRaw === '0') {
          await this.mpesaService.updateTransaction(checkoutRequestId, {
            status: 'success',
            responseCode: resultCodeRaw,
            responseDesc: resultDesc,
            message: resultDesc,
          });
        } else if (resultCodeRaw && resultCodeRaw !== '1037') {
          // 1037 often means the request is still being processed by M-Pesa.
          await this.mpesaService.updateTransaction(checkoutRequestId, {
            status: 'failed',
            responseCode: resultCodeRaw,
            responseDesc: resultDesc,
            message: resultDesc,
          });
        }

        transaction = await this.mpesaService.prisma.mpesaTransaction.findFirst(
          {
            where: { checkoutRequestID: checkoutRequestId },
          },
        );
      } catch (error) {
        console.warn(
          'STK status reconciliation failed for checkoutRequestId:',
          checkoutRequestId,
          error,
        );
      }
    }

    console.log('Found transaction:', JSON.stringify(transaction, null, 2));

    if (!transaction) {
      return { success: false, error: 'Transaction not found' };
    }

    return {
      success: true,
      data: {
        id: transaction.id,
        phoneNumber: transaction.phoneNumber,
        amount: transaction.amount,
        status: transaction.status,
        checkoutRequestId: transaction.checkoutRequestID,
        mpesaReceipt: transaction.mpesaReceipt,
        message: transaction.message,
        createdAt: transaction.createdAt,
      },
    };
  }

  @Get('transaction/:checkoutRequestId')
  @UseGuards(AuthGuard('jwt'))
  async getByCheckoutId(
    @Param('checkoutRequestId') checkoutRequestId: string,
    @Res() res: Response,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const transaction =
        await this.mpesaService.prisma.mpesaTransaction.findFirst({
          where: { checkoutRequestID: checkoutRequestId },
        });

      if (!transaction) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ error: 'Transaction not found' });
      }

      const user = req?.user;
      const canView =
        !!user &&
        (user.tenantId === transaction.tenantId || user.isSuperadmin === true);
      if (!canView) {
        return res.status(HttpStatus.FORBIDDEN).json({
          error: 'You can only view M-Pesa transactions for your own tenant.',
        });
      }

      return res.json(transaction);
    } catch {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ error: 'Failed to fetch transaction' });
    }
  }

  @Get('tenant/transactions')
  @UseGuards(AuthGuard('jwt'))
  async getTenantTransactions(
    @Query('status') status: string | undefined,
    @Query('search') search: string | undefined,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Query('branchId') branchId: string | undefined,
    @Query('cashierId') cashierId: string | undefined,
    @Query('limit') limit: string | undefined,
    @Res() res: Response,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const user = req?.user;
      if (!user) {
        return res
          .status(HttpStatus.UNAUTHORIZED)
          .json({ success: false, error: 'Unauthorized' });
      }

      if (!user.tenantId && !user.isSuperadmin) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: 'Tenant context is required',
        });
      }

      const whereClause: Record<string, unknown> = {};

      if (!user.isSuperadmin && user.tenantId) {
        whereClause.tenantId = user.tenantId;
      }

      const normalizedStatus = (status || '').trim().toLowerCase();
      if (normalizedStatus && normalizedStatus !== 'all') {
        whereClause.status = normalizedStatus;
      }

      const normalizedSearch = (search || '').trim();
      if (normalizedSearch) {
        whereClause.OR = [
          { mpesaReceipt: { contains: normalizedSearch, mode: 'insensitive' } },
          {
            checkoutRequestID: {
              contains: normalizedSearch,
              mode: 'insensitive',
            },
          },
          { phoneNumber: { contains: normalizedSearch, mode: 'insensitive' } },
        ];
      }

      const normalizedBranchId = (branchId || '').trim();
      const normalizedCashierId = (cashierId || '').trim();
      if (normalizedBranchId || normalizedCashierId) {
        whereClause.sale = {
          is: {
            ...(normalizedBranchId ? { branchId: normalizedBranchId } : {}),
            ...(normalizedCashierId ? { userId: normalizedCashierId } : {}),
          },
        };
      }

      const fromDate = from ? new Date(from) : undefined;
      const toDate = to ? new Date(to) : undefined;
      const hasFrom = Boolean(fromDate && !Number.isNaN(fromDate.getTime()));
      const hasTo = Boolean(toDate && !Number.isNaN(toDate.getTime()));
      if (hasFrom || hasTo) {
        whereClause.createdAt = {};
        if (hasFrom && fromDate) {
          whereClause.createdAt.gte = fromDate;
        }
        if (hasTo && toDate) {
          whereClause.createdAt.lte = toDate;
        }
      }

      const parsedLimit = Number(limit);
      const take = Number.isFinite(parsedLimit)
        ? Math.max(1, Math.min(1000, Math.floor(parsedLimit)))
        : 500;

      const transactions =
        await this.mpesaService.prisma.mpesaTransaction.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          include: {
            sale: {
              select: {
                id: true,
                total: true,
                customerName: true,
                customerPhone: true,
                branchId: true,
                userId: true,
                Branch: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                User: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
          take,
        });

      const summary = transactions.reduce(
        (acc, tx) => {
          const normalized = this.normalizeMpesaStatus(
            tx.status,
            tx.message,
            tx.mpesaReceipt,
            tx.createdAt,
          );
          acc.total += 1;
          acc.totalAmount += tx.amount;
          if (normalized === 'success') acc.success += 1;
          if (normalized === 'pending') acc.pending += 1;
          if (
            normalized === 'failed' ||
            normalized === 'cancelled' ||
            normalized === 'timeout' ||
            normalized === 'stock_unavailable'
          ) {
            acc.failed += 1;
          }
          return acc;
        },
        {
          total: 0,
          success: 0,
          pending: 0,
          failed: 0,
          totalAmount: 0,
        },
      );

      const branches = Array.from(
        new Map(
          transactions
            .filter((tx) => tx.sale?.Branch)
            .map((tx) => [tx.sale!.Branch!.id, tx.sale!.Branch!]),
        ).values(),
      ).sort((a, b) => a.name.localeCompare(b.name));

      const cashiers = Array.from(
        new Map(
          transactions
            .filter((tx) => tx.sale?.User)
            .map((tx) => [tx.sale!.User.id, tx.sale!.User]),
        ).values(),
      ).sort((a, b) => a.name.localeCompare(b.name));

      return res.json({
        success: true,
        summary,
        filters: {
          branches,
          cashiers,
        },
        data: transactions.map((transaction) => {
          const status = this.normalizeMpesaStatus(
            transaction.status,
            transaction.message,
            transaction.mpesaReceipt,
            transaction.createdAt,
          );
          const message = this.normalizeMpesaMessage(
            status,
            transaction.message,
            transaction.mpesaReceipt,
          );

          return {
            id: transaction.id,
            phoneNumber: transaction.phoneNumber,
            amount: transaction.amount,
            status,
            checkoutRequestId: transaction.checkoutRequestID,
            mpesaReceipt: transaction.mpesaReceipt,
            message,
            createdAt: transaction.createdAt,
            updatedAt: transaction.updatedAt,
            sale: transaction.sale
              ? {
                  id: transaction.sale.id,
                  total: transaction.sale.total,
                  customerName: transaction.sale.customerName ?? undefined,
                  customerPhone: transaction.sale.customerPhone ?? undefined,
                  branchId: transaction.sale.branchId ?? undefined,
                  cashierId: transaction.sale.userId ?? undefined,
                  branchName: transaction.sale.Branch?.name ?? undefined,
                  cashierName: transaction.sale.User?.name ?? undefined,
                }
              : undefined,
          };
        }),
      });
    } catch {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to fetch M-Pesa transactions',
      });
    }
  }

  @Post('tenant/transactions/reconcile-pending')
  @UseGuards(AuthGuard('jwt'))
  async reconcilePendingTransactions(
    @Res() res: Response,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const user = req?.user;
      if (!user) {
        return res
          .status(HttpStatus.UNAUTHORIZED)
          .json({ success: false, error: 'Unauthorized' });
      }
      if (!user.tenantId && !user.isSuperadmin) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ success: false, error: 'Tenant context is required' });
      }

      const pendingTransactions =
        await this.mpesaService.prisma.mpesaTransaction.findMany({
          where: {
            ...(user.isSuperadmin ? {} : { tenantId: user.tenantId }),
            status: 'pending',
            checkoutRequestID: { not: null },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });

      let updated = 0;
      const timeoutMs = 30 * 60 * 1000;
      for (const tx of pendingTransactions) {
        if (!tx.checkoutRequestID || !tx.tenantId) {
          continue;
        }

        const transactionAgeMs = Date.now() - tx.createdAt.getTime();
        const isStalePending = transactionAgeMs > timeoutMs;

        try {
          const stkQuery = await this.mpesaService.queryStkPushStatus(
            tx.tenantId,
            tx.checkoutRequestID,
          );

          const resultCodeRaw =
            typeof stkQuery.ResultCode === 'string' ||
            typeof stkQuery.ResultCode === 'number'
              ? String(stkQuery.ResultCode)
              : undefined;
          const resultDesc =
            typeof stkQuery.ResultDesc === 'string'
              ? stkQuery.ResultDesc
              : typeof stkQuery.ResponseDescription === 'string'
                ? stkQuery.ResponseDescription
                : undefined;

          if (resultCodeRaw === '0') {
            await this.mpesaService.updateTransaction(tx.checkoutRequestID, {
              status: 'success',
              responseCode: resultCodeRaw,
              responseDesc: resultDesc,
              message: resultDesc,
            });
            updated += 1;
          } else if (resultCodeRaw && resultCodeRaw !== '1037') {
            await this.mpesaService.updateTransaction(tx.checkoutRequestID, {
              status: 'failed',
              responseCode: resultCodeRaw,
              responseDesc: resultDesc,
              message: resultDesc,
            });
            updated += 1;
          } else if (isStalePending) {
            await this.mpesaService.updateTransaction(tx.checkoutRequestID, {
              status: 'timeout',
              responseCode: resultCodeRaw || 'TIMEOUT',
              responseDesc:
                resultDesc || 'No callback received in expected time window.',
              message: 'No callback received in expected time window.',
            });
            updated += 1;
          }
        } catch {
          if (isStalePending) {
            await this.mpesaService.updateTransaction(tx.checkoutRequestID, {
              status: 'timeout',
              responseCode: 'TIMEOUT',
              responseDesc: 'No callback received in expected time window.',
              message: 'No callback received in expected time window.',
            });
            updated += 1;
          }
          // Do not fail full reconciliation due to one transaction.
          continue;
        }
      }

      return res.json({
        success: true,
        checked: pendingTransactions.length,
        updated,
      });
    } catch {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to reconcile pending transactions',
      });
    }
  }
}
