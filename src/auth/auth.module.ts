import { Module } from '@nestjs/common';
import { AuthService } from './auth.services';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from '../user/user.module';
import { JwtStrategy } from './jwt.strategy';
import { AuditLogService } from '../audit-log.service';
import { PrismaModule } from '../prisma.module';
import { ConfigurationService } from '../config/configuration.service';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    UserModule,
    PrismaModule,
    PassportModule,
    JwtModule.register({
      secret:
        process.env.JWT_SECRET || 'fallback_jwt_secret_please_use_env_var',
      signOptions: {
        expiresIn: '1d',
        algorithm: 'HS256',
        issuer: 'saas-platform',
        audience: 'saas-platform-client',
      },
      verifyOptions: {
        algorithms: ['HS256'],
        ignoreExpiration: false,
        issuer: 'saas-platform',
        audience: 'saas-platform-client',
      },
    }),
  ],
  providers: [AuthService, JwtStrategy, AuditLogService, ConfigurationService],
  controllers: [AuthController],
})
export class AuthModule {}
