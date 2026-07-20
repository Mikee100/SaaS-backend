import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import {
  AUTH_COOKIE_NAMES,
  ACCESS_TOKEN_TTL_SEC,
  COOKIE_SECURE,
  COOKIE_DOMAIN,
  COOKIE_SAME_SITE_ACCESS,
  COOKIE_SAME_SITE_REFRESH,
  MFA_COOKIE_PATH,
  MFA_ENROLL_TOKEN_TTL_SEC,
  MFA_PENDING_TOKEN_TTL_SEC,
} from './constants';

@Injectable()
export class CookieService {
  setAccessToken(res: Response, accessToken: string): void {
    res.cookie(AUTH_COOKIE_NAMES.ACCESS_TOKEN, accessToken, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: COOKIE_SAME_SITE_ACCESS,
      maxAge: ACCESS_TOKEN_TTL_SEC * 1000,
      path: '/',
      ...(COOKIE_DOMAIN && { domain: COOKIE_DOMAIN }),
    });
  }

  setRefreshToken(res: Response, refreshToken: string): void {
    const ttlSec =
      parseInt(process.env.REFRESH_TOKEN_TTL_SEC || '', 10) || 7 * 24 * 60 * 60;
    res.cookie(AUTH_COOKIE_NAMES.REFRESH_TOKEN, refreshToken, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: COOKIE_SAME_SITE_REFRESH,
      maxAge: ttlSec * 1000,
      path: '/',
      ...(COOKIE_DOMAIN && { domain: COOKIE_DOMAIN }),
    });
  }

  setMfaEnrollToken(res: Response, token: string): void {
    res.cookie(AUTH_COOKIE_NAMES.MFA_ENROLL_TOKEN, token, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: COOKIE_SAME_SITE_ACCESS,
      maxAge: MFA_ENROLL_TOKEN_TTL_SEC * 1000,
      path: MFA_COOKIE_PATH,
      ...(COOKIE_DOMAIN && { domain: COOKIE_DOMAIN }),
    });
  }

  setMfaPendingToken(res: Response, token: string): void {
    res.cookie(AUTH_COOKIE_NAMES.MFA_PENDING_TOKEN, token, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: COOKIE_SAME_SITE_ACCESS,
      maxAge: MFA_PENDING_TOKEN_TTL_SEC * 1000,
      path: MFA_COOKIE_PATH,
      ...(COOKIE_DOMAIN && { domain: COOKIE_DOMAIN }),
    });
  }

  clearAuthCookies(res: Response): void {
    const opts = {
      httpOnly: true,
      secure: COOKIE_SECURE,
      path: '/',
      maxAge: 0,
      sameSite: COOKIE_SAME_SITE_ACCESS,
      ...(COOKIE_DOMAIN && { domain: COOKIE_DOMAIN }),
    };
    res.cookie(AUTH_COOKIE_NAMES.ACCESS_TOKEN, '', opts);
    res.cookie(AUTH_COOKIE_NAMES.REFRESH_TOKEN, '', {
      ...opts,
      sameSite: COOKIE_SAME_SITE_REFRESH,
    });
    this.clearMfaCookies(res);
  }

  clearMfaCookies(res: Response): void {
    const opts = {
      httpOnly: true,
      secure: COOKIE_SECURE,
      path: MFA_COOKIE_PATH,
      maxAge: 0,
      sameSite: COOKIE_SAME_SITE_ACCESS,
      ...(COOKIE_DOMAIN && { domain: COOKIE_DOMAIN }),
    };
    res.cookie(AUTH_COOKIE_NAMES.MFA_ENROLL_TOKEN, '', opts);
    res.cookie(AUTH_COOKIE_NAMES.MFA_PENDING_TOKEN, '', opts);
  }
}
