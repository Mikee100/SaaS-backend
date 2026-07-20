import { AppModuleKey } from '../auth/module-access.constants';
import { ProductMode } from '../product/product-mode.types';

export type BusinessTypeKey =
  | 'fashion'
  | 'restaurant'
  | 'spa_barber'
  | 'hardware';

export type BlueprintVersionKey = 'v1';

export interface BlueprintNavItem {
  key: string;
  label: string;
  path: string;
  icon?: string;
  order?: number;
  requiredModule?: AppModuleKey;
  requiredPermission?: string;
  section?: string;
  children?: BlueprintNavItem[];
}

export interface BlueprintDashboardWidget {
  key: string;
  title: string;
  widgetType: string;
  order?: number;
  requiredModule?: AppModuleKey;
  requiredPermission?: string;
  config?: Record<string, unknown>;
}

export interface BlueprintQuickAction {
  key: string;
  label: string;
  actionType: 'navigate' | 'modal' | 'api';
  path?: string;
  order?: number;
  requiredModule?: AppModuleKey;
  requiredPermission?: string;
}

export interface BlueprintSettingsItem {
  key: string;
  label: string;
  path: string;
  requiredModule?: AppModuleKey;
  requiredPermission?: string;
}

export interface BlueprintEntityDefinition {
  key: string;
  label: string;
  engine: string;
  attributes?: string[];
  // Which product creation modes this entity supports in this blueprint
  // (e.g. restaurant menu_item -> ['recipe', 'simple']) and which one the
  // "Add" form should default to. Omitted for non-sellable entities
  // (orders, kitchen tickets, staff members, etc).
  allowedProductModes?: ProductMode[];
  defaultProductMode?: ProductMode;
}

export interface BlueprintReportDefinition {
  key: string;
  label: string;
  category?: string;
  requiredModule?: AppModuleKey;
  requiredPermission?: string;
}

export interface BlueprintAppDefinition {
  key: string;
  label: string;
  enabledByDefault?: boolean;
}

export interface BlueprintFeatureFlags {
  [flagKey: string]: boolean;
}

export interface BlueprintManifestV1 {
  schemaVersion: '1.0.0';
  businessType: BusinessTypeKey;
  blueprintKey: string;
  blueprintVersion: BlueprintVersionKey;
  displayName: string;
  description: string;
  enabledModules: AppModuleKey[];
  navigation: BlueprintNavItem[];
  dashboard: BlueprintDashboardWidget[];
  quickActions: BlueprintQuickAction[];
  settings: BlueprintSettingsItem[];
  reports: BlueprintReportDefinition[];
  entities: BlueprintEntityDefinition[];
  permissions: string[];
  features: string[];
  apps: BlueprintAppDefinition[];
  featureFlags?: BlueprintFeatureFlags;
}
