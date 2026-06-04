export const CRM_ENTITLEMENTS_CONFIG_KEY = 'app.crm.entitlements.v1';

export const CRM_PACKAGES = ['starter', 'growth', 'pro', 'enterprise'] as const;
export type CrmPackageKey = (typeof CRM_PACKAGES)[number];

export const CRM_CAPABILITIES = [
  'crm.pipeline',
  'crm.tasks',
  'crm.documents',
  'crm.calendar_integration',
  'crm.meeting_scheduler',
  'crm.email_integration',
  'crm.reporting',
  'crm.workflow_automation',
  'crm.lead_scoring',
  'crm.telephony',
  'crm.proposal_management',
  'crm.contract_management',
  'crm.third_party_integrations',
] as const;

export type CrmCapabilityKey = (typeof CRM_CAPABILITIES)[number];

export interface CrmLimits {
  pipelines: number | null;
  automationRules: number | null;
  documentStorageGb: number | null;
  integrationConnections: number | null;
  telephonyMinutesMonthly: number | null;
  proposalsMonthly: number | null;
  contractsMonthly: number | null;
}

export interface CrmAllowedProviders {
  calendar: string[];
  email: string[];
  telephony: string[];
  integrations: string[];
}

export interface CrmEntitlements {
  packageKey: CrmPackageKey;
  enabledCapabilities: CrmCapabilityKey[];
  limits: CrmLimits;
  allowedProviders: CrmAllowedProviders;
}

export const CRM_USAGE_CONFIG_KEY = 'app.crm.usage.v1';

export type CrmLimitKey =
  | 'pipelines'
  | 'automationRules'
  | 'documentStorageGb'
  | 'integrationConnections'
  | 'telephonyMinutesMonthly'
  | 'proposalsMonthly'
  | 'contractsMonthly';

export type CrmUsage = Record<CrmLimitKey, number>;

export const DEFAULT_CRM_USAGE: CrmUsage = {
  pipelines: 0,
  automationRules: 0,
  documentStorageGb: 0,
  integrationConnections: 0,
  telephonyMinutesMonthly: 0,
  proposalsMonthly: 0,
  contractsMonthly: 0,
};

const CRM_PROVIDER_ALLOWLIST = {
  calendar: ['google', 'microsoft'],
  email: ['gmail', 'outlook'],
  telephony: ['twilio', 'africa_talking'],
  integrations: ['zapier', 'zoom', 'slack', 'shopify'],
} as const;

const CRM_PACKAGE_TEMPLATES: Record<CrmPackageKey, CrmEntitlements> = {
  starter: {
    packageKey: 'starter',
    enabledCapabilities: [
      'crm.pipeline',
      'crm.tasks',
      'crm.reporting',
      'crm.email_integration',
    ],
    limits: {
      pipelines: 1,
      automationRules: 0,
      documentStorageGb: 2,
      integrationConnections: 2,
      telephonyMinutesMonthly: 0,
      proposalsMonthly: 0,
      contractsMonthly: 0,
    },
    allowedProviders: {
      calendar: [],
      email: ['gmail', 'outlook'],
      telephony: [],
      integrations: ['zapier'],
    },
  },
  growth: {
    packageKey: 'growth',
    enabledCapabilities: [
      'crm.pipeline',
      'crm.tasks',
      'crm.documents',
      'crm.calendar_integration',
      'crm.meeting_scheduler',
      'crm.email_integration',
      'crm.reporting',
      'crm.workflow_automation',
      'crm.third_party_integrations',
    ],
    limits: {
      pipelines: 3,
      automationRules: 10,
      documentStorageGb: 20,
      integrationConnections: 8,
      telephonyMinutesMonthly: 0,
      proposalsMonthly: 0,
      contractsMonthly: 0,
    },
    allowedProviders: {
      calendar: ['google', 'microsoft'],
      email: ['gmail', 'outlook'],
      telephony: [],
      integrations: ['zapier', 'zoom', 'slack', 'shopify'],
    },
  },
  pro: {
    packageKey: 'pro',
    enabledCapabilities: [
      'crm.pipeline',
      'crm.tasks',
      'crm.documents',
      'crm.calendar_integration',
      'crm.meeting_scheduler',
      'crm.email_integration',
      'crm.reporting',
      'crm.workflow_automation',
      'crm.lead_scoring',
      'crm.proposal_management',
      'crm.contract_management',
      'crm.third_party_integrations',
    ],
    limits: {
      pipelines: 10,
      automationRules: 50,
      documentStorageGb: 100,
      integrationConnections: 20,
      telephonyMinutesMonthly: 0,
      proposalsMonthly: 100,
      contractsMonthly: 100,
    },
    allowedProviders: {
      calendar: ['google', 'microsoft'],
      email: ['gmail', 'outlook'],
      telephony: [],
      integrations: ['zapier', 'zoom', 'slack', 'shopify'],
    },
  },
  enterprise: {
    packageKey: 'enterprise',
    enabledCapabilities: [...CRM_CAPABILITIES],
    limits: {
      pipelines: null,
      automationRules: null,
      documentStorageGb: null,
      integrationConnections: null,
      telephonyMinutesMonthly: null,
      proposalsMonthly: null,
      contractsMonthly: null,
    },
    allowedProviders: {
      calendar: ['google', 'microsoft'],
      email: ['gmail', 'outlook'],
      telephony: ['twilio', 'africa_talking'],
      integrations: ['zapier', 'zoom', 'slack', 'shopify'],
    },
  },
};

