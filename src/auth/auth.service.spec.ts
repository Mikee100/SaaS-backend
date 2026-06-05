import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.services';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { AuditLogService } from '../audit-log.service';
import { EmailService } from '../email/email.service';
import { BillingService } from '../billing/billing.service';
import { PrismaService } from '../prisma.service';
import { SessionService } from './session.service';
import { DeviceService } from './device.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: {} },
        { provide: JwtService, useValue: {} },
        { provide: AuditLogService, useValue: {} },
        { provide: EmailService, useValue: {} },
        { provide: BillingService, useValue: {} },
        { provide: PrismaService, useValue: {} },
        { provide: SessionService, useValue: {} },
        { provide: DeviceService, useValue: {} },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
