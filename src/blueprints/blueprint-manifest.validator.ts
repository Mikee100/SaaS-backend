import {
  AVAILABLE_MODULES,
  AppModuleKey,
  DEFAULT_ENABLED_MODULES,
  normalizeEnabledModules,
} from '../auth/module-access.constants';
import {
  BlueprintManifestV1,
  BlueprintNavItem,
  BlueprintQuickAction,
  BlueprintSettingsItem,
  BlueprintDashboardWidget,
  BlueprintEntityDefinition,
  BlueprintReportDefinition,
} from './blueprint-manifest.types';

const VALID_SCHEMA_VERSION = '1.0.0';

const ALLOWED_MODULES = new Set<string>([...AVAILABLE_MODULES]);

export interface ManifestValidationResult {
  valid: boolean;
  errors: string[];
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null;
}

function isNonEmptyString(input: unknown): input is string {
  return typeof input === 'string' && input.trim().length > 0;
}

function validateArray<T>(
  input: unknown,
  field: string,
  errors: string[],
  validateItem?: (item: unknown, index: number) => item is T,
): input is T[] {
  if (!Array.isArray(input)) {
    errors.push(`${field} must be an array`);
    return false;
  }

  if (validateItem) {
    for (let i = 0; i < input.length; i += 1) {
      if (!validateItem(input[i], i)) {
        errors.push(`${field}[${i}] is invalid`);
      }
    }
  }

  return true;
}

function isAppModuleKey(input: unknown): input is AppModuleKey {
  return typeof input === 'string' && ALLOWED_MODULES.has(input);
}

function isNavItem(input: unknown): input is BlueprintNavItem {
  if (!isRecord(input)) return false;
  return isNonEmptyString(input.key) && isNonEmptyString(input.label) && isNonEmptyString(input.path);
}

function isDashboardWidget(input: unknown): input is BlueprintDashboardWidget {
  if (!isRecord(input)) return false;
  return isNonEmptyString(input.key) && isNonEmptyString(input.title) && isNonEmptyString(input.widgetType);
}

function isQuickAction(input: unknown): input is BlueprintQuickAction {
  if (!isRecord(input)) return false;
  return (
    isNonEmptyString(input.key) &&
    isNonEmptyString(input.label) &&
    (input.actionType === 'navigate' || input.actionType === 'modal' || input.actionType === 'api')
  );
}

function isSettingsItem(input: unknown): input is BlueprintSettingsItem {
  if (!isRecord(input)) return false;
  return isNonEmptyString(input.key) && isNonEmptyString(input.label) && isNonEmptyString(input.path);
}

function isEntityDefinition(input: unknown): input is BlueprintEntityDefinition {
  if (!isRecord(input)) return false;
  return isNonEmptyString(input.key) && isNonEmptyString(input.label) && isNonEmptyString(input.engine);
}

function isReportDefinition(input: unknown): input is BlueprintReportDefinition {
  if (!isRecord(input)) return false;
  return isNonEmptyString(input.key) && isNonEmptyString(input.label);
}

export function validateBlueprintManifest(input: unknown): ManifestValidationResult {
  const errors: string[] = [];

  if (!isRecord(input)) {
    return { valid: false, errors: ['manifest must be an object'] };
  }

  if (input.schemaVersion !== VALID_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${VALID_SCHEMA_VERSION}`);
  }

  if (!isNonEmptyString(input.businessType)) {
    errors.push('businessType must be a non-empty string');
  }

  if (!isNonEmptyString(input.blueprintKey)) {
    errors.push('blueprintKey must be a non-empty string');
  }

  if (!isNonEmptyString(input.blueprintVersion)) {
    errors.push('blueprintVersion must be a non-empty string');
  }

  if (!isNonEmptyString(input.displayName)) {
    errors.push('displayName must be a non-empty string');
  }

  if (!isNonEmptyString(input.description)) {
    errors.push('description must be a non-empty string');
  }

  if (Array.isArray(input.enabledModules)) {
    const invalid = input.enabledModules.filter((entry) => !isAppModuleKey(entry));
    if (invalid.length > 0) {
      errors.push(`enabledModules contains invalid modules: ${invalid.join(', ')}`);
    }
  } else {
    errors.push('enabledModules must be an array');
  }

  validateArray(input.navigation, 'navigation', errors, isNavItem);
  validateArray(input.dashboard, 'dashboard', errors, isDashboardWidget);
  validateArray(input.quickActions, 'quickActions', errors, isQuickAction);
  validateArray(input.settings, 'settings', errors, isSettingsItem);
  validateArray(input.entities, 'entities', errors, isEntityDefinition);
  validateArray(input.reports, 'reports', errors, isReportDefinition);
  validateArray(input.permissions, 'permissions', errors, (item): item is string => isNonEmptyString(item));
  validateArray(input.features, 'features', errors, (item): item is string => isNonEmptyString(item));
  validateArray(input.apps, 'apps', errors, (item): item is { key: string; label: string } => {
    if (!isRecord(item)) return false;
    return isNonEmptyString(item.key) && isNonEmptyString(item.label);
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function normalizeManifestModules(input: unknown): AppModuleKey[] {
  return normalizeEnabledModules(input) || [...DEFAULT_ENABLED_MODULES];
}

export function assertValidBlueprintManifest(input: unknown): asserts input is BlueprintManifestV1 {
  const result = validateBlueprintManifest(input);
  if (!result.valid) {
    throw new Error(`Invalid blueprint manifest: ${result.errors.join('; ')}`);
  }
}
