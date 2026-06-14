import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  Get,
  Delete,
  Param,
  UseGuards,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.services';
import { CookieService } from './cookie.service';
import { Public } from './decorators/public.decorator';
import { AUTH_COOKIE_NAMES } from './constants';
import { AuthGuard } from '@nestjs/passport';

type JwtRequestUser = {
  userId?: string;
  sub?: string;
  email?: string;
  name?: string;
  tenantId?: string | null;
  branchId?: string | null;
  roles?: string[];
  permissions?: string[];
  isSuperadmin?: boolean;
  impersonating?: boolean;
  impersonatingTenantName?: string | null;
  sessionId?: string;
};

type AuthRequest = Request & {
  user?: JwtRequestUser;
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: CookieService,
  ) {}

  private readonly logger = new Logger(AuthController.name);

  private getRefreshToken(
    req: AuthRequest,
    body?: { refreshToken?: string },
  ): string | undefined {
    const cookies = (req as { cookies?: unknown }).cookies;
    const cookieRefreshToken =
      cookies && typeof cookies === 'object'
        ? (cookies as Record<string, unknown>)[AUTH_COOKIE_NAMES.REFRESH_TOKEN]
        : undefined;

    return typeof cookieRefreshToken === 'string'
      ? cookieRefreshToken
      : body?.refreshToken;
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }

  private getErrorStack(error: unknown): string | undefined {
    return error instanceof Error ? error.stack : undefined;
  }

  @Public()
  @Post('login')
  async login(
    @Body()
    body: {
      email: string;
      password: string;
      deviceFingerprint?: string;
      deviceName?: string;
    },
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.log(`Login attempt for: ${body.email} from IP: ${req.ip}`);

    if (!body.email || !body.password) {
      this.logger.warn('Missing email or password in login request');
      throw new BadRequestException('Email and password are required');
    }

    const emailLower = body.email.trim().toLowerCase();

    const userAgentHeader = (req.headers as Record<string, unknown>)[
      'user-agent'
    ];
    const userAgent =
      typeof userAgentHeader === 'string'
        ? userAgentHeader
        : Array.isArray(userAgentHeader)
          ? userAgentHeader.join(' ')
          : '';

    try {
      const result = await this.authService.login(
        emailLower,
        body.password,
        req.ip,
        userAgent,
        body.deviceFingerprint,
        body.deviceName,
      );

      if (!result || !result.access_token) {
        this.logger.error('Login failed: No access token in response');
        throw new InternalServerErrorException('Authentication failed');
      }

      // Enterprise auth: set HttpOnly cookies
      this.cookieService.setAccessToken(res, result.access_token);
      if (result.refresh_token) {
        this.cookieService.setRefreshToken(res, result.refresh_token);
      }

      this.logger.log(`Successful login for user: ${emailLower}`);
      // Return user only; tokens are in cookies. Include access_token for legacy clients during migration.
      // Now also includes refresh_token for non-browser platforms like Flutter and Electron.
      return {
        user: result.user,
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      };
    } catch (error: unknown) {
      this.logger.error(
        `Login error for ${emailLower}: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
    @Body() body?: { refreshToken?: string },
  ) {
    const refreshToken = this.getRefreshToken(req, body);
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token required');
    }
    try {
      const result = await this.authService.refresh(refreshToken);
      this.cookieService.setAccessToken(res, result.access_token);
      this.cookieService.setRefreshToken(res, result.refresh_token);
      return {
        user: result.user,
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      };
    } catch {
      this.cookieService.clearAuthCookies(res);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  @Public()
  @Post('logout')
  async logout(
    @Req() req: AuthRequest,
    @Res() res: Response,
    @Body() body?: { refreshToken?: string },
  ) {
    const refreshToken = this.getRefreshToken(req, body);
    try {
      if (req.user?.sessionId) {
        await this.authService.revokeSession(req.user.sessionId);
      } else if (refreshToken) {
        await this.authService.revokeByRefreshToken(refreshToken);
      }
    } catch (e) {
      this.logger.warn('Logout revoke failed', e);
    }
    this.cookieService.clearAuthCookies(res);
    return res.status(204).send();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  me(@Req() req: AuthRequest) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('Not authenticated');
    }
    return {
      id: user.userId || user.sub,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
      branchId: user.branchId,
      roles: user.roles || [],
      permissions: user.permissions || [],
      isSuperadmin: user.isSuperadmin ?? false,
      impersonating: user.impersonating ?? false,
      impersonatingAsTenantName: user.impersonatingTenantName ?? null,
    };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    const emailLower = body.email.trim().toLowerCase();
    return this.authService.forgotPassword(emailLower);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  /** List active sessions for the current user. */
  @UseGuards(AuthGuard('jwt'))
  @Get('sessions')
  async getSessions(@Req() req: AuthRequest) {
    const userId = req.user?.userId ?? req.user?.sub;
    if (!userId) throw new UnauthorizedException('Not authenticated');
    const sessions = await this.authService.getActiveSessionsForUser(userId);
    const currentSessionId = req.user?.sessionId ?? null;
    return { sessions, currentSessionId };
  }

  /** Revoke a specific session (must belong to current user). */
  @UseGuards(AuthGuard('jwt'))
  @Delete('sessions/:id')
  async revokeSession(@Req() req: AuthRequest, @Param('id') id: string) {
    const userId = req.user?.userId ?? req.user?.sub;
    if (!userId) throw new UnauthorizedException('Not authenticated');
    const revoked = await this.authService.revokeSessionForUser(id, userId);
    if (!revoked)
      throw new NotFoundException('Session not found or access denied');
    return { success: true };
  }

  /** Revoke all other sessions (keep current). */
  @UseGuards(AuthGuard('jwt'))
  @Post('sessions/revoke-others')
  async revokeOtherSessions(@Req() req: AuthRequest) {
    const userId = req.user?.userId ?? req.user?.sub;
    if (!userId) throw new UnauthorizedException('Not authenticated');
    const currentSessionId = req.user?.sessionId ?? undefined;
    const count = await this.authService.revokeAllOtherSessions(
      userId,
      currentSessionId,
    );
    return { success: true, revoked: count };
  }
}
