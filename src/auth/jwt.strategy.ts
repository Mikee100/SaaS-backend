import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { AUTH_COOKIE_NAMES } from './constants';

/** Extract JWT from cookie (enterprise auth) or Authorization Bearer (legacy / Electron). */
function jwtFromCookieOrBearer(req: Request): string | null {
  const cookieToken = req?.cookies?.[AUTH_COOKIE_NAMES.ACCESS_TOKEN];
  if (cookieToken) return cookieToken;
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor() {
    super({
      jwtFromRequest: jwtFromCookieOrBearer,
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'waweru',
    });
  }

  async validate(payload: any) {
    const user = { userId: payload.sub, email: payload.email, ...payload };
    return user;
  }
}
