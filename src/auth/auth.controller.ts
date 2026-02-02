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
import { Response } from 'express';
import { AuthService } from './auth.services';
import { CookieService } from './cookie.service';
import { Public } from './decorators/public.decorator';
import { AUTH_COOKIE_NAMES } from './constants';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: CookieService,
  ) {}

  private readonly logger = new Logger(AuthController.name);

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
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.log(`Login attempt for: ${body.email} from IP: ${req.ip}`);

    if (!body.email || !body.password) {
      this.logger.warn('Missing email or password in login request');
      throw new BadRequestException('Email and password are required');
    }

    const emailLower = body.email.trim().toLowerCase();

    try {
      const result = await this.authService.login(
        emailLower,
        body.password,
        req.ip,
        req.headers['user-agent'] || '',
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
      return {
        user: result.user,
        access_token: result.access_token,
      };
    } catch (error: any) {
      this.logger.error(
        `Login error for ${emailLower}: ${error.message}`,
        error.stack,
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
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req?.cookies?.[AUTH_COOKIE_NAMES.REFRESH_TOKEN];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token required');
    }
    try {
      const result = await this.authService.refresh(refreshToken);
      this.cookieService.setAccessToken(res, result.access_token);
      this.cookieService.setRefreshToken(res, result.refresh_token);
      return { user: result.user };
    } catch (error: any) {
      this.cookieService.clearAuthCookies(res);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  @Public()
  @Post('logout')
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req?.cookies?.[AUTH_COOKIE_NAMES.REFRESH_TOKEN];
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
    res.status(204).send();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async me(@Req() req: any) {
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
  async getSessions(@Req() req: any) {
    const userId = req.user?.userId ?? req.user?.sub;
    if (!userId) throw new UnauthorizedException('Not authenticated');
    const sessions = await this.authService.getActiveSessionsForUser(userId);
    const currentSessionId = req.user?.sessionId ?? null;
    return { sessions, currentSessionId };
  }

  /** Revoke a specific session (must belong to current user). */
  @UseGuards(AuthGuard('jwt'))
  @Delete('sessions/:id')
  async revokeSession(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.userId ?? req.user?.sub;
    if (!userId) throw new UnauthorizedException('Not authenticated');
    const revoked = await this.authService.revokeSessionForUser(id, userId);
    if (!revoked) throw new NotFoundException('Session not found or access denied');
    return { success: true };
  }

  /** Revoke all other sessions (keep current). */
  @UseGuards(AuthGuard('jwt'))
  @Post('sessions/revoke-others')
  async revokeOtherSessions(@Req() req: any) {
    const userId = req.user?.userId ?? req.user?.sub;
    if (!userId) throw new UnauthorizedException('Not authenticated');
    const currentSessionId = req.user?.sessionId ?? undefined;
    const count = await this.authService.revokeAllOtherSessions(userId, currentSessionId);
    return { success: true, revoked: count };
  }
}
