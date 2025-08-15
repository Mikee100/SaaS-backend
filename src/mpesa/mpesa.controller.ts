import { Controller, Post, Body } from '@nestjs/common';
import axios from 'axios';

@Controller('mpesa')
export class MpesaController {
  @Post('initiate')
  async initiatePayment(@Body() body: any) {
    // Safaricom STK Push credentials (replace with your own)
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    const callbackUrl = process.env.MPESA_CALLBACK_URL;

    // Get access token
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const tokenRes = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      headers: { Authorization: `Basic ${auth}` }
    });
    const accessToken = tokenRes.data.access_token;

    // Prepare STK Push request
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(shortcode + passkey + timestamp).toString('base64');
    const stkPayload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: body.amount,
      PartyA: body.phoneNumber,
      PartyB: shortcode,
      PhoneNumber: body.phoneNumber,
      CallBackURL: callbackUrl,
      AccountReference: body.reference,
      TransactionDesc: body.transactionDesc || 'Payment',
    };

    // Send STK Push
    const stkRes = await axios.post('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', stkPayload, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return {
      success: true,
      message: 'Mpesa STK Push initiated',
      data: stkRes.data
    };
  }
}
