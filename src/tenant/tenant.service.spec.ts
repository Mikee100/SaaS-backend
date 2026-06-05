import { Test, TestingModule } from '@nestjs/testing';
import { TenantService } from './tenant.service';
import { PrismaService } from '../prisma.service';
import { UserService } from '../user/user.service';
import { BranchService } from '../branch/branch.service';
import { TenantConfigurationService } from '../config/tenant-configuration.service';
import { ClassificationService } from '../classification/classification.service';

describe('TenantService', () => {
  let service: TenantService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantService,
        { provide: PrismaService, useValue: {} },
        { provide: UserService, useValue: {} },
        { provide: BranchService, useValue: {} },
        { provide: TenantConfigurationService, useValue: {} },
        { provide: ClassificationService, useValue: {} },
      ],
    }).compile();

    service = module.get<TenantService>(TenantService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
