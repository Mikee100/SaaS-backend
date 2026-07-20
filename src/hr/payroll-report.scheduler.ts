import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { EmailService } from '../email/email.service';
import { HrService } from './hr.service';

@Injectable()
export class PayrollReportScheduler {
  private readonly logger = new Logger(PayrollReportScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly hrService: HrService,
  ) {}

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_NOON)
  async handleMonthlyPayrollReport() {
    this.logger.log('Generating monthly payroll summary reports...');

    const now = new Date();
    const reportMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const month = reportMonthDate.getMonth() + 1;
    const year = reportMonthDate.getFullYear();

    const tenants = await this.prisma.tenant.findMany({
      where: { deletedAt: null, isSuspended: false },
      select: { id: true, name: true, contactEmail: true, currency: true },
    });

    for (const tenant of tenants) {
      try {
        await this.sendTenantPayrollReport(tenant, month, year);
      } catch (error) {
        this.logger.error(
          `Failed to send payroll report for tenant ${tenant.id}:`,
          error,
        );
      }
    }

    this.logger.log('Monthly payroll summary report run completed');
  }

  private async sendTenantPayrollReport(
    tenant: {
      id: string;
      name: string;
      contactEmail: string;
      currency: string | null;
    },
    month: number,
    year: number,
  ) {
    if (!tenant.contactEmail) {
      return;
    }

    const runs = await this.hrService.listPayrollRuns(tenant.id, month, year);
    const postedRuns = runs.filter(
      (run) => (run.status || 'posted') === 'posted',
    );

    if (postedRuns.length === 0) {
      this.logger.log(
        `No posted payroll runs for tenant ${tenant.id} in ${month}/${year}; skipping report.`,
      );
      return;
    }

    const totals = postedRuns.reduce(
      (acc, run) => {
        acc.headcount += run.processedCount || 0;
        acc.grossPay += run.totals?.grossPay || 0;
        acc.netPay += run.totals?.netPay || 0;
        acc.paidAmount += run.totals?.paidAmount || 0;
        acc.paye += run.liabilityTotals?.paye || 0;
        acc.nssf +=
          (run.liabilityTotals?.nssfEmployee || 0) +
          (run.liabilityTotals?.nssfEmployer || 0);
        acc.health += run.liabilityTotals?.healthInsuranceEmployee || 0;
        acc.housingLevy +=
          (run.liabilityTotals?.housingLevyEmployee || 0) +
          (run.liabilityTotals?.housingLevyEmployer || 0);
        return acc;
      },
      {
        headcount: 0,
        grossPay: 0,
        netPay: 0,
        paidAmount: 0,
        paye: 0,
        nssf: 0,
        health: 0,
        housingLevy: 0,
      },
    );

    const currency = tenant.currency || 'KES';
    const monthName = new Date(year, month - 1, 1).toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    });
    const money = (value: number) =>
      `${currency} ${value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

    const row = (label: string, value: string) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#334155;">${label}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:#0f172a;">${value}</td>
      </tr>`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color:#0f172a;">Payroll Summary — ${monthName}</h2>
        <p style="color:#475569;">Hi ${tenant.name}, here is your payroll summary for ${monthName}, covering ${postedRuns.length} posted payroll run(s).</p>
        <table style="width:100%;border-collapse:collapse;margin-top:12px;">
          <tbody>
            ${row('Employees Paid', String(totals.headcount))}
            ${row('Gross Pay', money(totals.grossPay))}
            ${row('PAYE', money(totals.paye))}
            ${row('NSSF (Employee + Employer)', money(totals.nssf))}
            ${row('Health Insurance (SHIF)', money(totals.health))}
            ${row('Housing Levy (Employee + Employer)', money(totals.housingLevy))}
            ${row('Net Pay', money(totals.netPay))}
            ${row('Amount Paid Out', money(totals.paidAmount))}
          </tbody>
        </table>
        <p style="font-size:12px;color:#94a3b8;margin-top:20px;">This is an automated monthly payroll summary. Log in to the Payroll page for full per-employee detail and compliance reports (P9/P10).</p>
      </div>
    `;

    this.emailService.sendPayrollSummaryEmail(
      tenant.contactEmail,
      `Payroll Summary — ${monthName}`,
      html,
    );
  }
}
