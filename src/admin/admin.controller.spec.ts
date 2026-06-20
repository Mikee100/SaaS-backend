import { BadRequestException } from '@nestjs/common';
import { AdminController } from './admin.controller';
import {
  BLUEPRINT_KEY_CONFIG_KEY,
  BLUEPRINT_VERSION_CONFIG_KEY,
  BUSINESS_TYPE_CONFIG_KEY,
  FEATURE_FLAGS_CONFIG_KEY,
  INSTALLED_APPS_CONFIG_KEY,
} from '../blueprints/blueprint-manifest.constants';
import { MODULES_CONFIG_KEY } from '../auth/module-access.constants';

describe('AdminController blueprint rollout controls', () => {
  let controller: AdminController;

  const adminService = {};
  const subscriptionService = {};
  const authService = {};
  const classificationService = {};

  const auditLogService = {
    log: jest.fn(),
  };

  const blueprintManifestService = {
    resolveEffectiveManifest: jest.fn(),
  };

  const blueprintMigrationHelperService = {
    generateTenantDryRunReport: jest.fn(),
  };

  let configStore: Record<string, string | null>;

  const tenantConfigurationService = {
    getTenantConfiguration: jest.fn(
      async (_tenantId: string, key: string) => configStore[key] ?? null,
    ),
    setTenantConfiguration: jest.fn(
      async (_tenantId: string, key: string, value: string) => {
        configStore[key] = value;
        return { key, value };
      },
    ),
  };

  const prisma = {
    auditLog: {
      findMany: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    configStore = {
      [BUSINESS_TYPE_CONFIG_KEY]: 'restaurant',
      [BLUEPRINT_KEY_CONFIG_KEY]: 'restaurant-standard',
      [BLUEPRINT_VERSION_CONFIG_KEY]: 'v1',
      [INSTALLED_APPS_CONFIG_KEY]: JSON.stringify(['delivery']),
      [FEATURE_FLAGS_CONFIG_KEY]: JSON.stringify({
        restaurant_addon_enabled: true,
      }),
      [MODULES_CONFIG_KEY]: JSON.stringify(['dashboard', 'sales']),
    };

    blueprintManifestService.resolveEffectiveManifest.mockResolvedValue({
      manifest: { blueprintKey: 'restaurant-standard' },
      source: { fallbackFromEnabledModules: false },
    });

    blueprintMigrationHelperService.generateTenantDryRunReport.mockResolvedValue(
      {
        tenantId: 'tenant-1',
        current: {
          businessType: 'restaurant',
          blueprintKey: '',
          blueprintVersion: 'v1',
          enabledModules: ['dashboard', 'sales'],
        },
        recommendation: {
          businessType: 'restaurant',
          blueprintKey: 'restaurant-standard',
          blueprintVersion: 'v1',
          confidence: 0.8,
          rationale: ['test rationale'],
          suggestedEnabledModules: ['dashboard', 'sales'],
          suggestedInstalledApps: ['delivery'],
          suggestedFeatureFlags: {},
        },
        changes: {
          blueprintWillChange: true,
          modulesToAdd: [],
          modulesToRemove: [],
        },
      },
    );

    (adminService as any).getAllTenants = jest
      .fn()
      .mockResolvedValue([
        { id: 'tenant-1', businessType: 'restaurant' },
        { id: 'tenant-2', businessType: 'fashion' },
      ]);

    controller = new AdminController(
      adminService as any,
      subscriptionService as any,
      auditLogService as any,
      authService as any,
      tenantConfigurationService as any,
      prisma as any,
      classificationService as any,
      blueprintManifestService as any,
      blueprintMigrationHelperService as any,
    );
  });

  it('returns tenant migration dry-run report', async () => {
    const response = await controller.getTenantBlueprintMigrationDryRun(
      'tenant-1',
    );

    expect(response.mode).toBe('dry-run');
    expect(response.report.tenantId).toBe('tenant-1');
    expect(
      blueprintMigrationHelperService.generateTenantDryRunReport,
    ).toHaveBeenCalledWith('tenant-1');
  });

  it('returns batch migration dry-run reports with limit', async () => {
    const response = await controller.getBlueprintMigrationDryRun('1');

    expect(response.mode).toBe('dry-run');
    expect(response.analyzedTenants).toBe(1);
    expect(
      blueprintMigrationHelperService.generateTenantDryRunReport,
    ).toHaveBeenCalledTimes(1);
  });

  it('returns migration dry-run summary aggregation', async () => {
    blueprintMigrationHelperService.generateTenantDryRunReport
      .mockResolvedValueOnce({
        tenantId: 'tenant-1',
        current: {
          businessType: 'restaurant',
          blueprintKey: '',
          blueprintVersion: 'v1',
          enabledModules: ['dashboard', 'sales'],
        },
        recommendation: {
          businessType: 'restaurant',
          blueprintKey: 'restaurant-standard',
          blueprintVersion: 'v1',
          confidence: 0.85,
          rationale: ['high confidence'],
          suggestedEnabledModules: ['dashboard', 'sales'],
          suggestedInstalledApps: ['delivery'],
          suggestedFeatureFlags: {},
        },
        changes: {
          blueprintWillChange: true,
          modulesToAdd: [],
          modulesToRemove: [],
        },
      })
      .mockResolvedValueOnce({
        tenantId: 'tenant-2',
        current: {
          businessType: 'fashion',
          blueprintKey: 'fashion-standard',
          blueprintVersion: 'v1',
          enabledModules: ['dashboard', 'inventory'],
        },
        recommendation: {
          businessType: 'fashion',
          blueprintKey: 'fashion-standard',
          blueprintVersion: 'v1',
          confidence: 0.45,
          rationale: ['low confidence'],
          suggestedEnabledModules: ['dashboard', 'inventory'],
          suggestedInstalledApps: ['supplier_portal'],
          suggestedFeatureFlags: {},
        },
        changes: {
          blueprintWillChange: false,
          modulesToAdd: [],
          modulesToRemove: [],
        },
      });

    const response = await controller.getBlueprintMigrationDryRunSummary('2');

    expect(response.mode).toBe('dry-run-summary');
    expect(response.analyzedTenants).toBe(2);
    expect(response.byBlueprint['restaurant-standard']).toBe(1);
    expect(response.byBlueprint['fashion-standard']).toBe(1);
    expect(response.byConfidenceBand.high).toBe(1);
    expect(response.byConfidenceBand.low).toBe(1);
    expect(response.withBlueprintChange).toBe(1);
    expect(response.withoutBlueprintChange).toBe(1);
  });

  it('builds a dry-run preview without persisting tenant configuration', async () => {
    const response = await controller.previewTenantBlueprint('tenant-1', {
      businessType: 'restaurant',
      blueprintKey: 'restaurant-standard',
      blueprintVersion: 'v1',
      installedApps: ['delivery', 'loyalty'],
      featureFlags: { advanced_analytics_enabled: true },
    });

    expect(response.mode).toBe('preview');
    expect(response.tenantId).toBe('tenant-1');
    expect(response.proposed.blueprintKey).toBe('restaurant-standard');
    expect(response.proposed.installedApps).toEqual(['delivery', 'loyalty']);
    expect(tenantConfigurationService.setTenantConfiguration).not.toHaveBeenCalled();
  });

  it('rejects dry-run preview when blueprint key is invalid', async () => {
    await expect(
      controller.previewTenantBlueprint('tenant-1', {
        blueprintKey: 'unknown-blueprint',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects rollback when no snapshot exists', async () => {
    prisma.auditLog.findMany.mockResolvedValue([]);

    await expect(
      controller.rollbackTenantBlueprint(
        'tenant-1',
        {},
        {
          user: { userId: 'admin-1' },
          ip: '127.0.0.1',
        } as any,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rolls back tenant blueprint from latest audit snapshot', async () => {
    prisma.auditLog.findMany.mockResolvedValue([
      {
        id: 'audit-1',
        details: {
          tenantId: 'tenant-1',
          previousConfigured: {
            businessType: 'fashion',
            blueprintKey: 'fashion-standard',
            blueprintVersion: 'v1',
            installedApps: ['loyalty'],
            featureFlags: { advanced_analytics_enabled: false },
            enabledModules: ['dashboard', 'inventory'],
          },
        },
      },
    ]);

    const response = await controller.rollbackTenantBlueprint(
      'tenant-1',
      {},
      {
        user: { userId: 'admin-1' },
        ip: '127.0.0.1',
      } as any,
    );

    expect(response.message).toContain('rollback completed successfully');
    expect(response.rollbackSourceEventId).toBe('audit-1');
    expect(response.configured.blueprintKey).toBe('fashion-standard');
    expect(tenantConfigurationService.setTenantConfiguration).toHaveBeenCalled();
    expect(auditLogService.log).toHaveBeenCalledWith(
      'admin-1',
      'platform_tenant_blueprint_rolled_back',
      expect.any(Object),
      '127.0.0.1',
    );
  });
});
