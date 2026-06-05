import { Test, TestingModule } from '@nestjs/testing';
import { RestaurantController } from './restaurant.controller';
import { DiningTableService } from './services/dining-table/dining-table.service';
import { RestaurantOrderService } from './services/restaurant-order/restaurant-order.service';
import { RestaurantBomService } from './services/restaurant-bom/restaurant-bom.service';
import { PrismaService } from '../prisma.service';

describe('RestaurantController', () => {
  let controller: RestaurantController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RestaurantController],
      providers: [
        { provide: DiningTableService, useValue: {} },
        { provide: RestaurantOrderService, useValue: {} },
        { provide: RestaurantBomService, useValue: {} },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<RestaurantController>(RestaurantController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
