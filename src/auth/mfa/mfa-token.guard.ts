import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AUTH_COOKIE_NAMES } from '../constants';

type MfaTokenType = 'mfa_enroll' | 'mfa_pending';

export type MfaScopedRequest = Request & { mfaUserId?: string };

/**
 * Verifies a short-lived MFA challenge token from its own scoped, httpOnly
 * cookie. Deliberately independent of AuthGuard('jwt')/JwtStrategy: these
 * tokens carry a `type` claim distinguishing them from a full access token,
 * so a leaked enrollment/pending token can never be replayed against any
 * other authenticated route.
 */
abstract class MfaTokenGuardBase implements CanActivate {
  protected abstract readonly cookieName: string;
  protected abstract readonly tokenType: MfaTokenType;

  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<MfaScopedRequest>();
    const token = request.cookies?.[this.cookieName];
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('MFA challenge token missing or expired');
    }

    try {
      const payload = this.jwtService.verify<{ sub?: string; type?: string }>(
        token,
        {
          secret: process.env.JWT_SECRET || 'waweru',
          issuer: 'saas-platform',
          audience: 'saas-platform-client',
        },
      );
      if (payload.type !== this.tokenType || !payload.sub) {
        throw new UnauthorizedException('Invalid MFA challenge token');
      }
      request.mfaUserId = payload.sub;
      return true;
    } catch {
      throw new UnauthorizedException('MFA challenge token missing or expired');
    }
  }
}

@Injectable()
export class MfaEnrollGuard extends MfaTokenGuardBase {
  protected readonly cookieName = AUTH_COOKIE_NAMES.MFA_ENROLL_TOKEN;
  protected readonly tokenType: MfaTokenType = 'mfa_enroll';
}

@Injectable()
export class MfaPendingGuard extends MfaTokenGuardBase {
  protected readonly cookieName = AUTH_COOKIE_NAMES.MFA_PENDING_TOKEN;
  protected readonly tokenType: MfaTokenType = 'mfa_pending';
}
