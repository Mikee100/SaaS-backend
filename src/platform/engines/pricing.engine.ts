import { Injectable } from '@nestjs/common';
import { PricingContext, PricingEngine, PricingResult } from '../engine.interfaces';

@Injectable()
export class PlatformPricingEngine implements PricingEngine {
  async calculate(context: PricingContext): Promise<PricingResult> {
    const hour = (context.timestamp || new Date()).getHours();

    if (hour >= 16 && hour < 18) {
      return {
        effectivePrice: Number((context.basePrice * 0.95).toFixed(2)),
        appliedStrategy: 'TIME_WINDOW',
      };
    }

    if (context.basePrice >= 10000) {
      return {
        effectivePrice: Number((context.basePrice * 0.9).toFixed(2)),
        appliedStrategy: 'MARKDOWN',
      };
    }

    return {
      effectivePrice: context.basePrice,
      appliedStrategy: 'STANDARD',
    };
  }
}
