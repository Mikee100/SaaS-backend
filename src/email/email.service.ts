import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter<nodemailer.SentMessageInfo>;

  constructor() {
    // For development, use Ethereal test service by default
    // Only use Gmail if explicitly configured with valid credentials
    const useGmail = process.env.USE_GMAIL === 'true';
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_PASS;

    if (useGmail && gmailUser && gmailPass) {
      this.transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
      });

      // Verify Gmail first, fallback to Ethereal if verification fails.
      void this.verifyTransporter('Gmail').then((isReady) => {
        if (!isReady) {
          void this.setupEthereal();
        }
      });
    } else {
      void this.setupEthereal();
    }
  }

  private async verifyTransporter(label: string): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log(`${label} transporter is ready`);
      return true;
    } catch (error) {
      this.logger.error(`${label} transporter verification failed:`, error);
      return false;
    }
  }

  private async setupEthereal() {
    try {
      // Generate test account credentials automatically
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      this.logger.warn(
        `Using Ethereal test email service. Inbox: ${testAccount.user}. Set USE_GMAIL=true and valid GMAIL_USER/GMAIL_PASS for production.`,
      );
      await this.verifyTransporter('Ethereal');
    } catch (error) {
      this.logger.error('Failed to create Ethereal test account:', error);
      // Ultimate fallback: use local stream transport so app remains functional.
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      });
      this.logger.warn('Email sending disabled - logging to console only.');
    }
  }

  private sendMail(mailOptions: nodemailer.SendMailOptions): Promise<void> {
    const sendMailFn = this.transporter.sendMail.bind(this.transporter) as (
      options: nodemailer.SendMailOptions,
    ) => Promise<unknown>;
    return sendMailFn(mailOptions).then(() => undefined);
  }

  async sendResetPasswordEmail(to: string, token: string): Promise<void> {
    const resetUrl = `http://localhost:5000/reset-password?token=${token}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your account.</p>
        <p>Click the button below to reset your password:</p>
        <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
        <p>If you didn't request this, please ignore this email.</p>
        <p>This link will expire in 1 hour.</p>
        <hr style="margin-top: 20px;">
        <p style="font-size: 12px; color: #666;">SaaS Platform</p>
      </div>
    `;

    const mailOptions: nodemailer.SendMailOptions = {
      from:
        process.env.FROM_EMAIL || '"SaaS Platform" <noreply@saasplatform.com>',
      to,
      subject: 'Password Reset - SaaS Platform',
      html,
    };

    try {
      await this.sendMail(mailOptions);
      this.logger.log(`Reset password email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send reset email to ${to}:`, error);
      throw error;
    }
  }

  async sendPaymentConfirmationEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    const mailOptions: nodemailer.SendMailOptions = {
      from:
        process.env.FROM_EMAIL || '"SaaS Platform" <noreply@saasplatform.com>',
      to,
      subject,
      html,
    };

    try {
      await this.sendMail(mailOptions);
      this.logger.log(`Payment confirmation email sent to ${to}`);
    } catch (error) {
      this.logger.error(
        `Failed to send payment confirmation email to ${to}:`,
        error,
      );
      throw error;
    }
  }
}
