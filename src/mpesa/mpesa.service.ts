import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class MpesaService {
  constructor(public readonly prisma: PrismaService) {}

  async getTenantMpesaConfig(tenantId: string, requireActive = true) {
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required.');
    }

    // Prefer tenant-level M-Pesa config (admin-configured) over .env
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        mpesaConsumerKey: true,
        mpesaConsumerSecret: true,
        mpesaShortCode: true,
        mpesaPasskey: true,
        mpesaCallbackUrl: true,
        mpesaIsActive: true,
        mpesaEnvironment: true,
      },
    });

    if (
      tenant?.mpesaConsumerKey &&
      tenant.mpesaShortCode &&
      tenant.mpesaPasskey
    ) {
      if (requireActive && !tenant.mpesaIsActive) {
        throw new BadRequestException('M-Pesa is not enabled for this tenant.');
      }
      let consumerSecret = tenant.mpesaConsumerSecret ?? '';
      let passkey = tenant.mpesaPasskey ?? '';
      try {
        if (consumerSecret && consumerSecret.includes(':')) {
          consumerSecret = this.decrypt(consumerSecret);
        }
        if (passkey && passkey.includes(':')) {
          passkey = this.decrypt(passkey);
        }
      } catch {
        // If decrypt fails, use as-is (e.g. plain text from migration)
      }
      return {
        consumerKey: tenant.mpesaConsumerKey,
        consumerSecret,
        shortCode: tenant.mpesaShortCode,
        passkey,
        callbackUrl: tenant.mpesaCallbackUrl || undefined,
        environment: tenant.mpesaEnvironment || 'sandbox',
        isActive: tenant.mpesaIsActive ?? false,
      };
    }

    // Fallback to .env
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const shortCode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    const callbackUrl = process.env.MPESA_CALLBACK_URL;
    const environment = process.env.MPESA_ENVIRONMENT || 'sandbox';

    if (!consumerKey || !consumerSecret || !shortCode || !passkey) {
      throw new BadRequestException(
        'M-Pesa configuration is incomplete. Configure it in Superadmin → Tenants → this tenant → Integrations, or set .env (MPESA_*).',
      );
    }

    return {
      consumerKey,
      consumerSecret,
      shortCode,
      passkey,
      callbackUrl,
      environment,
      isActive: true,
    };
  }

  async initiateStkPush(
    tenantId: string,
    phoneNumber: string,
    amount: number,
    reference?: string,
    transactionDesc?: string,
  ) {
    const config = await this.getTenantMpesaConfig(tenantId);

    // Validate inputs
    amount = Math.floor(amount);
    if (amount < 10) {
      throw new BadRequestException('Minimum amount is 10 KES');
    }
    if (!phoneNumber || !/^(07|2547|25407|\+2547|\b712)\d{8}$/.test(phoneNumber)) {
      throw new BadRequestException(
        'Invalid phone number format. Use format: 07XXXXXXXX, 2547XXXXXXXX, +2547XXXXXXXX, or 712345678',
      );
    }
    // Normalize phone number to 2547XXXXXXXX
    if (phoneNumber.startsWith('+2547')) {
      phoneNumber = phoneNumber.substring(1);
    } else if (phoneNumber.startsWith('07')) {
      phoneNumber = '2547' + phoneNumber.substring(2);
    } else if (phoneNumber.startsWith('25407')) {
      phoneNumber = '2547' + phoneNumber.substring(5);
    } else if (phoneNumber.startsWith('712')) {
      phoneNumber = '2547' + phoneNumber;
    }
    // else if already starts with '2547', leave as is

    // Generate timestamp
    const now = new Date();
    const timestamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0'),
    ].join('');

    // Correct password generation for M-Pesa
    const password = Buffer.from(`${config.shortCode}${config.passkey}${timestamp}`).toString('base64');

    // API URL based on environment
    const baseUrl =
      config.environment === 'production'
        ? 'https://api.safaricom.co.ke'
        : 'https://sandbox.safaricom.co.ke';

    // Get OAuth token
    const tokenResponse = await fetch(
      `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        method: 'GET',
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64')}`,
        },
      },
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token request failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        response: errorText,
      });
      throw new BadRequestException(`Failed to authenticate with M-Pesa: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    console.log('M-Pesa access token obtained successfully');

    // Initiate STK Push
    const stkPayload = {
      BusinessShortCode: config.shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: phoneNumber,
      PartyB: config.shortCode,
      PhoneNumber: phoneNumber,
      CallBackURL:
        config.callbackUrl || `${process.env.BASE_URL}/mpesa/callback`,
      AccountReference: reference || 'Saas Platform',
      TransactionDesc: transactionDesc || 'Payment for Saas Platform',
    };

    console.log('Initiating STK Push with payload:', JSON.stringify(stkPayload, null, 2));

    const stkResponse = await fetch(
      `${baseUrl}/mpesa/stkpush/v1/processrequest`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stkPayload),
      },
    );

    if (!stkResponse.ok) {
      const errorData = await stkResponse.text();
      console.error('STK Push failed:', {
        status: stkResponse.status,
        statusText: stkResponse.statusText,
        response: errorData,
      });
      throw new BadRequestException(
        `M-Pesa API Error: ${errorData || 'Unknown error'}`,
      );
    }

    const stkData = await stkResponse.json();
    console.log('STK Push response:', JSON.stringify(stkData, null, 2));
    return stkData;
  }

  async createTransaction(data: {
    userId?: string;
    phoneNumber: string;
    amount: number;
    status: string;
    merchantRequestId?: string;
    checkoutRequestID?: string;
    message?: string;
    saleData?: any;
    tenantId: string;
  }) {
    // Remove userId if undefined (Prisma expects it to be present or omitted)
    const { userId, tenantId, ...rest } = data;
    const createData = userId
      ? {
          id: `mpesa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId,
          tenantId,
          ...rest,
          updatedAt: new Date(),
        }
      : {
          id: `mpesa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          tenantId,
          ...rest,
          updatedAt: new Date(),
        };
    return this.prisma.mpesaTransaction.create({ data: createData });
  }

  async updateTransaction(
    checkoutRequestId: string,
    update: Partial<{
      status: string;
      mpesaReceipt: string;
      responseCode: string;
      responseDesc: string;
      message: string;
    }>,
  ) {
    return this.prisma.mpesaTransaction.updateMany({
      where: { checkoutRequestID: checkoutRequestId },
      data: update,
    });
  }

  private encrypt(text: string): string {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(
      process.env.ENCRYPTION_KEY || 'default-key',
      'salt',
      32,
    );
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedText: string): string {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(
      process.env.ENCRYPTION_KEY || 'default-key',
      'salt',
      32,
    );
    const parts = encryptedText.split(':');
    const ivHex = parts.shift();
    if (!ivHex) throw new Error('Invalid encrypted text');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = parts.join(':');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
