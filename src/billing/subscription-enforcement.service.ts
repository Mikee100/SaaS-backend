import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class SubscriptionEnforcementService {
  private readonly logger = new Logger(SubscriptionEnforcementService.name);
  private static readonly BASE_GRACE_DAYS = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async enforceMonthlyBillingPolicies() {
    this.logger.log('Running monthly subscription enforcement policy');

    const now = new Date();

    const tenants = await this.prisma.tenant.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        contactEmail: true,
        isSuspended: true,
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            userRoles: {
              select: {
                role: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        Subscription: {
          orderBy: {
            currentPeriodStart: 'desc',
          },
          take: 1,
          select: {
            id: true,
            status: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            isTrial: true,
            scheduledPlanId: true,
            scheduledEffectiveDate: true,
          },
        },
      },
    });

    for (const tenant of tenants) {
      const latestSubscription = tenant.Subscription?.[0];
      if (!latestSubscription) {
        continue;
      }

      // Activate scheduled plan change if due
      if (
        latestSubscription.scheduledPlanId &&
        latestSubscription.scheduledEffectiveDate &&
        new Date(latestSubscription.scheduledEffectiveDate) <= now
      ) {
        try {
          await this.prisma.subscription.update({
            where: { id: latestSubscription.id },
            data: {
              planId: latestSubscription.scheduledPlanId,
              scheduledPlanId: null,
              scheduledEffectiveDate: null,
            },
          });
          this.logger.log(
            `Activated scheduled plan for tenant ${tenant.id} (subscription ${latestSubscription.id})`,
          );
        } catch (err) {
          this.logger.error(
            `Failed to activate scheduled plan for tenant ${tenant.id}:`,
            err,
          );
        }
      }

      try {
        await this.enforceForTenant(tenant, latestSubscription, now);
      } catch (error) {
        this.logger.error(
          `Failed enforcing subscription policy for tenant ${tenant.id}`,
          error,
        );
      }
    }
  }

  private async enforceForTenant(
    tenant: {
      id: string;
      name: string;
      contactEmail: string;
      isSuspended: boolean;
      users: Array<{
        id: string;
        email: string;
        name: string;
        userRoles: Array<{ role: { name: string } }>;
      }>;
    },
    subscription: {
      id: string;
      status: string;
      currentPeriodStart: Date;
      currentPeriodEnd: Date;
      isTrial: boolean;
    },
    now: Date,
  ) {
    const daysUntilExpiry = this.diffInDays(subscription.currentPeriodEnd, now);

    if (subscription.currentPeriodEnd > now) {
      if (daysUntilExpiry === 7) {
        await this.sendOwnerAlertOncePerCycle({
          tenant,
          subscription,
          type: 'subscription_dunning_t_minus_7',
          title: 'Subscription renewal reminder (7 days)',
          message:
            'Your subscription renews in 7 days. Please confirm payment to avoid interruption.',
          emailSubject: 'Renewal reminder: 7 days remaining',
          emailBody: this.buildDunningEmailBody(tenant.name, 7, true),
        });
      }

      if (daysUntilExpiry === 3) {
        await this.sendOwnerAlertOncePerCycle({
          tenant,
          subscription,
          type: 'subscription_dunning_t_minus_3',
          title: 'Subscription renewal reminder (3 days)',
          message:
            'Your subscription renews in 3 days. Please renew now to avoid grace/suspension actions.',
          emailSubject: 'Renewal reminder: 3 days remaining',
          emailBody: this.buildDunningEmailBody(tenant.name, 3, true),
        });
      }

      await this.tryAutoReactivateTenant(tenant, subscription, now);
      return;
    }

    const extraGraceDays = await this.getExtraGraceDays(
      tenant.id,
      subscription.currentPeriodStart,
      subscription.id,
    );
    const totalGraceDays =
      SubscriptionEnforcementService.BASE_GRACE_DAYS + extraGraceDays;

    const gracePeriodEndsAt = new Date(subscription.currentPeriodEnd);
    gracePeriodEndsAt.setDate(gracePeriodEndsAt.getDate() + totalGraceDays);

    if (now <= gracePeriodEndsAt) {
      const daysAfterExpiry = this.diffInDays(
        now,
        subscription.currentPeriodEnd,
      );

      if (daysAfterExpiry === 1) {
        await this.sendOwnerAlertOncePerCycle({
          tenant,
          subscription,
          type: 'subscription_dunning_t_plus_1',
          title: 'Subscription expired (1 day ago)',
          message:
            'Your subscription expired yesterday. Renew now to avoid suspension after grace period.',
          emailSubject: 'Subscription expired: renew now',
          emailBody: this.buildDunningEmailBody(tenant.name, 1, false),
        });
      }

      if (daysAfterExpiry === 7) {
        await this.sendOwnerAlertOncePerCycle({
          tenant,
          subscription,
          type: 'subscription_dunning_t_plus_7',
          title: 'Subscription expired (7 days ago)',
          message:
            'Your subscription has been expired for 7 days. Immediate renewal is required to restore operations.',
          emailSubject: 'Subscription overdue by 7 days',
          emailBody: this.buildDunningEmailBody(tenant.name, 7, false),
        });
      }

      if (
        subscription.status === 'active' ||
        subscription.status === 'trialing'
      ) {
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: 'past_due' },
        });
      }

      const daysRemainingInGrace = Math.max(
        0,
        Math.ceil(
          (gracePeriodEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        ),
      );

      await this.sendOwnerAlertOncePerCycle({
        tenant,
        subscription,
        type: 'subscription_expiry_alert',
        title: 'Subscription expired - action required',
        message: `Your monthly subscription expired on ${subscription.currentPeriodEnd.toDateString()}. Renew within ${daysRemainingInGrace} day(s) to avoid temporary account suspension.`,
        emailSubject: `Subscription expired - renew in ${totalGraceDays} days`,
        emailBody: this.buildExpiryEmailBody(
          tenant.name,
          subscription.currentPeriodEnd,
          daysRemainingInGrace,
        ),
      });

      return;
    }

    if (!tenant.isSuspended) {
      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: { isSuspended: true },
      });
    }

    if (subscription.status !== 'expired') {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'expired' },
      });
    }

    await this.sendOwnerAlertOncePerCycle({
      tenant,
      subscription,
      type: 'subscription_auto_suspended',
      title: 'Tenant access restricted',
      message:
        'Your subscription was not renewed within 3 days after expiry. Tenant access is now restricted until renewal.',
      emailSubject: 'Tenant access restricted due to non-renewal',
      emailBody: this.buildSuspensionEmailBody(tenant.name),
    });
  }

  private async tryAutoReactivateTenant(
    tenant: {
      id: string;
      name: string;
      contactEmail: string;
      isSuspended: boolean;
      users: Array<{
        id: string;
        email: string;
        name: string;
        userRoles: Array<{ role: { name: string } }>;
      }>;
    },
    subscription: {
      id: string;
      status: string;
      currentPeriodStart: Date;
      currentPeriodEnd: Date;
      isTrial: boolean;
    },
    now: Date,
  ) {
    if (!tenant.isSuspended) {
      return;
    }

    const wasAutoSuspended = await this.prisma.notification.findFirst({
      where: {
        tenantId: tenant.id,
        type: 'subscription_auto_suspended',
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
      },
    });

    if (!wasAutoSuspended) {
      return;
    }

    const renewed =
      (subscription.status === 'active' ||
        subscription.status === 'trialing' ||
        subscription.status === 'past_due') &&
      subscription.currentPeriodEnd > now;

    if (!renewed) {
      return;
    }

    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: { isSuspended: false },
    });

    await this.sendOwnerAlertOncePerCycle({
      tenant,
      subscription,
      type: 'subscription_reactivated',
      title: 'Tenant account reactivated',
      message:
        'Subscription renewal confirmed. Tenant access restrictions have been removed.',
      emailSubject: 'Tenant account reactivated',
      emailBody: this.buildReactivationEmailBody(tenant.name),
    });
  }

  private async sendOwnerAlertOncePerCycle(params: {
    tenant: {
      id: string;
      name: string;
      contactEmail: string;
      users: Array<{
        id: string;
        email: string;
        name: string;
        userRoles: Array<{ role: { name: string } }>;
      }>;
    };
    subscription: {
      currentPeriodStart: Date;
      currentPeriodEnd: Date;
    };
    type: string;
    title: string;
    message: string;
    emailSubject: string;
    emailBody: string;
  }) {
    const alreadyNotified = await this.prisma.notification.findFirst({
      where: {
        tenantId: params.tenant.id,
        type: params.type,
        createdAt: {
          gte: params.subscription.currentPeriodStart,
        },
      },
      select: {
        id: true,
      },
    });

    if (alreadyNotified) {
      return;
    }

    const ownerOrAdminUsers = params.tenant.users.filter((user) =>
      user.userRoles.some((r) => {
        const name = r.role?.name?.toLowerCase();
        return name === 'owner' || name === 'admin';
      }),
    );

    const targetUsers = ownerOrAdminUsers.length
      ? ownerOrAdminUsers
      : params.tenant.users;

    for (const user of targetUsers) {
      await this.prisma.notification.create({
        data: {
          id: this.newId('notif'),
          type: params.type,
          title: params.title,
          message: params.message,
          tenantId: params.tenant.id,
          userId: user.id,
          data: {
            subscriptionPeriodStart: params.subscription.currentPeriodStart,
            subscriptionPeriodEnd: params.subscription.currentPeriodEnd,
          },
        },
      });
    }

    const emails = new Set<string>();

    if (params.tenant.contactEmail) {
      emails.add(params.tenant.contactEmail);
    }

    targetUsers
      .map((u) => u.email)
      .filter((email) => !!email)
      .forEach((email) => emails.add(email));

    for (const email of emails) {
      try {
        await this.emailService.sendPaymentConfirmationEmail(
          email,
          params.emailSubject,
          params.emailBody,
        );
      } catch {
        this.logger.warn(`Failed to send subscription alert email to ${email}`);
      }
    }
  }

  private buildExpiryEmailBody(
    tenantName: string,
    expiredAt: Date,
    graceDaysLeft: number,
  ) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
        <h2>Subscription expired</h2>
        <p>Hello ${tenantName},</p>
        <p>Your monthly subscription expired on <strong>${expiredAt.toDateString()}</strong>.</p>
        <p>Please renew within <strong>${graceDaysLeft} day(s)</strong> to avoid temporary account suspension.</p>
      </div>
    `;
  }

  private buildSuspensionEmailBody(tenantName: string) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
        <h2>Tenant access restricted</h2>
        <p>Hello ${tenantName},</p>
        <p>Your subscription was not renewed within 3 days after expiry.</p>
        <p>Login is still available, but tenant resources are restricted until renewal. Renew your subscription to restore full access.</p>
      </div>
    `;
  }

  private buildReactivationEmailBody(tenantName: string) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
        <h2>Tenant account reactivated</h2>
        <p>Hello ${tenantName},</p>
        <p>Your subscription has been renewed and all linked accounts are active again.</p>
      </div>
    `;
  }

  private buildDunningEmailBody(
    tenantName: string,
    days: number,
    beforeExpiry: boolean,
  ) {
    const phrase = beforeExpiry
      ? `${days} day(s) before renewal date`
      : `${days} day(s) after subscription expiry`;

    return `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
        <h2>Subscription reminder</h2>
        <p>Hello ${tenantName},</p>
        <p>This is an automated reminder sent <strong>${phrase}</strong>.</p>
        <p>Please complete renewal to keep billing and account access in good standing.</p>
      </div>
    `;
  }

  private newId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private async getExtraGraceDays(
    tenantId: string,
    periodStart: Date,
    subscriptionId: string,
  ): Promise<number> {
    const extensions = await this.prisma.notification.findMany({
      where: {
        tenantId,
        type: 'subscription_grace_extension',
        createdAt: {
          gte: periodStart,
        },
      },
      select: {
        data: true,
      },
    });

    return extensions.reduce((sum, extension) => {
      const data = extension.data as {
        days?: number;
        subscriptionId?: string;
      } | null;
      if (!data) {
        return sum;
      }
      if (data.subscriptionId && data.subscriptionId !== subscriptionId) {
        return sum;
      }
      const days = Number(data.days || 0);
      if (!Number.isFinite(days) || days <= 0) {
        return sum;
      }
      return sum + Math.floor(days);
    }, 0);
  }

  private diffInDays(left: Date, right: Date): number {
    const l = new Date(left);
    l.setHours(0, 0, 0, 0);
    const r = new Date(right);
    r.setHours(0, 0, 0, 0);
    return Math.round((l.getTime() - r.getTime()) / (1000 * 60 * 60 * 24));
  }
}