export const DEFAULT_CRM_PACKAGE: CrmPackageKey = 'starter';

export function normalizeCrmPackageKey(input: unknown): CrmPackageKey {
  const candidate = String(input || '').trim().toLowerCase();
  if ((CRM_PACKAGES as readonly string[]).includes(candidate)) {
    return candidate as CrmPackageKey;
  }
  return DEFAULT_CRM_PACKAGE;
}

export function getCrmPackageTemplate(packageKey: CrmPackageKey): CrmEntitlements {
  const template = CRM_PACKAGE_TEMPLATES[packageKey];
  return JSON.parse(JSON.stringify(template));
}

export function getDefaultCrmEntitlements(): CrmEntitlements {
  return getCrmPackageTemplate(DEFAULT_CRM_PACKAGE);
}

export function normalizeCrmCapabilities(input: unknown): CrmCapabilityKey[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const normalized = input
    .map((entry) => String(entry || '').trim().toLowerCase())
    .filter((entry): entry is CrmCapabilityKey =>
      (CRM_CAPABILITIES as readonly string[]).includes(entry),
    );

  return Array.from(new Set(normalized));
}

export function normalizeCrmLimits(input: unknown, fallback: CrmLimits): CrmLimits {
  const source = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};

  const normalizeValue = (value: unknown, defaultValue: number | null): number | null => {
    if (value === null) return null;
    if (value === undefined) return defaultValue;
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) return defaultValue;
    return Math.floor(num);
  };

  return {
    pipelines: normalizeValue(source.pipelines, fallback.pipelines),
    automationRules: normalizeValue(source.automationRules, fallback.automationRules),
    documentStorageGb: normalizeValue(source.documentStorageGb, fallback.documentStorageGb),
    integrationConnections: normalizeValue(source.integrationConnections, fallback.integrationConnections),
    telephonyMinutesMonthly: normalizeValue(source.telephonyMinutesMonthly, fallback.telephonyMinutesMonthly),
    proposalsMonthly: normalizeValue(source.proposalsMonthly, fallback.proposalsMonthly),
    contractsMonthly: normalizeValue(source.contractsMonthly, fallback.contractsMonthly),
  };
}

