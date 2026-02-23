import {
  Injectable,
  UnauthorizedException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';
import { AuditLogService } from '../audit-log.service';
import { v4 as uuidv4 } from 'uuid';
import { EmailService } from '../email/email.service';
import { SubscriptionService } from '../billing/subscription.service';
import { PrismaService } from '../prisma.service';
import { SessionService } from './session.service';
import { DeviceService } from './device.service';
import { REFRESH_TOKEN_TTL_SEC, ACCESS_TOKEN_TTL_SEC } from './constants';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private auditLogService: AuditLogService,
    private emailService: EmailService,
    private subscriptionService: SubscriptionService,
    private prisma: PrismaService,
    private sessionService: SessionService,
    private deviceService: DeviceService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.userService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(
    email: string,
    password: string,
    ip?: string,
    userAgent?: string,
    deviceFingerprint?: string,
    deviceName?: string,
  ) {
    try {
      // 1. Find user by email with roles included
      const user = await this.userService.findByEmail(email, {
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
            tenant: true,
          },
        },
      });

      console.log('the user: ', user);

      // 2. Check if user exists and password is correct
      if (!user || !(await bcrypt.compare(password, user.password))) {
        if (this.auditLogService) {
          await this.auditLogService.log(null, 'login_failed', { email }, ip);
        }
        // Record failed login attempt
        try {
          if (user?.id) {
            await this.prisma.loginHistory.create({
              data: {
                userId: user.id,
                tenantId: null,
                ipAddress: ip,
                userAgent: userAgent || '',
                success: false,
                failureReason: 'Invalid credentials',
              },
            });
          }
        } catch (error) {
          this.logger.error('Failed to record failed login history:', error);
        }
        throw new UnauthorizedException('Invalid credentials');
      }

      // 2.5. Check if user account is disabled
      if ((user as any).isDisabled) {
        if (this.auditLogService) {
          await this.auditLogService.log(
            null,
            'login_failed_disabled',
            { email },
            ip,
          );
        }
        // Record disabled account login attempt
        try {
          await this.prisma.loginHistory.create({
            data: {
              userId: user.id,
              tenantId: user.tenantId || null,
              ipAddress: ip,
              userAgent: userAgent || '',
              success: false,
              failureReason: 'Account disabled',
            },
          });
        } catch (error) {
          this.logger.error('Failed to record disabled account login history:', error);
        }
        throw new UnauthorizedException('Account disabled. Contact admin.');
      }

      // 3. Get user's roles and tenant from user.userRoles
      const userWithRoles = user as any; // Cast to include userRoles
      const userRoles = userWithRoles.userRoles || [];
      let tenantId: string | null = null;
      if (userRoles.length > 0 && 'tenantId' in userRoles[0]) {
        tenantId = userRoles[0].tenantId;
      }
      // Allow superadmin to login without tenant
      if (!tenantId && !(user as any).isSuperadmin) {
        throw new UnauthorizedException(
          'No tenant assigned to this user. Please contact support.',
        );
      }
      // 4. Check if trial has expired before allowing login (skip for superadmin)
      if (tenantId) {
        const trialStatus =
          await this.subscriptionService.checkTrialStatus(tenantId);
        if (trialStatus.isTrial && trialStatus.trialExpired) {
          throw new ForbiddenException(
            'Trial period has expired. Please upgrade your subscription.',
          );
        }
      }

      // 5. Get user's permissions
      const userPermissions: string[] = [];
      try {
        if (tenantId) {
          const perms = await this.userService.getEffectivePermissions(
            user.id,
            tenantId,
          );
          perms.forEach((perm) => {
            if (perm.name) userPermissions.push(perm.name);
          });
        }
      } catch (error) {
        console.error('Error fetching user permissions:', error);
      }

      // 6. Device (enterprise auth): find or create by fingerprint
      let deviceId: string | null = null;
      if (deviceFingerprint) {
        try {
          const device = await this.deviceService.findOrCreate(
            user.id,
            deviceFingerprint,
            deviceName,
          );
          deviceId = device.id;
        } catch (err) {
          this.logger.warn('Device create failed, continuing without device', err);
        }
      }

      // 7. Session + refresh token (enterprise auth)
      const refreshTokenRaw = this.sessionService.generateRefreshToken();
      const refreshTokenHash = this.sessionService.hashRefreshToken(refreshTokenRaw);
      const sessionExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SEC * 1000);
      const session = await this.sessionService.createSession({
        userId: user.id,
        tenantId,
        deviceId,
        refreshTokenHash,
        ip: ip ?? null,
        userAgent: userAgent ?? null,
        expiresAt: sessionExpiresAt,
      });

      // 8. Prepare JWT payload (include sessionId for revocation)
      const roles = userRoles.map((ur) => ur.role?.name).filter(Boolean) || [];
      const payload = {
        sub: user.id,
        userId: user.id,
        email: user.email,
        name: user.name || '',
        tenantId: tenantId,
        branchId: user.branchId || null,
        roles: roles,
        permissions: userPermissions,
        isSuperadmin: (user as any).isSuperadmin || false,
        sessionId: session.id,
      };

      // 9. Generate JWT (short-lived access token)
      const accessToken = this.jwtService.sign(payload, {
        secret: process.env.JWT_SECRET || 'waweru',
        issuer: 'saas-platform',
        audience: 'saas-platform-client',
        expiresIn: ACCESS_TOKEN_TTL_SEC,
      });

      // 10. Log successful login
      if (this.auditLogService) {
        await this.auditLogService.log(
          user.id,
          'login_success',
          {
            email: user.email,
            tenantId: payload.tenantId,
            branchId: payload.branchId,
          },
          ip,
        );
      }

      // 11. Record login history
      try {
        await this.prisma.loginHistory.create({
          data: {
            userId: user.id,
            tenantId: tenantId,
            ipAddress: ip,
            userAgent: userAgent || '',
            success: true,
          },
        });
      } catch (error) {
        this.logger.error('Failed to record login history:', error);
      }

      // Include tenant and branch names for receipts and POS display
      const [tenant, branch] = await Promise.all([
        payload.tenantId
          ? this.prisma.tenant.findUnique({
              where: { id: payload.tenantId },
              select: { name: true },
            })
          : null,
        payload.branchId
          ? this.prisma.branch.findUnique({
              where: { id: payload.branchId },
              select: { name: true, address: true },
            })
          : null,
      ]);

      const userResponse = {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: payload.tenantId,
        branchId: payload.branchId,
        tenantName: tenant?.name ?? null,
        branchName: branch?.name ?? null,
        branchAddress: branch?.address ?? null,
        roles: payload.roles,
        permissions: payload.permissions,
        isSuperadmin: payload.isSuperadmin,
      };

      // 12. Return tokens (for cookies) and user; access_token in body for legacy clients
      return {
        access_token: accessToken,
        refresh_token: refreshTokenRaw,
        user: userResponse,
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async forgotPassword(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not
      return {
        message:
          'If an account with that email exists, a password reset link has been sent.',
      };
    }

    // Generate a secure token
    const resetToken = uuidv4();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Update user with reset token
    await this.userService.updateUserByEmail(email, {
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetExpires,
    });

    try {
      // Send email with reset link
      await this.emailService.sendResetPasswordEmail(email, resetToken);
      this.logger.log(`Password reset email sent successfully to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}:`,
        error,
      );
      // In development, log the token for testing
      if (process.env.NODE_ENV !== 'production') {
        this.logger.log(`Password reset token for ${email}: ${resetToken}`);
        this.logger.log(
          `Reset link: http://localhost:3000/reset-password?token=${resetToken}`,
        );
      }
      // Don't throw error to avoid revealing user existence
    }

    return {
      message:
        'If an account with that email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      await this.userService.resetPassword(token, newPassword);
      return { message: 'Password has been reset successfully.' };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
  }

  /** Enterprise auth: refresh access token using refresh_token cookie; rotate refresh token. */
  async refresh(refreshToken: string): Promise<{
    access_token: string;
    refresh_token: string;
    user: Record<string, unknown>;
  }> {
    if (!refreshToken?.trim()) {
      throw new UnauthorizedException('Refresh token required');
    }
    const hash = this.sessionService.hashRefreshToken(refreshToken);
    const session = await this.sessionService.findValidSessionByRefreshHash(hash);
    if (!session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    const userId = session.userId;
    const tenantId = session.tenantId ?? null;
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Session user not found');
    }
    const userWithRoles = user as any;
    const userRolesList = userWithRoles.userRoles || [];
    const roles = userRolesList.map((ur: any) => ur.role?.name).filter(Boolean) || [];
    const perms = await this.userService.getEffectivePermissions(userId, tenantId ?? undefined);
    const permissions = perms.map((p) => p.name).filter(Boolean);
    const payload = {
      sub: user.id,
      userId: user.id,
      email: user.email,
      name: user.name || '',
      tenantId,
      branchId: user.branchId ?? null,
      roles,
      permissions,
      isSuperadmin: (user as any).isSuperadmin ?? false,
      sessionId: session.id,
    };
    const newRefreshRaw = this.sessionService.generateRefreshToken();
    const newRefreshHash = this.sessionService.hashRefreshToken(newRefreshRaw);
    await this.sessionService.rotateRefreshToken(session.id, newRefreshHash);
    const access_token = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'waweru',
      issuer: 'saas-platform',
      audience: 'saas-platform-client',
      expiresIn: ACCESS_TOKEN_TTL_SEC,
    });
    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      tenantId: payload.tenantId,
      branchId: payload.branchId,
      roles: payload.roles,
      permissions: payload.permissions,
      isSuperadmin: payload.isSuperadmin,
    };
    return {
      access_token,
      refresh_token: newRefreshRaw,
      user: userResponse,
    };
  }

  /** Enterprise auth: revoke session by refresh token (from cookie). */
  async revokeByRefreshToken(refreshToken: string): Promise<boolean> {
    if (!refreshToken?.trim()) return false;
    const hash = this.sessionService.hashRefreshToken(refreshToken);
    return this.sessionService.revokeSessionByRefreshHash(hash);
  }

  /** Enterprise auth: revoke session by session id (from JWT). */
  async revokeSession(sessionId: string): Promise<void> {
    await this.sessionService.revokeSession(sessionId);
  }

  /** Enterprise auth: revoke all sessions for a user (force logout). */
  async revokeAllSessionsForUser(userId: string): Promise<number> {
    return this.sessionService.revokeAllSessionsForUser(userId);
  }

  /** List active sessions for a user (for security / session management UI). */
  async getActiveSessionsForUser(userId: string): Promise<
    { id: string; ip: string | null; userAgent: string | null; lastActive: string; deviceName?: string }[]
  > {
    const sessions = await this.sessionService.getActiveSessionsForUser(userId);
    return sessions.map((s) => {
      const session = s as typeof s & { device?: { name: string | null } | null };
      return {
        id: session.id,
        ip: session.ip ?? null,
        userAgent: session.userAgent ?? null,
        lastActive: session.lastActiveAt.toISOString(),
        deviceName: session.device?.name ?? undefined,
      };
    });
  }

  /** Revoke all other sessions for the user (keep current session). */
  async revokeAllOtherSessions(
    userId: string,
    currentSessionId: string | undefined,
  ): Promise<number> {
    if (!currentSessionId) {
      return this.sessionService.revokeAllSessionsForUser(userId);
    }
    return this.sessionService.revokeAllOtherSessionsForUser(
      userId,
      currentSessionId,
    );
  }

  /** Revoke a specific session; only if it belongs to the given user. */
  async revokeSessionForUser(
    sessionId: string,
    userId: string,
  ): Promise<boolean> {
    const session = await this.sessionService.findSessionByIdForUser(
      sessionId,
      userId,
    );
    if (!session) return false;
    await this.sessionService.revokeSession(session.id);
    return true;
  }
}
