import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { SubscriptionService } from '../billing/subscription.service';
import { PrismaService } from '../prisma.service';

@Injectable()
export class TrialGuard implements CanActivate {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Check if user is superadmin - they can always access (even without tenantId)
    if (user.isSuperadmin) {
      return true;
    }

    // For non-superadmin users, tenantId is required
    if (!user.tenantId) {
      throw new ForbiddenException('Tenant not found');
    }

    // Check trial status
    const trialStatus = await this.subscriptionService.checkTrialStatus(
      user.tenantId,
    );

    // Only block access if trial is expired AND subscription status is 'expired'
    // This allows continued access even after trial end date if admin hasn't disabled trial mode
    if (trialStatus.isTrial && trialStatus.trialExpired) {
      // Check if subscription is still in 'expired' status (admin hasn't disabled trial)
      const subscription = await this.prisma.subscription.findFirst({
        where: {
          tenantId: user.tenantId,
          isTrial: true,
          status: 'expired',
        },
      });

      if (subscription) {
        throw new ForbiddenException(
          'Trial period has expired. Please upgrade your subscription.',
        );
      }
    }

    return true;
  }
}
