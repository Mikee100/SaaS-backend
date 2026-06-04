import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma.service';

const EMPLOYEE_PROFILES_KEY = 'hr.employeeProfiles.v1';
const PAYROLL_TEMPLATES_KEY = 'hr.payrollTemplates.v1';
const PAYROLL_RUNS_KEY = 'hr.payrollRuns.v1';
const PAYROLL_SETTINGS_KEY = 'hr.payrollSettings.v1';
const PAYROLL_CONTROLS_KEY = 'hr.payrollControls.v1';

type TemplateType = 'bonus' | 'deduction' | 'commission';
type TemplateMode = 'fixed' | 'percentage';
type TemplateScope = 'all' | 'department' | 'employee';

export interface PayrollBand {
  upto: number | null;
  rate: number;
}

export interface PayrollSettings {
  countryCode: 'KE' | string;
  enabled: boolean;
  personalRelief: number;
  payeBands: PayrollBand[];
  nssfEnabled: boolean;
  nssfLowerLimit: number;
  nssfUpperLimit: number;
  nssfRateEmployee: number;
  nssfRateEmployer: number;
  healthInsuranceEnabled: boolean;
  healthInsuranceLabel: 'SHIF' | 'NHIF';
  healthInsuranceRateEmployee: number;
  housingLevyEnabled: boolean;
  housingLevyRateEmployee: number;
  housingLevyRateEmployer: number;
}

export interface KenyaStatutoryResult {
  taxablePay: number;
  payeBeforeRelief: number;
  personalRelief: number;
  paye: number;
  nssfEmployee: number;
  nssfEmployer: number;
  healthInsuranceEmployee: number;
  housingLevyEmployee: number;
  housingLevyEmployer: number;
  totalEmployeeStatutory: number;
  totalEmployerStatutory: number;
}

export interface KenyaTaxPreset {
  id: string;
  name: string;
  effectiveFrom: string;
  notes?: string;
  settings: Partial<PayrollSettings>;
}

export interface EmployeeProfile {
  id: string;
  fullName: string;
  employeeNumber?: string;
  email?: string;
  phone?: string;
  department?: string;
  roleTitle?: string;
  employmentType?: 'permanent' | 'contract' | 'casual' | 'intern';
  status?: 'active' | 'inactive' | 'terminated' | 'on_leave';
  hireDate?: string;
  branchId?: string;
  salarySchemeId?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankName?: string;
  taxNumber?: string;
  nhifNumber?: string;
  nssfNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollTemplate {
  id: string;
  name: string;
  type: TemplateType;
  mode: TemplateMode;
  value: number;
  applyScope: TemplateScope;
  targetEmployeeIds?: string[];
  targetDepartments?: string[];
  branchId?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollRun {
  id: string;
  month: number;
  year: number;
  monthName: string;
  branchId?: string;
  processedBy: string;
  processedAt: string;
  status?: 'draft' | 'approved' | 'posted' | 'reversed' | 'cancelled';
  approvedBy?: string;
  approvedAt?: string;
  postedBy?: string;
  postedAt?: string;
  reversedBy?: string;
  reversedAt?: string;
  reversalReason?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  auditTrail?: Array<{
    action: string;
    by?: string;
    at: string;
    note?: string;
  }>;
  processedCount: number;
  reconciliationStatus: 'balanced' | 'variance_detected';
  liabilityTotals?: {
    paye: number;
    nssfEmployee: number;
    nssfEmployer: number;
    healthInsuranceEmployee: number;
    housingLevyEmployee: number;
    housingLevyEmployer: number;
    totalEmployeeStatutory: number;
    totalEmployerStatutory: number;
  };
  processedItems?: Array<{
    salarySchemeId: string;
    employeeName: string;
    expenseId: string;
    amount: number;
  }>;
  totals: {
    baseSalary: number;
    bonus: number;
    commission: number;
    deduction: number;
    nonTaxDeduction: number;
    statutoryDeductions: number;
    employerStatutoryContributions: number;
    grossPay: number;
    netPay: number;
    paidAmount: number;
    variance: number;
  };
  items: any[];
}

interface PayrollPeriodLock {
  month: number;
  year: number;
  branchId?: string;
  reason?: string;
  lockedBy: string;
  lockedAt: string;
}

interface PayrollControls {
  locks: PayrollPeriodLock[];
}

@Injectable()
export class HrService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly kenyaTaxPresets: KenyaTaxPreset[] = [
    {
      id: 'ke-2024-standard',
      name: 'Kenya Standard 2024+',
      effectiveFrom: '2024-01-01',
      notes: 'Default modern payroll profile with SHIF and housing levy.',
      settings: {
        countryCode: 'KE',
        enabled: true,
        personalRelief: 2400,
        payeBands: [
          { upto: 24000, rate: 0.1 },
          { upto: 32333, rate: 0.25 },
          { upto: null, rate: 0.3 },
        ],
        nssfEnabled: true,
        nssfLowerLimit: 8000,
        nssfUpperLimit: 72000,
        nssfRateEmployee: 0.06,
        nssfRateEmployer: 0.06,
        healthInsuranceEnabled: true,
        healthInsuranceLabel: 'SHIF',
        healthInsuranceRateEmployee: 0.0275,
        housingLevyEnabled: true,
        housingLevyRateEmployee: 0.015,
        housingLevyRateEmployer: 0.015,
      },
    },
    {
      id: 'ke-2023-legacy',
      name: 'Kenya Legacy (NHIF-era baseline)',
      effectiveFrom: '2023-01-01',
      notes: 'Fallback legacy profile for historical payroll modeling.',
      settings: {
        countryCode: 'KE',
        enabled: true,
        personalRelief: 2400,
        payeBands: [
          { upto: 24000, rate: 0.1 },
          { upto: 32333, rate: 0.25 },
          { upto: null, rate: 0.3 },
        ],
        nssfEnabled: true,
        nssfLowerLimit: 6000,
        nssfUpperLimit: 18000,
        nssfRateEmployee: 0.06,
        nssfRateEmployer: 0.06,
        healthInsuranceEnabled: true,
        healthInsuranceLabel: 'NHIF',
        healthInsuranceRateEmployee: 0.017,
        housingLevyEnabled: false,
        housingLevyRateEmployee: 0,
        housingLevyRateEmployer: 0,
      },
    },
  ];

  private getDefaultPayrollSettings(): PayrollSettings {
    return {
      countryCode: 'KE',
      enabled: true,
      personalRelief: 2400,
      payeBands: [
        { upto: 24000, rate: 0.1 },
        { upto: 32333, rate: 0.25 },
        { upto: null, rate: 0.3 },
      ],
      nssfEnabled: true,
      nssfLowerLimit: 8000,
      nssfUpperLimit: 72000,
      nssfRateEmployee: 0.06,
      nssfRateEmployer: 0.06,
      healthInsuranceEnabled: true,
      healthInsuranceLabel: 'SHIF',
      healthInsuranceRateEmployee: 0.0275,
      housingLevyEnabled: true,
      housingLevyRateEmployee: 0.015,
      housingLevyRateEmployer: 0.015,
    };
  }

  private clampAmount(value: unknown): number {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount) || amount < 0) {
      return 0;
    }

