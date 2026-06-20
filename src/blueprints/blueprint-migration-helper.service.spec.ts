import { MODULES_CONFIG_KEY } from '../auth/module-access.constants';
import {
  BLUEPRINT_KEY_CONFIG_KEY,
  BLUEPRINT_VERSION_CONFIG_KEY,
  BUSINESS_TYPE_CONFIG_KEY,
} from './blueprint-manifest.constants';
import { BlueprintMigrationHelperService } from './blueprint-migration-helper.service';

describe('BlueprintMigrationHelperService', () => {
  let service: BlueprintMigrationHelperService;

  let configStore: Record<string, string | null>;

  const tenantConfigurationService = {
    getTenantConfiguration: jest.fn(
      async (_tenantId: string, key: string) => configStore[key] ?? null,
    ),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    configStore = {
      [BUSINESS_TYPE_CONFIG_KEY]: 'restaurant',
      [BLUEPRINT_KEY_CONFIG_KEY]: '',
      [BLUEPRINT_VERSION_CONFIG_KEY]: 'v1',
      [MODULES_CONFIG_KEY]: JSON.stringify([
        'dashboard',
        'sales',
        'inventory',
        'reports',
      ]),
    };

    service = new BlueprintMigrationHelperService(
      tenantConfigurationService as any,
    );
  });

  it('recommends restaurant blueprint for restaurant-like module footprint', async () => {
    const report = await service.generateTenantDryRunReport(
      'tenant-restaurant-1',
      'restaurant',
    );

    expect(report.recommendation.blueprintKey).toBe('restaurant-standard');
    expect(report.recommendation.confidence).toBeGreaterThan(0.4);
    expect(report.recommendation.suggestedEnabledModules).toContain('sales');
  });

  it('computes module delta from legacy enabledModules', async () => {
    const report = await service.generateTenantDryRunReport(
      'tenant-restaurant-1',
      'restaurant',
    );

    expect(Array.isArray(report.changes.modulesToAdd)).toBe(true);
    expect(Array.isArray(report.changes.modulesToRemove)).toBe(true);
    expect(report.current.enabledModules).toEqual(
      expect.arrayContaining(['dashboard', 'sales']),
    );
  });
});
