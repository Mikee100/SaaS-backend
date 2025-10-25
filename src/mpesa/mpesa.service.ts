import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class MpesaService {
  constructor(public readonly prisma: PrismaService) {}

  async getTenantMpesaConfig(tenantId: string, requireActive = true) {
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

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    if (requireActive && !tenant.mpesaIsActive) {
      throw new BadRequestException('M-Pesa is not configured for this tenant');
    }

    if (
      requireActive &&
      (!tenant.mpesaConsumerKey ||
        !tenant.mpesaConsumerSecret ||
        !tenant.mpesaShortCode ||
        !tenant.mpesaPasskey ||
        !tenant.mpesaCallbackUrl)
    ) {
      throw new BadRequestException(
        'M-Pesa configuration is incomplete. Please set up all required fields.',
      );
    }

    // Decrypt sensitive fields if encrypted (assuming simple AES for now; adjust as needed)
    const decryptedSecret = tenant.mpesaConsumerSecret
      ? this.decrypt(tenant.mpesaConsumerSecret)
      : '';
    const decryptedPasskey = tenant.mpesaPasskey
      ? this.decrypt(tenant.mpesaPasskey)
      : '';

    return {
      consumerKey: tenant.mpesaConsumerKey || '',
      consumerSecret: decryptedSecret,
      shortCode: tenant.mpesaShortCode || '',
      passkey: decryptedPasskey,
      callbackUrl: tenant.mpesaCallbackUrl || '',
      environment: tenant.mpesaEnvironment || 'sandbox',
      isActive: tenant.mpesaIsActive,
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
    if (!phoneNumber || !/^(07|2547|25407|\+2547)\d{8}$/.test(phoneNumber)) {
      throw new BadRequestException(
        'Invalid phone number format. Use format: 07XXXXXXXX, 2547XXXXXXXX, or +2547XXXXXXXX',
      );
    }
    phoneNumber = phoneNumber.replace(/^0/, '254').replace(/^\+/, '');

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

    // Generate password
    const password = crypto
      .createHash('sha256')
      .update(`${config.shortCode}${config.passkey}${timestamp}`)
      .digest('base64');

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
      throw new BadRequestException('Failed to authenticate with M-Pesa');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Initiate STK Push
    const stkResponse = await fetch(
      `${baseUrl}/mpesa/stkpush/v1/processrequest`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          BusinessShortCode: config.shortCode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: amount,
          PartyA: phoneNumber,
          PartyB: config.shortCode,
          PhoneNumber: phoneNumber,
          CallBackURL:
            config.callbackUrl || `${process.env.BASE_URL}/mpesa/webhook`,
          AccountReference: reference || 'Saas Platform',
          TransactionDesc: transactionDesc || 'Payment for Saas Platform',
        }),
      },
    );

    if (!stkResponse.ok) {
      const errorData = await stkResponse.json();
      throw new BadRequestException(
        `M-Pesa API Error: ${errorData.errorMessage || 'Unknown error'}`,
      );
    }

    return await stkResponse.json();
  }

  async createTransaction(data: {
    userId?: string;
    phoneNumber: string;
    amount: number;
    status: string;
    merchantRequestID?: string;
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
