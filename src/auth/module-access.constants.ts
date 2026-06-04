export const MODULES_CONFIG_KEY = 'app.enabledModules.v1';

export const AVAILABLE_MODULES = [
  'dashboard',
  'payroll',
  'sales',
  'credits',
  'inventory',
  'accounts',
  'analytics',
  'reports',
  'expenses',
  'crm',
  'ai',
  'settings',
  'billing',
] as const;

export type AppModuleKey = (typeof AVAILABLE_MODULES)[number];

export interface ModulePresetDefinition {
  key: string;
  label: string;
  description: string;
  enabledModules: AppModuleKey[];
}

export const MODULE_PRESETS: ModulePresetDefinition[] = [
  {
    key: 'full_suite',
    label: 'Full Suite',
    description: 'All modules enabled for complete platform access.',
    enabledModules: [...AVAILABLE_MODULES],
  },
  {
    key: 'retail_ops',
    label: 'Retail Operations',
    description: 'Sales, inventory, credits, expenses, and reporting for retail workflows.',
    enabledModules: [
      'dashboard',
      'sales',
      'credits',
      'inventory',
      'expenses',
      'analytics',
      'reports',
      'accounts',
      'settings',
      'billing',
    ],
  },
  {
    key: 'hr_payroll',
    label: 'HR & Payroll',
    description: 'Payroll-focused tenancy for HR teams.',
    enabledModules: ['dashboard', 'payroll', 'reports', 'settings', 'billing'],
  },
  {
    key: 'finance_accounts',
    label: 'Finance & Accounts',
    description: 'Accounts, expenses, analytics, and reports for finance teams.',
    enabledModules: [
      'dashboard',
      'accounts',
      'expenses',
      'analytics',
      'reports',
      'settings',
      'billing',
    ],
  },
  {
    key: 'crm_growth',
    label: 'CRM Growth',
    description: 'CRM plus analytics, reports, and AI assistant.',
    enabledModules: [
      'dashboard',
      'crm',
      'analytics',
      'reports',
      'ai',
      'settings',
      'billing',
    ],
  },
  {
    key: 'payroll_only',
    label: 'Payroll Only',
    description: 'Minimal tenancy with payroll as the primary module.',
    enabledModules: ['dashboard', 'payroll', 'settings', 'billing'],
  },
  {
    key: 'reports_only',
    label: 'Reports Only',
    description: 'Read/report-focused tenancy with reporting access.',
    enabledModules: ['dashboard', 'reports', 'settings', 'billing'],
  },
  {
    key: 'credits_only',
    label: 'Credits Only',
    description: 'Credit management tenancy for accounts receivable workflows.',
    enabledModules: ['dashboard', 'credits', 'settings', 'billing'],
  },
];

export function getModulePreset(key: string | undefined | null): ModulePresetDefinition | undefined {
  const normalized = String(key || '').trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  return MODULE_PRESETS.find((preset) => preset.key === normalized);
}

export const DEFAULT_ENABLED_MODULES: AppModuleKey[] = [...AVAILABLE_MODULES];

export function normalizeEnabledModules(input: unknown): AppModuleKey[] {
  if (!Array.isArray(input)) {
    return [...DEFAULT_ENABLED_MODULES];
  }

  const normalized = input
    .map((entry) => String(entry || '').trim().toLowerCase())
    .filter((entry): entry is AppModuleKey =>
      (AVAILABLE_MODULES as readonly string[]).includes(entry),
    );

  return normalized.length > 0 ? Array.from(new Set(normalized)) : [...DEFAULT_ENABLED_MODULES];
}
