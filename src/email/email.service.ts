import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

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

      // Verify Gmail first, fallback to Ethereal if fails
      this.transporter.verify((error, success) => {
        if (error) {
          this.logger.error('Gmail verification failed, falling back to Ethereal:', error);
          this.setupEthereal();
        } else {
          this.logger.log('Gmail transporter is ready');
        }
      });
    } else {
      this.setupEthereal();
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

      this.logger.warn(`Using Ethereal test email service. Inbox: ${testAccount.user}. Set USE_GMAIL=true and valid GMAIL_USER/GMAIL_PASS for production.`);
      
      // Verify Ethereal
      this.transporter.verify((error, success) => {
        if (error) {
          this.logger.error('Ethereal transporter verification failed:', error);
        } else {
          this.logger.log('Ethereal transporter is ready');
        }
      });
    } catch (error) {
      this.logger.error('Failed to create Ethereal test account:', error);
      // Ultimate fallback: log emails instead of sending
      this.transporter = {
        sendMail: (options) => {
          this.logger.log(`[EMAIL LOG] To: ${options.to}, Subject: ${options.subject}, Body: ${options.html}`);
          return Promise.resolve({ messageId: 'logged' });
        },
        verify: () => Promise.resolve(true),
      };
      this.logger.warn('Email sending disabled - logging to console only.');
    }
  }

  async sendResetPasswordEmail(to: string, token: string) {
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

    const mailOptions = {
      from: process.env.FROM_EMAIL || '"SaaS Platform" <noreply@saasplatform.com>',
      to,
      subject: 'Password Reset - SaaS Platform',
      html,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Reset password email sent to ${to}: ${info.messageId}`);
      return info;
    } catch (error) {
      this.logger.error(`Failed to send reset email to ${to}:`, error);
      throw error;
    }
  }
}
