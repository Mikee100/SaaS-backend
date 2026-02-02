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
import { EmailModule } from '../email/email.module';
import { BillingModule } from '../billing/billing.module';
import { SubscriptionService } from '../billing/subscription.service';
import { PrismaService } from '../prisma.service';
import { TrialGuard } from './trial.guard';
import { CookieService } from './cookie.service';
import { SessionService } from './session.service';
import { DeviceService } from './device.service';

@Module({
  imports: [
    UserModule,
    PrismaModule,
    PassportModule,
    EmailModule,
    BillingModule,
    JwtModule.register({
      secret:
        process.env.JWT_SECRET || 'fallback_jwt_secret_please_use_env_var',
      signOptions: {
        expiresIn: '15m',
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
  providers: [
    AuthService,
    JwtStrategy,
    AuditLogService,
    ConfigurationService,
    TrialGuard,
    SubscriptionService,
    CookieService,
    SessionService,
    DeviceService,
  ],
  controllers: [AuthController],
  exports: [AuthService, SessionService, CookieService],
})
export class AuthModule {}
