import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigurationService } from '../config/configuration.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'waweru',
    });
    this.logger.log('JWT Strategy initialized');
  }

  async validate(payload: any) {
    this.logger.log('JWT payload:', JSON.stringify(payload));
    const user = { userId: payload.sub, email: payload.email, ...payload };
    this.logger.log('User object returned:', JSON.stringify(user));
    return user;
  }
}
