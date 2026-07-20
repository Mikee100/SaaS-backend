import { Injectable } from '@nestjs/common';
import { TenantConfigurationService } from '../config/tenant-configuration.service';
import {
  AppModuleKey,
  MODULES_CONFIG_KEY,
  normalizeEnabledModules,
} from '../auth/module-access.constants';
import {
  BLUEPRINT_KEY_CONFIG_KEY,
  BLUEPRINT_VERSION_CONFIG_KEY,
  BUSINESS_TYPE_CONFIG_KEY,
  FEATURE_FLAGS_CONFIG_KEY,
  INSTALLED_APPS_CONFIG_KEY,
  NAVIGATION_KEYS_CONFIG_KEY,
} from './blueprint-manifest.constants';
import {
  createLegacyFallbackManifest,
  getBlueprintNavigationCatalogV1,
  getBlueprintManifestV1,
} from './blueprint-manifest.definitions';
import { BlueprintManifestV1 } from './blueprint-manifest.types';

interface ManifestSourceInfo {
  blueprintKey: string;
  blueprintVersion: string;
  businessType: string;
  fallbackFromEnabledModules: boolean;
}

export interface EffectiveManifestPayload {
  manifest: BlueprintManifestV1;
  source: ManifestSourceInfo;
}

@Injectable()
export class BlueprintManifestService {
  constructor(
    private readonly tenantConfigurationService: TenantConfigurationService,
  ) {}

  private parseJson(input: string | null): unknown {
    if (!input) {
      return undefined;
    }
    try {
      return JSON.parse(input);
    } catch {
      return undefined;
    }
  }

  private parseInstalledApps(input: unknown): string[] {
    if (!Array.isArray(input)) {
      return [];
    }

    return Array.from(
      new Set(
        input
          .map((entry) =>
            String(entry || '')
              .trim()
              .toLowerCase(),
          )
          .filter((entry) => entry.length > 0),
      ),
    );
  }

  private parseFeatureFlags(input: unknown): Record<string, boolean> {
    if (!input || typeof input !== 'object') {
      return {};
    }

    const entries = Object.entries(input as Record<string, unknown>).filter(
      ([, value]) => typeof value === 'boolean',
    );
    return Object.fromEntries(entries) as Record<string, boolean>;
  }

  private parseNavigationKeys(input: unknown): string[] {
    if (!Array.isArray(input)) {
      return [];
    }

    return Array.from(
      new Set(
        input
          .map((entry) =>
            String(entry || '')
              .trim()
              .toLowerCase(),
          )
          .filter((entry) => entry.length > 0),
      ),
    );
  }

  private mergeManifestWithTenantState(
    baseManifest: BlueprintManifestV1,
    enabledModules: AppModuleKey[] | null,
    installedApps: string[],
    featureFlags: Record<string, boolean>,
    configuredBusinessType: string | null,
    navigationKeysOverride: string[] | null,
  ): BlueprintManifestV1 {
    const baseApps = baseManifest.apps || [];
    const mergedApps = baseApps.map((app) => ({
      ...app,
      enabledByDefault:
        Boolean(app.enabledByDefault) || installedApps.includes(app.key),
    }));

    const baseNavigation = Array.isArray(baseManifest.navigation)
      ? baseManifest.navigation
      : [];
    const navigationCatalog = getBlueprintNavigationCatalogV1();
    const navigationByKey = new Map(
      [...navigationCatalog, ...baseNavigation].map((item) => [
        String(item.key || '')
          .trim()
          .toLowerCase(),
        item,
      ]),
    );
    const mergedNavigation = Array.isArray(navigationKeysOverride)
      ? navigationKeysOverride
          .map((key) =>
            navigationByKey.get(
              String(key || '')
                .trim()
                .toLowerCase(),
            ),
          )
          .filter((item): item is BlueprintManifestV1['navigation'][number] =>
            Boolean(item),
          )
      : baseNavigation;

    return {
      ...baseManifest,
      businessType:
        configuredBusinessType === 'restaurant' ||
        configuredBusinessType === 'spa_barber' ||
        configuredBusinessType === 'fashion' ||
        configuredBusinessType === 'hardware'
          ? configuredBusinessType
          : baseManifest.businessType,
      enabledModules:
        Array.isArray(enabledModules) && enabledModules.length > 0
          ? enabledModules
          : baseManifest.enabledModules,
      navigation: mergedNavigation,
      apps: mergedApps,
      featureFlags: {
        ...(baseManifest.featureFlags || {}),
        ...featureFlags,
      },
    };
  }

