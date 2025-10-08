import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ScheduledSubscriptionChangesService {
  private readonly logger = new Logger(ScheduledSubscriptionChangesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async processScheduledChanges() {
    this.logger.log('Processing scheduled subscription changes...');

    const now = new Date();

    // Find subscriptions with scheduled changes effective now or earlier
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        scheduledEffectiveDate: {
          lte: now,
        },
        scheduledPlanId: {
          not: null,
        },
      },
    });

    for (const subscription of subscriptions) {
      try {
        // Update subscription to scheduled plan
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            planId: subscription.scheduledPlanId!,
            scheduledPlanId: null,
            scheduledEffectiveDate: null,
          },
        });

        this.logger.log(
          `Processed scheduled change for subscription ${subscription.id}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to process scheduled change for subscription ${subscription.id}`,
          error,
        );
      }
    }
  }
}
