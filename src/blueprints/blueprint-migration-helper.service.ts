import { Injectable } from '@nestjs/common';
import {
  AppModuleKey,
  MODULES_CONFIG_KEY,
  normalizeEnabledModules,
} from '../auth/module-access.constants';
import { TenantConfigurationService } from '../config/tenant-configuration.service';
import {
  BLUEPRINT_KEY_CONFIG_KEY,
  BLUEPRINT_VERSION_CONFIG_KEY,
  BUSINESS_TYPE_CONFIG_KEY,
} from './blueprint-manifest.constants';
import {
  BLUEPRINT_MANIFESTS_V1,
  getBlueprintManifestV1,
} from './blueprint-manifest.definitions';
import { BlueprintManifestV1 } from './blueprint-manifest.types';

export interface TenantBlueprintMigrationRecommendation {
  businessType: string;
  blueprintKey: string;
  blueprintVersion: string;
  confidence: number;
  rationale: string[];
  suggestedEnabledModules: AppModuleKey[];
  suggestedInstalledApps: string[];
  suggestedFeatureFlags: Record<string, boolean>;
}

export interface TenantBlueprintMigrationDryRunReport {
  tenantId: string;
  current: {
    businessType: string;
    blueprintKey: string;
    blueprintVersion: string;
    enabledModules: AppModuleKey[];
  };
  recommendation: TenantBlueprintMigrationRecommendation;
  changes: {
    blueprintWillChange: boolean;
    modulesToAdd: AppModuleKey[];
    modulesToRemove: AppModuleKey[];
  };
}

@Injectable()
export class BlueprintMigrationHelperService {
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

  private normalizeBusinessType(input: unknown): string {
    const normalized = String(input || '')
      .trim()
      .toLowerCase();

    if (
      normalized === 'fashion' ||
      normalized === 'restaurant' ||
      normalized === 'spa_barber'
    ) {
      return normalized;
    }

    return '';
  }

  private scoreBlueprintMatch(
    enabledModules: AppModuleKey[],
    manifest: BlueprintManifestV1,
    businessTypeHint: string,
  ): number {
    const source = new Set(enabledModules);
    const target = new Set(manifest.enabledModules);

    let overlap = 0;
    for (const module of source) {
      if (target.has(module)) {
        overlap += 1;
      }
    }

    const union = new Set([...source, ...target]).size || 1;
    let score = overlap / union;

    if (businessTypeHint && businessTypeHint === manifest.businessType) {
      score += 0.25;
    }

    if (source.has('crm') && manifest.businessType === 'spa_barber') {
      score += 0.05;
    }

    return Math.min(1, Number(score.toFixed(2)));
  }

  private suggestInstalledApps(
    manifest: BlueprintManifestV1,
    enabledModules: AppModuleKey[],
  ): string[] {
    const suggested = new Set(
      (manifest.apps || [])
        .filter((entry) => Boolean(entry.enabledByDefault))
        .map((entry) => entry.key),
    );

    const appKeys = new Set((manifest.apps || []).map((entry) => entry.key));

    if (enabledModules.includes('crm') && appKeys.has('loyalty')) {
      suggested.add('loyalty');
    }
    if (enabledModules.includes('inventory') && appKeys.has('supplier_portal')) {
      suggested.add('supplier_portal');
    }
    if (enabledModules.includes('sales') && appKeys.has('delivery')) {
      suggested.add('delivery');
    }
    if (enabledModules.includes('sales') && appKeys.has('online_booking')) {
      suggested.add('online_booking');
    }

    return Array.from(suggested).sort((a, b) => a.localeCompare(b));
  }

  private suggestFeatureFlags(
    manifest: BlueprintManifestV1,
    enabledModules: AppModuleKey[],
  ): Record<string, boolean> {
    const flags = {
      ...(manifest.featureFlags || {}),
    };

    if (Object.prototype.hasOwnProperty.call(flags, 'advanced_analytics_enabled')) {
      flags.advanced_analytics_enabled = enabledModules.includes('analytics');
    }

    if (Object.prototype.hasOwnProperty.call(flags, 'ai_assistant_enabled')) {
      flags.ai_assistant_enabled = enabledModules.includes('ai');
    }

    return flags;
  }

