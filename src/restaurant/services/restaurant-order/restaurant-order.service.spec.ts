import { Test, TestingModule } from '@nestjs/testing';
import { RestaurantOrderService } from './restaurant-order.service';

describe('RestaurantOrderService', () => {
  let service: RestaurantOrderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RestaurantOrderService],
    }).compile();

    service = module.get<RestaurantOrderService>(RestaurantOrderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
