import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import * as bcrypt from 'bcrypt';
import { MfaService } from './mfa.service';
import {
  MfaEnrollGuard,
  MfaPendingGuard,
  MfaScopedRequest,
} from './mfa-token.guard';
import { AuthService } from '../auth.services';
import { CookieService } from '../cookie.service';
import type { AuthenticatedRequest } from '../request.types';

@Controller('auth/mfa')
export class MfaController {
  constructor(
    private readonly mfaService: MfaService,
    private readonly authService: AuthService,
    private readonly cookieService: CookieService,
  ) {}

  @UseGuards(MfaEnrollGuard)
  @Post('setup')
  async setup(@Req() req: MfaScopedRequest) {
    const userId = req.mfaUserId!;
    const user = await this.mfaService.getUserMfaState(userId);
    if (!user) {
      throw new UnauthorizedException('Invalid enrollment session');
    }

    const secret = this.mfaService.generateSecret();
    await this.mfaService.savePendingSecret(userId, secret);
    const { otpauthUri, qrCodeDataUrl } =
      await this.mfaService.buildEnrollmentQrCode(user.email, secret);

    return { secret, otpauthUri, qrCodeDataUrl };
  }

  @UseGuards(MfaEnrollGuard)
  @Post('enable')
  async enable(
    @Req() req: MfaScopedRequest,
    @Res({ passthrough: true }) res: Response,
    @Body() body: { code: string },
  ) {
    const userId = req.mfaUserId!;
    const user = await this.mfaService.getUserMfaState(userId);
    if (!user?.twoFactorSecret) {
      throw new BadRequestException('Call /auth/mfa/setup first');
    }
    if (
      !body?.code ||
      !this.mfaService.verifyToken(body.code, user.twoFactorSecret)
    ) {
      throw new BadRequestException('Invalid code');
    }

    await this.mfaService.markEnabled(userId);
    const backupCodes = await this.mfaService.issueBackupCodes(userId);

    // The code just verified is as trustworthy as a normal MFA challenge,
    // so complete the session now instead of forcing a second code entry.
    const userAgentHeader = (req.headers as Record<string, unknown>)[
      'user-agent'
    ];
    const userAgent =
      typeof userAgentHeader === 'string' ? userAgentHeader : '';
    const result = await this.authService.completeLoginAfterMfa(
      userId,
      req.ip,
      userAgent,
    );
    this.cookieService.clearMfaCookies(res);
    this.cookieService.setAccessToken(res, result.access_token);
    this.cookieService.setRefreshToken(res, result.refresh_token);

    return {
      success: true,
      backupCodes,
      user: result.user,
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    };
  }

  @UseGuards(MfaPendingGuard)
  @Post('verify')
  async verify(
    @Req() req: MfaScopedRequest,
    @Res({ passthrough: true }) res: Response,
    @Body() body: { code?: string; backupCode?: string },
  ) {
    const userId = req.mfaUserId!;
    const user = await this.mfaService.getUserMfaState(userId);
    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      throw new UnauthorizedException('MFA is not enabled for this account');
    }

    const valid = body?.code
      ? this.mfaService.verifyToken(body.code, user.twoFactorSecret)
      : body?.backupCode
        ? await this.mfaService.consumeBackupCode(userId, body.backupCode)
        : false;

    if (!valid) {
      throw new UnauthorizedException('Invalid code');
    }

    const userAgentHeader = (req.headers as Record<string, unknown>)[
      'user-agent'
    ];
    const userAgent =
      typeof userAgentHeader === 'string' ? userAgentHeader : '';

    const result = await this.authService.completeLoginAfterMfa(
      userId,
      req.ip,
      userAgent,
    );

    this.cookieService.clearMfaCookies(res);
    this.cookieService.setAccessToken(res, result.access_token);
    this.cookieService.setRefreshToken(res, result.refresh_token);

    return {
      user: result.user,
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('disable')
  async disable(
    @Req() req: AuthenticatedRequest,
    @Body() body: { password: string },
  ) {
    const userId = req.user?.userId || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Not authenticated');
    }
    const user = await this.mfaService.getUserMfaState(userId);
    if (!user || !(await bcrypt.compare(body?.password || '', user.password))) {
      throw new UnauthorizedException('Incorrect password');
    }

    await this.mfaService.disableForUser(userId);
    return { success: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('backup-codes/regenerate')
  async regenerateBackupCodes(
    @Req() req: AuthenticatedRequest,
    @Body() body: { password: string },
  ) {
    const userId = req.user?.userId || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Not authenticated');
    }
    const user = await this.mfaService.getUserMfaState(userId);
    if (!user || !(await bcrypt.compare(body?.password || '', user.password))) {
      throw new UnauthorizedException('Incorrect password');
    }
    if (!user.twoFactorEnabled) {
      throw new BadRequestException('MFA is not enabled for this account');
    }

    const backupCodes = await this.mfaService.issueBackupCodes(userId);
    return { backupCodes };
  }
}
