<<<<<<< HEAD
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
=======
import { Injectable, Logger } from '@nestjs/common';
>>>>>>> a9ab4d8c5762126916fa97fc22de1f53d95703c1
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigurationService } from '../config/configuration.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

<<<<<<< HEAD
  constructor(private readonly configurationService: ConfigurationService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your_jwt_secret',
      passReqToCallback: true,
=======
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'waweru',
>>>>>>> a9ab4d8c5762126916fa97fc22de1f53d95703c1
    });
    this.logger.log('JWT Strategy initialized');
  }

<<<<<<< HEAD
  async onModuleInit() {
    try {
      const secret = await this.configurationService.getJwtSecret();
      (this as any)._strategy._secretOrKey = secret;
    } catch (error) {
      console.warn('JWT_SECRET not configured, using fallback');
    }
  }

  async validate(req: any, payload: any) {
    this.logger.debug('Validating JWT payload');
    
    if (!payload) {
      this.logger.error('Empty JWT payload');
      throw new UnauthorizedException('Invalid token: No payload');
    }

    // Required fields
    if (!payload.sub) {
      this.logger.error('Missing sub in JWT payload');
      throw new UnauthorizedException('Invalid token: Missing subject');
    }

    // Ensure roles is always an array
    const roles = Array.isArray(payload.roles) ? payload.roles : [];

    // Create user object with safe defaults
    const user = {
      id: payload.sub,
      email: payload.email || null,
      name: payload.name || null,
      tenantId: payload.tenantId || null,
      roles: roles,
    };
    this.logger.debug(`Validated user: ${user.email || user.id}`);
=======
  async validate(payload: any) {
    this.logger.log('JWT payload:', JSON.stringify(payload));
    const user = { userId: payload.sub, email: payload.email, ...payload };
    this.logger.log('User object returned:', JSON.stringify(user));
>>>>>>> a9ab4d8c5762126916fa97fc22de1f53d95703c1
    return user;
  }
}