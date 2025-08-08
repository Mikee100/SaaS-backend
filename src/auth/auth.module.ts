import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from '../user/user.module';
import { JwtStrategy } from './jwt.strategy';
import { AuditLogService } from '../audit-log.service';
import { PrismaModule } from '../prisma.module';
import { ConfigurationService } from '../config/configuration.service';

@Module({
  imports: [
    UserModule,
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [AuthService, JwtStrategy, AuditLogService, ConfigurationService],
  controllers: [AuthController],
})
export class AuthModule {}
