import { Test, TestingModule } from '@nestjs/testing';
import { RestaurantOrderService } from './restaurant-order.service';
import { PrismaService } from '../../../prisma.service';
import { SalesService } from '../../../sales/sales.service';

describe('RestaurantOrderService', () => {
  let service: RestaurantOrderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RestaurantOrderService,
        { provide: PrismaService, useValue: {} },
        { provide: SalesService, useValue: {} },
      ],
    }).compile();

    service = module.get<RestaurantOrderService>(RestaurantOrderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