    return amount;
  }

  async getPayrollSettings(tenantId: string): Promise<PayrollSettings> {
    const saved = await this.readJsonConfig<Partial<PayrollSettings>>(
      tenantId,
      PAYROLL_SETTINGS_KEY,
      {},
    );

    return {
      ...this.getDefaultPayrollSettings(),
      ...saved,
      payeBands: Array.isArray(saved?.payeBands) && saved.payeBands.length > 0
        ? saved.payeBands
        : this.getDefaultPayrollSettings().payeBands,
    };
  }

  async updatePayrollSettings(tenantId: string, payload: Partial<PayrollSettings>) {
    const merged = {
      ...(await this.getPayrollSettings(tenantId)),
      ...payload,
    };

    if (!Array.isArray(merged.payeBands) || merged.payeBands.length === 0) {
      throw new BadRequestException('PAYE bands are required');
    }

    await this.writeJsonConfig(tenantId, PAYROLL_SETTINGS_KEY, merged);
    return merged;
  }

  listKenyaTaxPresets(): KenyaTaxPreset[] {
    return this.kenyaTaxPresets;
  }

  async applyKenyaTaxPreset(tenantId: string, presetId: string) {
    const preset = this.kenyaTaxPresets.find((item) => item.id === presetId);
    if (!preset) {
      throw new NotFoundException('Tax preset not found');
    }

    const current = await this.getPayrollSettings(tenantId);
    const next = {
      ...current,
      ...preset.settings,
    };

    await this.writeJsonConfig(tenantId, PAYROLL_SETTINGS_KEY, next);
    return {
      preset,
      settings: next,
    };
  }

  calculateKenyaStatutoryDeductions(
    grossPay: number,
    settings: PayrollSettings,
  ): KenyaStatutoryResult {
    const gross = this.clampAmount(grossPay);

    if (!settings.enabled || settings.countryCode !== 'KE') {
      return {
        taxablePay: gross,
        payeBeforeRelief: 0,
        personalRelief: 0,
        paye: 0,
        nssfEmployee: 0,
        nssfEmployer: 0,
        healthInsuranceEmployee: 0,
        housingLevyEmployee: 0,
        housingLevyEmployer: 0,
        totalEmployeeStatutory: 0,
        totalEmployerStatutory: 0,
      };
    }

    const pensionableForNssf = settings.nssfEnabled
      ? Math.max(0, Math.min(gross, settings.nssfUpperLimit))
      : 0;
    const nssfEmployee = settings.nssfEnabled
      ? pensionableForNssf * settings.nssfRateEmployee
      : 0;
    const nssfEmployer = settings.nssfEnabled
      ? pensionableForNssf * settings.nssfRateEmployer
      : 0;

    const taxablePay = Math.max(0, gross - nssfEmployee);

    let remaining = taxablePay;
    let previousUpper = 0;
    let payeBeforeRelief = 0;

    for (const band of settings.payeBands) {
      if (remaining <= 0) {
        break;
      }

      const bandUpper = band.upto === null ? Number.POSITIVE_INFINITY : band.upto;
      const taxableInBand = Math.max(0, Math.min(remaining, bandUpper - previousUpper));
      payeBeforeRelief += taxableInBand * band.rate;
      remaining -= taxableInBand;
      previousUpper = Number.isFinite(bandUpper) ? bandUpper : previousUpper;
    }

    const personalRelief = this.clampAmount(settings.personalRelief);
    const paye = Math.max(0, payeBeforeRelief - personalRelief);

    const healthInsuranceEmployee = settings.healthInsuranceEnabled
      ? gross * settings.healthInsuranceRateEmployee
      : 0;

    const housingLevyEmployee = settings.housingLevyEnabled
      ? gross * settings.housingLevyRateEmployee
      : 0;

    const housingLevyEmployer = settings.housingLevyEnabled
      ? gross * settings.housingLevyRateEmployer
      : 0;

    const totalEmployeeStatutory =
      nssfEmployee + paye + healthInsuranceEmployee + housingLevyEmployee;
    const totalEmployerStatutory = nssfEmployer + housingLevyEmployer;

    return {
      taxablePay,
      payeBeforeRelief,
      personalRelief,
      paye,
      nssfEmployee,
      nssfEmployer,
      healthInsuranceEmployee,
      housingLevyEmployee,
      housingLevyEmployer,
      totalEmployeeStatutory,
      totalEmployerStatutory,
    };
  }

  private async readJsonConfig<T>(tenantId: string, key: string, fallback: T): Promise<T> {
    const config = await this.prisma.tenantConfiguration.findUnique({
      where: {
        tenantId_key: {
          tenantId,
          key,
        },
      },
      select: {
        value: true,
      },
    });

    if (!config?.value) {
      return fallback;
    }

    try {
      return JSON.parse(config.value) as T;
    } catch {
      return fallback;
    }
  }

  private async writeJsonConfig<T>(tenantId: string, key: string, value: T): Promise<void> {
    await this.prisma.tenantConfiguration.upsert({
      where: {
        tenantId_key: {
          tenantId,
          key,
        },
      },
      update: {
        value: JSON.stringify(value),
        category: 'general',
        isEncrypted: false,
        isPublic: false,
        updatedAt: new Date(),
      },
      create: {
        id: uuidv4(),
        tenantId,
        key,
        value: JSON.stringify(value),
        category: 'general',
        description: `Generated config: ${key}`,
        isEncrypted: false,
        isPublic: false,
        updatedAt: new Date(),
      },
    });
  }

  async listEmployees(tenantId: string, branchId?: string, search?: string) {
    const employees = await this.readJsonConfig<EmployeeProfile[]>(
      tenantId,
      EMPLOYEE_PROFILES_KEY,
      [],
    );

    return employees
      .filter((employee) => {
        if (branchId && employee.branchId && employee.branchId !== branchId) {
          return false;
        }

        if (!search) {
          return true;
        }

        const needle = search.toLowerCase();
        return (
          employee.fullName.toLowerCase().includes(needle) ||
          (employee.employeeNumber || '').toLowerCase().includes(needle) ||
          (employee.department || '').toLowerCase().includes(needle) ||
          (employee.roleTitle || '').toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  async createEmployee(tenantId: string, payload: Partial<EmployeeProfile>) {
    if (!payload.fullName?.trim()) {
      throw new BadRequestException('Full name is required');
    }

    const employees = await this.readJsonConfig<EmployeeProfile[]>(
      tenantId,
      EMPLOYEE_PROFILES_KEY,
      [],
    );

    const now = new Date().toISOString();
    const employee: EmployeeProfile = {
      id: uuidv4(),
      fullName: payload.fullName.trim(),
      employeeNumber: payload.employeeNumber?.trim(),
      email: payload.email?.trim(),
      phone: payload.phone?.trim(),
      department: payload.department?.trim(),
      roleTitle: payload.roleTitle?.trim(),
      employmentType: payload.employmentType || 'permanent',
      status: payload.status || 'active',
      hireDate: payload.hireDate,
      branchId: payload.branchId,
      salarySchemeId: payload.salarySchemeId,
      bankAccountName: payload.bankAccountName?.trim(),
      bankAccountNumber: payload.bankAccountNumber?.trim(),
      bankName: payload.bankName?.trim(),
      taxNumber: payload.taxNumber?.trim(),
      nhifNumber: payload.nhifNumber?.trim(),
      nssfNumber: payload.nssfNumber?.trim(),
      notes: payload.notes?.trim(),
      createdAt: now,
      updatedAt: now,
    };

    employees.push(employee);
    await this.writeJsonConfig(tenantId, EMPLOYEE_PROFILES_KEY, employees);
    return employee;
  }

  async updateEmployee(tenantId: string, id: string, payload: Partial<EmployeeProfile>) {
    const employees = await this.readJsonConfig<EmployeeProfile[]>(
      tenantId,
      EMPLOYEE_PROFILES_KEY,
      [],
    );

    const index = employees.findIndex((employee) => employee.id === id);
    if (index < 0) {
      throw new NotFoundException('Employee profile not found');
    }

    employees[index] = {
      ...employees[index],
      ...payload,
      fullName: payload.fullName?.trim() || employees[index].fullName,
      updatedAt: new Date().toISOString(),
    };

    await this.writeJsonConfig(tenantId, EMPLOYEE_PROFILES_KEY, employees);
    return employees[index];
  }

  async deleteEmployee(tenantId: string, id: string) {
    const employees = await this.readJsonConfig<EmployeeProfile[]>(
      tenantId,
      EMPLOYEE_PROFILES_KEY,
      [],
    );

    const index = employees.findIndex((employee) => employee.id === id);
    if (index < 0) {
      throw new NotFoundException('Employee profile not found');
    }

    employees.splice(index, 1);
    await this.writeJsonConfig(tenantId, EMPLOYEE_PROFILES_KEY, employees);
    return { success: true };
  }

  async listPayrollTemplates(tenantId: string, onlyActive = false) {
    const templates = await this.readJsonConfig<PayrollTemplate[]>(
      tenantId,
      PAYROLL_TEMPLATES_KEY,
      [],
    );

    return templates
      .filter((template) => (onlyActive ? template.isActive : true))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async createPayrollTemplate(tenantId: string, payload: Partial<PayrollTemplate>) {
    if (!payload.name?.trim()) {
      throw new BadRequestException('Template name is required');
    }

    if (!payload.type || !['bonus', 'deduction', 'commission'].includes(payload.type)) {
      throw new BadRequestException('Template type must be bonus, commission, or deduction');
    }

    if (!payload.mode || !['fixed', 'percentage'].includes(payload.mode)) {
      throw new BadRequestException('Template mode must be fixed or percentage');
    }

    const value = Number(payload.value || 0);
    if (!Number.isFinite(value) || value <= 0) {
      throw new BadRequestException('Template value must be greater than zero');
    }

    const templates = await this.readJsonConfig<PayrollTemplate[]>(
      tenantId,
      PAYROLL_TEMPLATES_KEY,
      [],
    );

    const now = new Date().toISOString();
    const template: PayrollTemplate = {
      id: uuidv4(),
      name: payload.name.trim(),
      type: payload.type,
      mode: payload.mode,
      value,
      applyScope: payload.applyScope || 'all',
      targetEmployeeIds: Array.isArray(payload.targetEmployeeIds) ? payload.targetEmployeeIds : [],
      targetDepartments: Array.isArray(payload.targetDepartments) ? payload.targetDepartments : [],
      branchId: payload.branchId,
      isActive: payload.isActive ?? true,
      notes: payload.notes?.trim(),
      createdAt: now,
      updatedAt: now,
    };

    templates.push(template);
    await this.writeJsonConfig(tenantId, PAYROLL_TEMPLATES_KEY, templates);
    return template;
  }

  async updatePayrollTemplate(tenantId: string, id: string, payload: Partial<PayrollTemplate>) {
    const templates = await this.readJsonConfig<PayrollTemplate[]>(
      tenantId,
      PAYROLL_TEMPLATES_KEY,
      [],
    );

    const index = templates.findIndex((template) => template.id === id);
    if (index < 0) {
      throw new NotFoundException('Payroll template not found');
    }

    templates[index] = {
      ...templates[index],
      ...payload,
      name: payload.name?.trim() || templates[index].name,
      value: payload.value !== undefined ? Number(payload.value) : templates[index].value,
      targetEmployeeIds: Array.isArray(payload.targetEmployeeIds)
        ? payload.targetEmployeeIds
        : templates[index].targetEmployeeIds,
      targetDepartments: Array.isArray(payload.targetDepartments)
        ? payload.targetDepartments
        : templates[index].targetDepartments,
      updatedAt: new Date().toISOString(),
    };

    await this.writeJsonConfig(tenantId, PAYROLL_TEMPLATES_KEY, templates);
    return templates[index];
  }

  async deletePayrollTemplate(tenantId: string, id: string) {
    const templates = await this.readJsonConfig<PayrollTemplate[]>(
      tenantId,
      PAYROLL_TEMPLATES_KEY,
      [],
    );

    const index = templates.findIndex((template) => template.id === id);
    if (index < 0) {
      throw new NotFoundException('Payroll template not found');
    }

    templates.splice(index, 1);
    await this.writeJsonConfig(tenantId, PAYROLL_TEMPLATES_KEY, templates);
    return { success: true };
  }

  async listPayrollRuns(
    tenantId: string,
    month?: number,
    year?: number,
    branchId?: string,
    status?: string,
  ) {
    const runs = await this.readJsonConfig<PayrollRun[]>(tenantId, PAYROLL_RUNS_KEY, []);

    return runs
      .filter((run) => {
        if (month && run.month !== month) {
          return false;
        }

        if (year && run.year !== year) {
          return false;
        }

        if ((branchId || '') !== '' && (run.branchId || '') !== (branchId || '')) {
          return false;
        }

        if (status && (run.status || 'posted') !== status) {
          return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime());
  }

  private samePeriodBranch(
    run: { month: number; year: number; branchId?: string },
    month: number,
    year: number,
    branchId?: string,
  ): boolean {
    if (run.month !== month || run.year !== year) {
      return false;
    }

    const runBranch = run.branchId || '';
    const expectedBranch = branchId || '';
    return runBranch === expectedBranch;
  }

  async findPostedRunForPeriod(tenantId: string, month: number, year: number, branchId?: string) {
    const runs = await this.readJsonConfig<PayrollRun[]>(tenantId, PAYROLL_RUNS_KEY, []);
    return runs.find((run) => {
      const status = run.status || 'posted';
      if (!this.samePeriodBranch(run, month, year, branchId)) {
        return false;
      }

      return status === 'posted';
    });
  }

  async findActiveRunForPeriod(tenantId: string, month: number, year: number, branchId?: string) {
    const runs = await this.readJsonConfig<PayrollRun[]>(tenantId, PAYROLL_RUNS_KEY, []);
    return runs.find((run) => {
      const status = run.status || 'posted';
      if (!this.samePeriodBranch(run, month, year, branchId)) {
        return false;
      }

      return status !== 'reversed' && status !== 'cancelled';
    });
  }

  async getPayrollRunById(tenantId: string, id: string) {
    const runs = await this.readJsonConfig<PayrollRun[]>(tenantId, PAYROLL_RUNS_KEY, []);
    const run = runs.find((item) => item.id === id);
    if (!run) {
      throw new NotFoundException('Payroll run not found');
    }

    return run;
  }

  async approvePayrollRun(tenantId: string, runId: string, approvedBy: string) {
    const runs = await this.readJsonConfig<PayrollRun[]>(tenantId, PAYROLL_RUNS_KEY, []);
    const index = runs.findIndex((run) => run.id === runId);
    if (index < 0) {
      throw new NotFoundException('Payroll run not found');
    }

    const existing = runs[index];
    const status = existing.status || 'posted';
    if (status === 'reversed') {
      throw new BadRequestException('Reversed payroll run cannot be approved');
    }

    if (status === 'posted') {
      throw new BadRequestException('Posted payroll run does not require approval');
    }

    if (status === 'approved') {
      return existing;
    }

    if (status !== 'draft') {
      throw new BadRequestException('Only draft payroll runs can be approved');
    }

    runs[index] = {
      ...existing,
      status: 'approved',
      approvedBy,
      approvedAt: new Date().toISOString(),
      auditTrail: [
        ...(Array.isArray(existing.auditTrail) ? existing.auditTrail : []),
        {
          action: 'approved',
          by: approvedBy,
          at: new Date().toISOString(),
        },
      ],
    };

    await this.writeJsonConfig(tenantId, PAYROLL_RUNS_KEY, runs);
    return runs[index];
  }

  async markPayrollRunPosted(
    tenantId: string,
    runId: string,
    postedBy: string,
    payload: {
      processedItems: Array<{
        salarySchemeId: string;
        employeeName: string;
        expenseId: string;
        amount: number;
      }>;
      liabilityTotals: PayrollRun['liabilityTotals'];
    },
  ) {
    const runs = await this.readJsonConfig<PayrollRun[]>(tenantId, PAYROLL_RUNS_KEY, []);
    const index = runs.findIndex((run) => run.id === runId);
    if (index < 0) {
      throw new NotFoundException('Payroll run not found');
    }

    const existing = runs[index];
    const status = existing.status || 'posted';
    if (status === 'reversed') {
      throw new BadRequestException('Reversed payroll run cannot be posted');
    }

    if (status === 'posted') {
      return existing;
    }

    if (status !== 'approved') {
      throw new BadRequestException('Only approved payroll runs can be posted');
    }

    const postedAt = new Date().toISOString();
    runs[index] = {
      ...existing,
      status: 'posted',
      postedBy,
      postedAt,
      approvedBy: existing.approvedBy || postedBy,
      approvedAt: existing.approvedAt || postedAt,
      processedItems: payload.processedItems,
      processedCount: payload.processedItems.length,
      liabilityTotals: payload.liabilityTotals,
      auditTrail: [
        ...(Array.isArray(existing.auditTrail) ? existing.auditTrail : []),
        {
          action: 'posted',
          by: postedBy,
          at: postedAt,
          note: `Posted ${payload.processedItems.length} expense entr${payload.processedItems.length === 1 ? 'y' : 'ies'}`,
        },
      ],
    };

    await this.writeJsonConfig(tenantId, PAYROLL_RUNS_KEY, runs);
    return runs[index];
  }

  async reversePayrollRun(tenantId: string, runId: string, reversedBy: string, reason?: string) {
    const runs = await this.readJsonConfig<PayrollRun[]>(tenantId, PAYROLL_RUNS_KEY, []);
    const index = runs.findIndex((run) => run.id === runId);
    if (index < 0) {
      throw new NotFoundException('Payroll run not found');
    }

    const existing = runs[index];
    const status = existing.status || 'posted';
    if (status === 'reversed') {
      throw new BadRequestException('Payroll run already reversed');
    }

    if (status === 'draft' || status === 'approved' || status === 'cancelled') {
      throw new BadRequestException('Only posted payroll runs can be reversed');
    }

    runs[index] = {
      ...existing,
      status: 'reversed',
      reversedBy,
      reversedAt: new Date().toISOString(),
      reversalReason: reason?.trim() || 'Manual reversal',
      auditTrail: [
        ...(Array.isArray(existing.auditTrail) ? existing.auditTrail : []),
        {
          action: 'reversed',
          by: reversedBy,
          at: new Date().toISOString(),
          note: reason?.trim() || 'Manual reversal',
        },
      ],
    };

    await this.writeJsonConfig(tenantId, PAYROLL_RUNS_KEY, runs);
    return runs[index];
  }

  async recordPayrollRun(tenantId: string, run: PayrollRun) {
    const runs = await this.readJsonConfig<PayrollRun[]>(tenantId, PAYROLL_RUNS_KEY, []);
    const status = run.status || 'posted';
    const processedAt = run.processedAt || new Date().toISOString();
    runs.push({
      ...run,
      status,
      auditTrail: Array.isArray(run.auditTrail)
        ? run.auditTrail
        : [
            {
              action:
                status === 'draft'
                  ? 'draft_created'
                  : status === 'posted'
                  ? 'posted'
                  : 'created',
              by: run.processedBy,
              at: processedAt,
            },
          ],
    });
    await this.writeJsonConfig(tenantId, PAYROLL_RUNS_KEY, runs);
  }

  async cancelPayrollRun(tenantId: string, runId: string, cancelledBy: string, reason?: string) {
    const runs = await this.readJsonConfig<PayrollRun[]>(tenantId, PAYROLL_RUNS_KEY, []);
    const index = runs.findIndex((run) => run.id === runId);
    if (index < 0) {
      throw new NotFoundException('Payroll run not found');
    }

    const existing = runs[index];
    const status = existing.status || 'posted';
    if (status === 'cancelled') {
      return existing;
    }

    if (status !== 'draft') {
      throw new BadRequestException('Only draft payroll runs can be cancelled');
    }

    const cancelledAt = new Date().toISOString();
    runs[index] = {
      ...existing,
      status: 'cancelled',
      cancelledBy,
      cancelledAt,
      cancellationReason: reason?.trim() || 'Draft cancelled',
      auditTrail: [
        ...(Array.isArray(existing.auditTrail) ? existing.auditTrail : []),
        {
          action: 'cancelled',
          by: cancelledBy,
          at: cancelledAt,
          note: reason?.trim() || 'Draft cancelled',
        },
      ],
    };

    await this.writeJsonConfig(tenantId, PAYROLL_RUNS_KEY, runs);
    return runs[index];
  }

  async listPayrollPeriodLocks(tenantId: string) {
    const controls = await this.readJsonConfig<PayrollControls>(
      tenantId,
      PAYROLL_CONTROLS_KEY,
      { locks: [] },
    );

    return Array.isArray(controls.locks) ? controls.locks : [];
  }

  async isPayrollPeriodLocked(tenantId: string, month: number, year: number, branchId?: string) {
    const locks = await this.listPayrollPeriodLocks(tenantId);
    return locks.find((lock) =>
      this.samePeriodBranch(
        { month: lock.month, year: lock.year, branchId: lock.branchId },
        month,
        year,
        branchId,
      ),
    );
  }

  async lockPayrollPeriod(
    tenantId: string,
    payload: { month: number; year: number; branchId?: string; reason?: string; lockedBy: string },
  ) {
    const controls = await this.readJsonConfig<PayrollControls>(
      tenantId,
      PAYROLL_CONTROLS_KEY,
      { locks: [] },
    );

    controls.locks = Array.isArray(controls.locks) ? controls.locks : [];
    const existing = controls.locks.find((lock) =>
      this.samePeriodBranch(
        { month: lock.month, year: lock.year, branchId: lock.branchId },
        payload.month,
        payload.year,
        payload.branchId,
      ),
    );

    if (existing) {
      return existing;
    }

    const next: PayrollPeriodLock = {
      month: payload.month,
      year: payload.year,
      branchId: payload.branchId,
      reason: payload.reason?.trim(),
      lockedBy: payload.lockedBy,
      lockedAt: new Date().toISOString(),
    };

    controls.locks.push(next);
    await this.writeJsonConfig(tenantId, PAYROLL_CONTROLS_KEY, controls);
    return next;
  }

  async unlockPayrollPeriod(
    tenantId: string,
    payload: { month: number; year: number; branchId?: string },
  ) {
    const controls = await this.readJsonConfig<PayrollControls>(
      tenantId,
      PAYROLL_CONTROLS_KEY,
      { locks: [] },
    );

    controls.locks = (controls.locks || []).filter(
      (lock) =>
        !this.samePeriodBranch(
          { month: lock.month, year: lock.year, branchId: lock.branchId },
          payload.month,
          payload.year,
          payload.branchId,
        ),
    );

    await this.writeJsonConfig(tenantId, PAYROLL_CONTROLS_KEY, controls);
    return { success: true };
  }

  async buildP10Report(tenantId: string, month: number, year: number) {
    const runs = await this.listPayrollRuns(tenantId, month, year);
    const lineItems: Array<{
      employeeName: string;
      grossPay: number;
      paye: number;
      nssf: number;
      health: number;
      housing: number;
      netPay: number;
    }> = [];

    for (const run of runs) {
      const items = Array.isArray(run.items) ? run.items : [];
      for (const item of items) {
        lineItems.push({
          employeeName: item.employeeName,
          grossPay: this.clampAmount(item.grossPay),
          paye: this.clampAmount(item?.statutory?.paye),
          nssf: this.clampAmount(item?.statutory?.nssfEmployee),
          health: this.clampAmount(item?.statutory?.healthInsuranceEmployee),
          housing: this.clampAmount(item?.statutory?.housingLevyEmployee),
          netPay: this.clampAmount(item?.netPay),
        });
      }
    }

    const totals = lineItems.reduce(
      (acc, item) => {
        acc.grossPay += item.grossPay;
        acc.paye += item.paye;
        acc.nssf += item.nssf;
        acc.health += item.health;
        acc.housing += item.housing;
        acc.netPay += item.netPay;
        return acc;
      },
      { grossPay: 0, paye: 0, nssf: 0, health: 0, housing: 0, netPay: 0 },
    );

    return {
      period: `${year}-${String(month).padStart(2, '0')}`,
      lineItems,
      totals,
      payrollRunCount: runs.length,
    };
  }

  async buildP9Report(tenantId: string, year: number) {
    const runs = await this.listPayrollRuns(tenantId, undefined, year);
    const employeeMap = new Map<
      string,
      {
        employeeName: string;
        grossPay: number;
        paye: number;
        nssf: number;
        health: number;
        housing: number;
        netPay: number;
      }
    >();

    for (const run of runs) {
      const items = Array.isArray(run.items) ? run.items : [];
      for (const item of items) {
        const key = String(item.employeeName || item.salarySchemeId || 'unknown');
        const current = employeeMap.get(key) || {
          employeeName: String(item.employeeName || 'Unknown'),
          grossPay: 0,
          paye: 0,
          nssf: 0,
          health: 0,
          housing: 0,
          netPay: 0,
        };

        current.grossPay += this.clampAmount(item.grossPay);
        current.paye += this.clampAmount(item?.statutory?.paye);
        current.nssf += this.clampAmount(item?.statutory?.nssfEmployee);
        current.health += this.clampAmount(item?.statutory?.healthInsuranceEmployee);
        current.housing += this.clampAmount(item?.statutory?.housingLevyEmployee);
        current.netPay += this.clampAmount(item.netPay);
        employeeMap.set(key, current);
      }
    }

    const lineItems = Array.from(employeeMap.values()).sort((a, b) =>
      a.employeeName.localeCompare(b.employeeName),
    );

    const totals = lineItems.reduce(
      (acc, item) => {
        acc.grossPay += item.grossPay;
        acc.paye += item.paye;
        acc.nssf += item.nssf;
        acc.health += item.health;
        acc.housing += item.housing;
        acc.netPay += item.netPay;
        return acc;
      },
      { grossPay: 0, paye: 0, nssf: 0, health: 0, housing: 0, netPay: 0 },
    );

    return {
      year,
      lineItems,
      totals,
      payrollRunCount: runs.length,
    };
  }

  async generatePayslip(
    tenantId: string,
    params: {
      runId?: string;
      salarySchemeId?: string;
      employeeName?: string;
      month?: number;
      year?: number;
    },
  ) {
    const runs = await this.listPayrollRuns(tenantId, params.month, params.year);

    let run = params.runId
      ? runs.find((item) => item.id === params.runId)
      : runs[0];

    if (!run && params.runId) {
      const direct = await this.getPayrollRunById(tenantId, params.runId);
      run = direct;
    }

    if (!run) {
      throw new NotFoundException('No payroll run found for payslip generation');
    }

    const runItems = Array.isArray(run.items) ? run.items : [];
    const item = runItems.find((entry: any) => {
      if (params.salarySchemeId && entry.salarySchemeId === params.salarySchemeId) {
        return true;
      }

      if (
        params.employeeName &&
        String(entry.employeeName || '').toLowerCase() === params.employeeName.toLowerCase()
      ) {
        return true;
      }

      return false;
    });

    if (!item) {
      throw new NotFoundException('Employee payroll line not found for payslip');
    }

    return {
      runId: run.id,
      month: run.month,
      year: run.year,
      monthName: run.monthName,
      processedAt: run.processedAt,
      employeeName: item.employeeName,
      salarySchemeId: item.salarySchemeId,
      earnings: {
        baseSalary: this.clampAmount(item.baseSalary),
        bonus: this.clampAmount(item.bonus),
        commission: this.clampAmount(item.commission),
        grossPay: this.clampAmount(item.grossPay),
      },
      deductions: {
        nonTaxDeduction: this.clampAmount(item.nonTaxDeduction || item.deduction),
        paye: this.clampAmount(item?.statutory?.paye),
        nssf: this.clampAmount(item?.statutory?.nssfEmployee),
        health: this.clampAmount(item?.statutory?.healthInsuranceEmployee),
        housingLevy: this.clampAmount(item?.statutory?.housingLevyEmployee),
        totalStatutory: this.clampAmount(item?.statutory?.totalEmployeeStatutory),
      },
      employerContributions: {
        nssf: this.clampAmount(item?.statutory?.nssfEmployer),
        housingLevy: this.clampAmount(item?.statutory?.housingLevyEmployer),
        total: this.clampAmount(item?.statutory?.totalEmployerStatutory),
      },
      netPay: this.clampAmount(item.netPay),
      paidAmount: this.clampAmount(item.paidAmount),
      variance: this.clampAmount(item.variance),
    };
  }

  async buildTemplateAdjustments(
    tenantId: string,
    payrollItems: Array<{
      salarySchemeId: string;
      employeeName: string;
      baseSalary: number;
      branchId?: string | null;
    }>,
  ) {
    const [templates, employees] = await Promise.all([
      this.listPayrollTemplates(tenantId, true),
      this.listEmployees(tenantId),
    ]);

    const result = new Map<
      string,
      {
        bonus: number;
        commission: number;
        deduction: number;
        breakdown: Array<{ templateId: string; name: string; amount: number; type: TemplateType }>;
      }
    >();

    const employeesBySchemeId = new Map(
      employees
        .filter((employee) => !!employee.salarySchemeId)
        .map((employee) => [employee.salarySchemeId as string, employee]),
    );

    for (const item of payrollItems) {
      const profileByScheme = employeesBySchemeId.get(item.salarySchemeId);
      const profileByName = employees.find(
        (employee) => employee.fullName.toLowerCase() === item.employeeName.toLowerCase(),
      );
      const employeeProfile = profileByScheme || profileByName;

      let bonus = 0;
      let commission = 0;
      let deduction = 0;
      const breakdown: Array<{ templateId: string; name: string; amount: number; type: TemplateType }> = [];

      for (const template of templates) {
        if (template.branchId && item.branchId && template.branchId !== item.branchId) {
          continue;
        }

        let applies = false;

        if (template.applyScope === 'all') {
          applies = true;
        } else if (template.applyScope === 'employee') {
          applies = !!employeeProfile && (template.targetEmployeeIds || []).includes(employeeProfile.id);
        } else if (template.applyScope === 'department') {
          const employeeDepartment = (employeeProfile?.department || '').toLowerCase();
          applies =
            !!employeeDepartment &&
            (template.targetDepartments || []).some(
              (department) => department.toLowerCase() === employeeDepartment,
            );
        }

        if (!applies) {
          continue;
        }

        const amount =
          template.mode === 'fixed'
            ? template.value
            : (item.baseSalary * template.value) / 100;

        if (!Number.isFinite(amount) || amount <= 0) {
          continue;
        }

        if (template.type === 'bonus') {
          bonus += amount;
        } else if (template.type === 'commission') {
          commission += amount;
        } else {
          deduction += amount;
        }

        breakdown.push({
          templateId: template.id,
          name: template.name,
          amount,
          type: template.type,
        });
      }

      result.set(item.salarySchemeId, {
        bonus,
        commission,
        deduction,
        breakdown,
      });
    }

    return result;
  }
}
