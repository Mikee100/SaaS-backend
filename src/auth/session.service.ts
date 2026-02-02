import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuthSession } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';

const REFRESH_TOKEN_BYTES = 32;
const HASH_ALGORITHM = 'sha256';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  hashRefreshToken(token: string): string {
    return createHash(HASH_ALGORITHM).update(token, 'utf8').digest('hex');
  }

  generateRefreshToken(): string {
    return randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
  }

  async createSession(params: {
    userId: string;
    tenantId: string | null;
    deviceId: string | null;
    refreshTokenHash: string;
    ip: string | null;
    userAgent: string | null;
    expiresAt: Date;
  }): Promise<AuthSession> {
    return this.prisma.authSession.create({
      data: {
        userId: params.userId,
        tenantId: params.tenantId,
        deviceId: params.deviceId,
        refreshTokenHash: params.refreshTokenHash,
        ip: params.ip,
        userAgent: params.userAgent,
        expiresAt: params.expiresAt,
      },
    });
  }

  async findValidSessionByRefreshHash(refreshTokenHash: string): Promise<AuthSession | null> {
    const session = await this.prisma.authSession.findFirst({
      where: {
        refreshTokenHash,
        isValid: true,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
    return session;
  }

  async rotateRefreshToken(
    sessionId: string,
    newRefreshTokenHash: string,
  ): Promise<AuthSession> {
    return this.prisma.authSession.update({
      where: { id: sessionId },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        lastActiveAt: new Date(),
      },
    });
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.authSession.update({
      where: { id: sessionId },
      data: { isValid: false, revokedAt: new Date() },
    });
  }

  async revokeAllSessionsForUser(userId: string): Promise<number> {
    const result = await this.prisma.authSession.updateMany({
      where: { userId },
      data: { isValid: false, revokedAt: new Date() },
    });
    return result.count;
  }

  /** Revoke all sessions for a user except the one with excludeSessionId (e.g. current session). */
  async revokeAllOtherSessionsForUser(
    userId: string,
    excludeSessionId: string,
  ): Promise<number> {
    const result = await this.prisma.authSession.updateMany({
      where: {
        userId,
        id: { not: excludeSessionId },
        isValid: true,
        revokedAt: null,
      },
      data: { isValid: false, revokedAt: new Date() },
    });
    return result.count;
  }

  /** Get a session by id; returns null if not found or not belonging to userId. */
  async findSessionByIdForUser(
    sessionId: string,
    userId: string,
  ): Promise<AuthSession | null> {
    return this.prisma.authSession.findFirst({
      where: { id: sessionId, userId },
    });
  }

  async revokeSessionByRefreshHash(refreshTokenHash: string): Promise<boolean> {
    const session = await this.prisma.authSession.findFirst({
      where: { refreshTokenHash },
    });
    if (!session) return false;
    await this.revokeSession(session.id);
    return true;
  }

  async getActiveSessionsForUser(userId: string): Promise<AuthSession[]> {
    return this.prisma.authSession.findMany({
      where: {
        userId,
        isValid: true,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActiveAt: 'desc' },
      include: { device: true },
    });
  }
}
