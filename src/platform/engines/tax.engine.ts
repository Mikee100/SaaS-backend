import { Injectable } from '@nestjs/common';
import { TaxContext, TaxEngine, TaxResult } from '../engine.interfaces';

@Injectable()
export class PlatformTaxEngine implements TaxEngine {
  async compute(context: TaxContext): Promise<TaxResult> {
    const rate = 0.16;

    if (context.inclusive) {
      const netAmount = Number((context.amount / (1 + rate)).toFixed(2));
      const taxAmount = Number((context.amount - netAmount).toFixed(2));
      return {
        netAmount,
        taxAmount,
        grossAmount: context.amount,
      };
    }

    const taxAmount = Number((context.amount * rate).toFixed(2));
    return {
      netAmount: context.amount,
      taxAmount,
      grossAmount: Number((context.amount + taxAmount).toFixed(2)),
    };
  }
}
