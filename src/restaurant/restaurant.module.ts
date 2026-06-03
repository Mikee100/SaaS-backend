import { Module } from '@nestjs/common';
import { RestaurantController } from './restaurant.controller';
import { RestaurantService } from './restaurant.service';
import { DiningTableService } from './services/dining-table/dining-table.service';
import { RestaurantOrderService } from './services/restaurant-order/restaurant-order.service';
import { SalesModule } from '../sales/sales.module';

@Module({
  imports: [SalesModule],
  controllers: [RestaurantController],
  providers: [RestaurantService, DiningTableService, RestaurantOrderService]
})
export class RestaurantModule {}
