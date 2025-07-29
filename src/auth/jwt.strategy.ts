import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your_jwt_secret',
    });
  }

  async validate(payload: any) {
    console.log('JwtStrategy.validate payload:', payload);
    // payload contains: sub, email, tenantId, roles, etc.
    return {
      id: payload.sub, // Changed from userId to id
      email: payload.email,
      tenantId: payload.tenantId,
      roles: payload.roles,
    };
  }
}