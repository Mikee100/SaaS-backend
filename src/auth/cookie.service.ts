import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import {
  AUTH_COOKIE_NAMES,
  ACCESS_TOKEN_TTL_SEC,
  REFRESH_TOKEN_TTL_SEC,
  COOKIE_SECURE,
  COOKIE_DOMAIN,
  COOKIE_SAME_SITE_ACCESS,
  COOKIE_SAME_SITE_REFRESH,
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

  clearAuthCookies(res: Response): void {
    const opts = {
      httpOnly: true,
      secure: COOKIE_SECURE,
      path: '/',
      maxAge: 0,
      ...(COOKIE_DOMAIN && { domain: COOKIE_DOMAIN }),
    };
    res.cookie(AUTH_COOKIE_NAMES.ACCESS_TOKEN, '', opts);
    res.cookie(AUTH_COOKIE_NAMES.REFRESH_TOKEN, '', opts);
  }
}