  private deriveRationale(
    enabledModules: AppModuleKey[],
    manifest: BlueprintManifestV1,
    confidence: number,
  ): string[] {
    const rationale: string[] = [];
    const overlap = enabledModules.filter((module) =>
      manifest.enabledModules.includes(module),
    );

    rationale.push(
      `Matched ${overlap.length}/${enabledModules.length || 1} enabled legacy modules to ${manifest.blueprintKey}.`,
    );

    if (enabledModules.includes('crm') && manifest.businessType === 'spa_barber') {
      rationale.push('CRM + service workflow pattern favors spa_barber blueprint.');
    }
    if (enabledModules.includes('sales') && manifest.businessType === 'restaurant') {
      rationale.push('Sales-heavy workflow aligns with restaurant operational model.');
    }
    if (confidence < 0.5) {
      rationale.push('Low confidence suggestion; review manually before applying.');
    }

    return rationale;
  }

  async generateTenantDryRunReport(
    tenantId: string,
    businessTypeHint?: string,
  ): Promise<TenantBlueprintMigrationDryRunReport> {
    const [configuredModules, configuredBusinessType, configuredBlueprintKey, configuredBlueprintVersion] =
      await Promise.all([
        this.tenantConfigurationService.getTenantConfiguration(
          tenantId,
          MODULES_CONFIG_KEY,
        ),
        this.tenantConfigurationService.getTenantConfiguration(
          tenantId,
          BUSINESS_TYPE_CONFIG_KEY,
        ),
        this.tenantConfigurationService.getTenantConfiguration(
          tenantId,
          BLUEPRINT_KEY_CONFIG_KEY,
        ),
        this.tenantConfigurationService.getTenantConfiguration(
          tenantId,
          BLUEPRINT_VERSION_CONFIG_KEY,
        ),
      ]);

    const currentEnabledModules = normalizeEnabledModules(
      this.parseJson(configuredModules),
    );

    const normalizedBusinessType =
      this.normalizeBusinessType(configuredBusinessType) ||
      this.normalizeBusinessType(businessTypeHint);

    const scored = BLUEPRINT_MANIFESTS_V1.map((manifest) => ({
      manifest,
      score: this.scoreBlueprintMatch(
        currentEnabledModules,
        manifest,
        normalizedBusinessType,
      ),
    })).sort((a, b) => b.score - a.score);

    const selected = scored[0]?.manifest || BLUEPRINT_MANIFESTS_V1[0];
    const selectedConfidence = scored[0]?.score ?? 0.4;

    const suggestedEnabledModules = normalizeEnabledModules(
      selected.enabledModules,
    );
    const suggestedInstalledApps = this.suggestInstalledApps(
      selected,
      currentEnabledModules,
    );
    const suggestedFeatureFlags = this.suggestFeatureFlags(
      selected,
      currentEnabledModules,
    );

    const currentBlueprint = getBlueprintManifestV1(
      String(configuredBlueprintKey || '')
        .trim()
        .toLowerCase(),
    );

    return {
      tenantId,
      current: {
        businessType:
          normalizedBusinessType || currentBlueprint?.businessType || selected.businessType,
        blueprintKey: String(configuredBlueprintKey || '').trim().toLowerCase(),
        blueprintVersion: String(configuredBlueprintVersion || 'v1')
          .trim()
          .toLowerCase(),
        enabledModules: currentEnabledModules,
      },
      recommendation: {
        businessType: selected.businessType,
        blueprintKey: selected.blueprintKey,
        blueprintVersion: selected.blueprintVersion,
        confidence: selectedConfidence,
        rationale: this.deriveRationale(
          currentEnabledModules,
          selected,
          selectedConfidence,
        ),
        suggestedEnabledModules,
        suggestedInstalledApps,
        suggestedFeatureFlags,
      },
      changes: {
        blueprintWillChange:
          String(configuredBlueprintKey || '').trim().toLowerCase() !==
          selected.blueprintKey,
        modulesToAdd: suggestedEnabledModules.filter(
          (module) => !currentEnabledModules.includes(module),
        ),
        modulesToRemove: currentEnabledModules.filter(
          (module) => !suggestedEnabledModules.includes(module),
        ),
      },
    };
  }
}
