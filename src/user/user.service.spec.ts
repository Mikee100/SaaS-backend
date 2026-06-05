import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../prisma.service';
import { AuditLogService } from '../audit-log.service';
import { SubscriptionService } from '../billing/subscription.service';
import { EmailService } from '../email/email.service';

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: {} },
        { provide: AuditLogService, useValue: {} },
        { provide: SubscriptionService, useValue: {} },
        { provide: EmailService, useValue: {} },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
