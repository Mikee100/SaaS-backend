import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';
import { PrismaService } from '../prisma.service';
import { CacheService } from '../cache/cache.service';
import { AuditLogService } from '../audit-log.service';
import { BillingService } from '../billing/billing.service';
import { SubscriptionService } from '../billing/subscription.service';
import { LedgerService } from '../ledger/ledger.service';

describe('ProductService', () => {
  let service: ProductService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: PrismaService, useValue: {} },
        { provide: CacheService, useValue: {} },
        { provide: AuditLogService, useValue: {} },
        { provide: BillingService, useValue: {} },
        { provide: SubscriptionService, useValue: {} },
        { provide: LedgerService, useValue: {} },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
