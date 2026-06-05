import { Test, TestingModule } from '@nestjs/testing';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { UserService } from '../user/user.service';
import { LogoService } from './logo.service';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('TenantController', () => {
  let controller: TenantController;

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      controllers: [TenantController],
      providers: [
        { provide: TenantService, useValue: {} },
        { provide: UserService, useValue: {} },
        { provide: LogoService, useValue: {} },
      ],
    });

    const module: TestingModule = await moduleBuilder
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TenantController>(TenantController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
