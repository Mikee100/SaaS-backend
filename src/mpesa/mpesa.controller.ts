import { Controller, Post, Body, Res, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { Response } from 'express';

@Controller('mpesa')
export class MpesaController {
  @Post('initiate')
  async initiatePayment(@Body() body: any, @Res() res: Response) {
    let { phoneNumber, amount } = body;

    // Validate and format amount
    amount = parseFloat(amount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: "Invalid amount. Must be a positive number." });
    }
    if (amount < 10) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: "Minimum amount is 10 KES" });
    }
    amount = Math.floor(amount);

    // Load credentials from environment variables
    const consumerKey = process.env.MPESA_CONSUMER_KEY || 'JFvBXWMm0yPfiDwTWNPbc2TodFikv8VOBcIhDQ1xbRIBr7TE';
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET || 'Q16rZBLRjCN1VXaBMmzInA3QpGX0MXidMYY0EUweif6PsvbsUQ8GLBLiqZHaebk9';
    const shortCode = process.env.MPESA_SHORTCODE || '174379';
    const passkey = process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
    const callbackURL = process.env.MPESA_CALLBACK_URL || 'https://mydomain.com/path';

    // Validate phone number
    if (!phoneNumber || !/^(07|2547|25407|\+2547)\d{8}$/.test(phoneNumber)) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: "Invalid phone number format. Use format: 07XXXXXXXX, 2547XXXXXXXX, or +2547XXXXXXXX" });
    }
    phoneNumber = phoneNumber.replace(/^0/, '254').replace(/^\+/, '');

    // Generate timestamp (YYYYMMDDHHmmss)
    const now = new Date();
    const timestamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0')
    ].join('');

    // Generate password
    const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');

    try {
      // Get OAuth token
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

      // Initiate STK Push
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
          AccountReference: body.reference || 'Saas Platform',
          TransactionDesc: body.transactionDesc || 'Payment for Saas Platform',
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }
        }
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Payment request initiated successfully',
        data: stkResponse.data
      });

    } catch (error) {
      console.error('M-Pesa API Error:', {
        request: error.config?.data,
        response: error.response?.data,
        message: error.message
      });

      const errorMessage = error.response?.data?.errorMessage || 
                         error.response?.data?.message || 
                         'Failed to process payment';

      return res.status(error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: errorMessage,
        code: error.response?.data?.errorCode
      });
    }
  }
}