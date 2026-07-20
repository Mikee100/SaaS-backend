import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma.service';

const BACKUP_CODE_COUNT = 10;
const ISSUER = 'SaaS Platform';

@Injectable()
export class MfaService {
  constructor(private readonly prisma: PrismaService) {}

  generateSecret(): string {
    return authenticator.generateSecret();
  }

  async buildEnrollmentQrCode(
    email: string,
    secret: string,
  ): Promise<{ otpauthUri: string; qrCodeDataUrl: string }> {
    const otpauthUri = authenticator.keyuri(email, ISSUER, secret);
    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUri);
    return { otpauthUri, qrCodeDataUrl };
  }

  verifyToken(token: string, secret: string): boolean {
    try {
      return authenticator.verify({ token, secret });
    } catch {
      return false;
    }
  }

  /** Generates plaintext backup codes and their bcrypt hashes, ready for one-time display + storage. */
  private generateBackupCodes(): string[] {
    return Array.from({ length: BACKUP_CODE_COUNT }, () => {
      const raw = randomBytes(5).toString('hex').toUpperCase();
      return `${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
    });
  }

  async issueBackupCodes(userId: string): Promise<string[]> {
    const codes = this.generateBackupCodes();
    await this.prisma.twoFactorBackupCode.deleteMany({ where: { userId } });
    await this.prisma.twoFactorBackupCode.createMany({
      data: await Promise.all(
        codes.map(async (code) => ({
          userId,
          codeHash: await bcrypt.hash(code, 10),
        })),
      ),
    });
    return codes;
  }

  async consumeBackupCode(userId: string, code: string): Promise<boolean> {
    const candidates = await this.prisma.twoFactorBackupCode.findMany({
      where: { userId, usedAt: null },
    });
    for (const candidate of candidates) {
      if (await bcrypt.compare(code, candidate.codeHash)) {
        await this.prisma.twoFactorBackupCode.update({
          where: { id: candidate.id },
          data: { usedAt: new Date() },
        });
        return true;
      }
    }
    return false;
  }

  async getUserMfaState(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        password: true,
        twoFactorSecret: true,
        twoFactorEnabled: true,
      },
    });
  }

  async savePendingSecret(userId: string, secret: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });
  }

  async markEnabled(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });
  }

  async disableForUser(userId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: false, twoFactorSecret: null },
      }),
      this.prisma.twoFactorBackupCode.deleteMany({ where: { userId } }),
    ]);
  }
}
