import { Controller, Post, Body, Logger, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { MpesaService, MpesaTransactionUpdate } from '../mpesa.service';
import { SalesService } from '../sales/sales.service';

@Controller('mpesa')
export class MpesaController {
  private readonly logger = new Logger(MpesaController.name);

  constructor(
    private readonly mpesaService: MpesaService,
    private readonly salesService: SalesService,
  ) {}

  @Post('callback')
  async handleCallback(@Body() data: any) {
    try {
      // Handle different types of callbacks
      if (data.Body?.stkCallback) {
        // Handle STK push callback
        const callbackData = data.Body.stkCallback;
        const checkoutRequestID = callbackData.CheckoutRequestID;
        const resultCode = callbackData.ResultCode;
        const resultDesc = callbackData.ResultDesc;

        // Find the transaction by checkoutRequestID
        const transaction = await this.mpesaService.getTransactionByCheckoutRequestId(checkoutRequestID);
        
        if (!transaction) {
          this.logger.warn(`Transaction not found for checkout request ID: ${checkoutRequestID}`);
          return { ResultCode: 0, ResultDesc: 'Success' };
        }

        const updateData: MpesaTransactionUpdate = {
          responseCode: resultCode.toString(),
          responseDesc: resultDesc,
          transactionTime: new Date(),
        };

        // Check if the transaction was successful
        if (resultCode === '0') {
          // Success case - update transaction status
          const callbackMetadata = callbackData.CallbackMetadata || {};
          const items = Array.isArray(callbackMetadata.Item) ? callbackMetadata.Item : [];
          
          // Extract M-Pesa receipt number and other details
          for (const item of items) {
            switch (item.Name) {
              case 'MpesaReceiptNumber':
                updateData.mpesaReceipt = item.Value;
                break;
              case 'PhoneNumber':
                updateData.phoneNumber = item.Value;
                break;
              case 'Amount':
                updateData.amount = parseFloat(item.Value);
                break;
            }
          }

          updateData.status = 'success';
          updateData.message = 'Payment received successfully';
        } else {
          // Failed transaction
          updateData.status = 'failed';
          updateData.message = resultDesc || 'Payment failed';
        }

        // Update the transaction
        await this.mpesaService.updateTransaction(transaction.id, updateData);

        // If we have sale data, create the sale
        if ((transaction as any).saleData) {
          try {
            // This method needs to be implemented in SalesService
            await this.salesService.create({
              ...(transaction as any).saleData,
              mpesaTransactionId: transaction.id,
              paymentMethod: 'mpesa',
            });
          } catch (saleError) {
            this.logger.error('Error creating sale from M-Pesa transaction', saleError);
            // Optionally update transaction with error
            await this.mpesaService.updateTransaction(transaction.id, {
              status: 'failed',
              message: `Sale creation failed: ${saleError.message}`,
            });
          }
        }
      }

      // Always return success to M-Pesa to prevent retries
      return {
        ResultCode: 0,
        ResultDesc: 'Success',
      };
    } catch (error) {
      this.logger.error('Error processing M-Pesa callback', error);
      return {
        ResultCode: 1,
        ResultDesc: 'Error processing callback',
      };
    }
  }

  @Get('transaction/:checkoutRequestId')
  async getTransaction(@Param('checkoutRequestId') checkoutRequestId: string) {
    const transaction = await this.mpesaService.getTransactionByCheckoutRequestId(checkoutRequestId);
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    return transaction;
  }

  @Get('transactions/phone/:phoneNumber')
  async getTransactionsByPhone(
    @Param('phoneNumber') phoneNumber: string,
    @Query('limit') limit = '10',
  ) {
    return this.mpesaService.getTransactionsByPhoneNumber(
      phoneNumber,
      parseInt(limit, 10)
    );
  }

  @Post('transaction/:id/cancel')
  async cancelTransaction(@Param('id') id: string) {
    return this.mpesaService.updateTransaction(id, {
      status: 'cancelled',
      message: 'Transaction cancelled by user',
    });
  }

  @Post('cleanup-pending')
  async cleanupOldPendingTransactions() {
    return this.mpesaService.cleanupOldPendingTransactions();
  }
}