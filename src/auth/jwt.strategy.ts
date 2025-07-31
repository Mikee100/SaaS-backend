import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigurationService } from '../config/configuration.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configurationService: ConfigurationService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your_jwt_secret', // Fallback for initial setup
    });
  }

  async onModuleInit() {
    // Update the secret from configuration service
    try {
      const secret = await this.configurationService.getJwtSecret();
      (this as any)._strategy._secretOrKey = secret;
    } catch (error) {
      console.warn('JWT_SECRET not configured, using fallback');
    }
  }

  async validate(payload: any) {
    // payload contains: sub, email, tenantId, roles, etc.
    return {
      id: payload.sub, // Changed from userId to id
      email: payload.email,
      tenantId: payload.tenantId,
      roles: payload.roles,
    };
  }
}