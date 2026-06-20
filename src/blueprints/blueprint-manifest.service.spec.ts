import { MODULES_CONFIG_KEY } from '../auth/module-access.constants';
import {
  BLUEPRINT_KEY_CONFIG_KEY,
  BLUEPRINT_VERSION_CONFIG_KEY,
  BUSINESS_TYPE_CONFIG_KEY,
  FEATURE_FLAGS_CONFIG_KEY,
  INSTALLED_APPS_CONFIG_KEY,
} from './blueprint-manifest.constants';
import { BlueprintManifestService } from './blueprint-manifest.service';

describe('BlueprintManifestService', () => {
  let service: BlueprintManifestService;
  let configStore: Record<string, string | null>;

  const tenantConfigurationService = {
    getTenantConfiguration: jest.fn(
      async (_tenantId: string, key: string) => configStore[key] ?? null,
    ),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    configStore = {
      [BLUEPRINT_KEY_CONFIG_KEY]: 'restaurant-standard',
      [BLUEPRINT_VERSION_CONFIG_KEY]: 'v1',
      [BUSINESS_TYPE_CONFIG_KEY]: 'restaurant',
      [INSTALLED_APPS_CONFIG_KEY]: JSON.stringify(['delivery']),
      [FEATURE_FLAGS_CONFIG_KEY]: JSON.stringify({
        advanced_analytics_enabled: true,
      }),
      [MODULES_CONFIG_KEY]: JSON.stringify([
        'dashboard',
        'sales',
        'inventory',
        'reports',
      ]),
    };

    service = new BlueprintManifestService(tenantConfigurationService as any);
  });

  it('resolves effective configured blueprint manifest for restaurant tenant', async () => {
    const result = await service.resolveEffectiveManifest('tenant-restaurant-1');

    expect(result.source.fallbackFromEnabledModules).toBe(false);
    expect(result.source.blueprintKey).toBe('restaurant-standard');
    expect(result.manifest.businessType).toBe('restaurant');
    expect(result.manifest.enabledModules).toEqual(
      expect.arrayContaining(['dashboard', 'sales', 'inventory']),
    );
    expect(result.manifest.apps.map((app) => app.key)).toContain('delivery');
  });

  it('falls back to legacy manifest when configured blueprint is missing', async () => {
    configStore[BLUEPRINT_KEY_CONFIG_KEY] = '';
    configStore[MODULES_CONFIG_KEY] = JSON.stringify([
      'dashboard',
      'sales',
      'crm',
    ]);

    const result = await service.resolveEffectiveManifest('tenant-legacy-1');

    expect(result.source.fallbackFromEnabledModules).toBe(true);
    expect(result.source.blueprintKey).toBe('legacy-fallback');
    expect(result.manifest.navigation.length).toBeGreaterThan(0);
    expect(result.manifest.enabledModules).toEqual(
      expect.arrayContaining(['dashboard', 'sales', 'crm']),
    );
  });

  it('merges configured feature flags over base blueprint defaults', async () => {
    configStore[BLUEPRINT_KEY_CONFIG_KEY] = 'spa-standard';
    configStore[BUSINESS_TYPE_CONFIG_KEY] = 'spa_barber';
    configStore[FEATURE_FLAGS_CONFIG_KEY] = JSON.stringify({
      online_booking_enabled: true,
      appointment_reminders_enabled: false,
    });

    const result = await service.resolveEffectiveManifest('tenant-spa-1');

    expect(result.source.blueprintKey).toBe('spa-standard');
    expect(result.manifest.businessType).toBe('spa_barber');
    expect(result.manifest.featureFlags?.online_booking_enabled).toBe(true);
    expect(result.manifest.featureFlags?.appointment_reminders_enabled).toBe(
      false,
    );
  });
});