  async resolveEffectiveManifest(
    tenantId: string,
  ): Promise<EffectiveManifestPayload> {
    const [
      configuredBlueprintKey,
      configuredBlueprintVersion,
      configuredBusinessType,
      configuredInstalledApps,
      configuredFeatureFlags,
      configuredModules,
      configuredNavigationKeys,
    ] = await Promise.all([
      this.tenantConfigurationService.getTenantConfiguration(
        tenantId,
        BLUEPRINT_KEY_CONFIG_KEY,
      ),
      this.tenantConfigurationService.getTenantConfiguration(
        tenantId,
        BLUEPRINT_VERSION_CONFIG_KEY,
      ),
      this.tenantConfigurationService.getTenantConfiguration(
        tenantId,
        BUSINESS_TYPE_CONFIG_KEY,
      ),
      this.tenantConfigurationService.getTenantConfiguration(
        tenantId,
        INSTALLED_APPS_CONFIG_KEY,
      ),
      this.tenantConfigurationService.getTenantConfiguration(
        tenantId,
        FEATURE_FLAGS_CONFIG_KEY,
      ),
      this.tenantConfigurationService.getTenantConfiguration(
        tenantId,
        MODULES_CONFIG_KEY,
      ),
      this.tenantConfigurationService.getTenantConfiguration(
        tenantId,
        NAVIGATION_KEYS_CONFIG_KEY,
      ),
    ]);

    const normalizedBlueprintKey = String(configuredBlueprintKey || '')
      .trim()
      .toLowerCase();
    const normalizedBlueprintVersion = String(
      configuredBlueprintVersion || 'v1',
    )
      .trim()
      .toLowerCase();
    const normalizedBusinessType = String(configuredBusinessType || '')
      .trim()
      .toLowerCase();

    const parsedInstalledApps = this.parseInstalledApps(
      this.parseJson(configuredInstalledApps),
    );
    const parsedFeatureFlags = this.parseFeatureFlags(
      this.parseJson(configuredFeatureFlags),
    );
    const parsedNavigationKeys = this.parseNavigationKeys(
      this.parseJson(configuredNavigationKeys),
    );

    const parsedModules = this.parseJson(configuredModules);
    const normalizedModules = configuredModules
      ? normalizeEnabledModules(parsedModules)
      : null;

    const matchedBlueprint = getBlueprintManifestV1(normalizedBlueprintKey);

    if (!matchedBlueprint) {
      const fallbackModules =
        normalizedModules && normalizedModules.length > 0
          ? normalizedModules
          : normalizeEnabledModules(undefined);
      const fallbackManifest = createLegacyFallbackManifest(fallbackModules);

      return {
        manifest: {
          ...fallbackManifest,
          featureFlags: {
            ...(fallbackManifest.featureFlags || {}),
            ...parsedFeatureFlags,
          },
        },
        source: {
          blueprintKey: fallbackManifest.blueprintKey,
          blueprintVersion: fallbackManifest.blueprintVersion,
          businessType: normalizedBusinessType || fallbackManifest.businessType,
          fallbackFromEnabledModules: true,
        },
      };
    }

    const manifest = this.mergeManifestWithTenantState(
      matchedBlueprint,
      normalizedModules,
      parsedInstalledApps,
      parsedFeatureFlags,
      normalizedBusinessType || null,
      configuredNavigationKeys !== null ? parsedNavigationKeys : null,
    );

    return {
      manifest,
      source: {
        blueprintKey: manifest.blueprintKey,
        blueprintVersion:
          normalizedBlueprintVersion || manifest.blueprintVersion || 'v1',
        businessType: manifest.businessType,
        fallbackFromEnabledModules: false,
      },
    };
  }
}