export function normalizeCrmAllowedProviders(
  input: unknown,
  fallback: CrmAllowedProviders,
): CrmAllowedProviders {
  const source = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};

  const normalizeGroup = (
    value: unknown,
    allowed: readonly string[],
    fallbackGroup: string[],
  ): string[] => {
    if (!Array.isArray(value)) return [...fallbackGroup];

    const normalized = value
      .map((entry) => String(entry || '').trim().toLowerCase())
      .filter((entry) => allowed.includes(entry));

    return Array.from(new Set(normalized));
  };

  return {
    calendar: normalizeGroup(source.calendar, CRM_PROVIDER_ALLOWLIST.calendar, fallback.calendar),
    email: normalizeGroup(source.email, CRM_PROVIDER_ALLOWLIST.email, fallback.email),
    telephony: normalizeGroup(source.telephony, CRM_PROVIDER_ALLOWLIST.telephony, fallback.telephony),
    integrations: normalizeGroup(source.integrations, CRM_PROVIDER_ALLOWLIST.integrations, fallback.integrations),
  };
}

export function normalizeCrmEntitlements(input: unknown): CrmEntitlements {
  const source = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};
  const packageKey = normalizeCrmPackageKey(source.packageKey);
  const template = getCrmPackageTemplate(packageKey);

  const requestedCapabilities = normalizeCrmCapabilities(source.enabledCapabilities);
  const enabledCapabilities = requestedCapabilities.length > 0
    ? requestedCapabilities
    : template.enabledCapabilities;

  return {
    packageKey,
    enabledCapabilities,
    limits: normalizeCrmLimits(source.limits, template.limits),
    allowedProviders: normalizeCrmAllowedProviders(source.allowedProviders, template.allowedProviders),
  };
}

export function validateCrmCapabilityDependencies(capabilities: CrmCapabilityKey[]): string[] {
  const set = new Set(capabilities);
  const errors: string[] = [];

  if (set.has('crm.meeting_scheduler') && !set.has('crm.calendar_integration')) {
    errors.push('crm.meeting_scheduler requires crm.calendar_integration');
  }

  if (set.has('crm.lead_scoring') && !set.has('crm.pipeline')) {
    errors.push('crm.lead_scoring requires crm.pipeline');
  }

  if (set.has('crm.proposal_management') && !set.has('crm.documents')) {
    errors.push('crm.proposal_management requires crm.documents');
  }

  if (set.has('crm.contract_management') && !set.has('crm.documents')) {
    errors.push('crm.contract_management requires crm.documents');
  }

  if (set.has('crm.telephony') && !set.has('crm.third_party_integrations')) {
    errors.push('crm.telephony requires crm.third_party_integrations');
  }

  return errors;
}

export function normalizeCrmUsage(input: unknown): CrmUsage {
  const source = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};

  const normalize = (key: CrmLimitKey) => {
    const value = source[key];
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) {
      return DEFAULT_CRM_USAGE[key];
    }
    return Math.floor(num);
  };

  return {
    pipelines: normalize('pipelines'),
    automationRules: normalize('automationRules'),
    documentStorageGb: normalize('documentStorageGb'),
    integrationConnections: normalize('integrationConnections'),
    telephonyMinutesMonthly: normalize('telephonyMinutesMonthly'),
    proposalsMonthly: normalize('proposalsMonthly'),
    contractsMonthly: normalize('contractsMonthly'),
  };
}

export function evaluateCrmLimit(
  limits: CrmLimits,
  usage: CrmUsage,
  key: CrmLimitKey,
): {
  key: CrmLimitKey;
  limit: number | null;
  usage: number;
  usagePercent: number | null;
  warning: boolean;
  blocked: boolean;
} {
  const limit = limits[key];
  const current = usage[key] ?? 0;

  if (limit === null) {
    return {
      key,
      limit,
      usage: current,
      usagePercent: null,
      warning: false,
      blocked: false,
    };
  }

  if (limit <= 0) {
    return {
      key,
      limit,
      usage: current,
      usagePercent: 100,
      warning: true,
      blocked: true,
    };
  }

  const usagePercent = Math.round((current / limit) * 100);
  return {
    key,
    limit,
    usage: current,
    usagePercent,
    warning: usagePercent >= 80,
    blocked: current >= limit,
  };
}