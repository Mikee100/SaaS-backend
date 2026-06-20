import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModuleAccessGuard } from './module-access.guard';
import { PrismaService } from '../prisma.service';
import { UserService } from '../user/user.service';
import { MODULES_CONFIG_KEY } from './module-access.constants';
import { MODULE_ACCESS_KEY } from './module-access.decorator';
import { PERMISSIONS_KEY } from './decorators/permissions.decorator';
import { getBlueprintManifestV1 } from '../blueprints/blueprint-manifest.definitions';

function createExecutionContext(options: {
  path: string;
  method?: string;
  user: Record<string, unknown>;
}): ExecutionContext {
  const request = {
    path: options.path,
    url: options.path,
    method: options.method || 'GET',
    user: options.user,
  };

  const response = {
    setHeader: jest.fn(),
  };

  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
}

describe('Cross-blueprint route enforcement', () => {
  let guard: ModuleAccessGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let prisma: { tenantConfiguration: { findUnique: jest.Mock } };
  let userService: { getEffectivePermissions: jest.Mock };

  let requiredCapabilities: string[] | undefined;
  let enabledModules: string[];

  beforeEach(() => {
    requiredCapabilities = undefined;
    enabledModules = [];

    reflector = {
      getAllAndOverride: jest.fn((metadataKey: string) => {
        if (metadataKey === MODULE_ACCESS_KEY) {
          return undefined;
        }
        if (metadataKey === PERMISSIONS_KEY) {
          return requiredCapabilities;
        }
        return undefined;
      }),
    };

    prisma = {
      tenantConfiguration: {
        findUnique: jest.fn(async (args: { where: { tenantId_key: { key: string } } }) => {
          const key = args?.where?.tenantId_key?.key;
          if (key === MODULES_CONFIG_KEY) {
            return { value: JSON.stringify(enabledModules) };
          }
          return null;
        }),
      },
    };

    userService = {
      getEffectivePermissions: jest.fn().mockResolvedValue([]),
    };

    guard = new ModuleAccessGuard(
      reflector as unknown as Reflector,
      prisma as unknown as PrismaService,
      userService as unknown as UserService,
    );
  });

  it('allows Fashion tenant routes for enabled modules and blocks non-enabled module routes', async () => {
    const fashion = getBlueprintManifestV1('fashion-standard');
    expect(fashion).toBeDefined();
    enabledModules = fashion?.enabledModules || [];

    const salesContext = createExecutionContext({
      path: '/sales',
      user: { tenantId: 'tenant-fashion', userId: 'user-1', permissions: ['view_sales'] },
    });

    const payrollContext = createExecutionContext({
      path: '/payroll',
      user: { tenantId: 'tenant-fashion', userId: 'user-1', permissions: ['view_sales'] },
    });

    await expect(guard.canActivate(salesContext)).resolves.toBe(true);
    await expect(guard.canActivate(payrollContext)).rejects.toThrow(ForbiddenException);

    try {
      await guard.canActivate(payrollContext);
    } catch (error) {
      const payload = (error as ForbiddenException).getResponse() as Record<string, unknown>;
      expect(payload.code).toBe('MODULE_ACCESS_DENIED');
    }
  });

  it('blocks Restaurant tenant access to CRM routes when CRM module is not part of blueprint', async () => {
    const restaurant = getBlueprintManifestV1('restaurant-standard');
    expect(restaurant).toBeDefined();
    enabledModules = restaurant?.enabledModules || [];

    const context = createExecutionContext({
      path: '/crm/pipeline',
      user: { tenantId: 'tenant-restaurant', userId: 'user-2', permissions: ['view_sales'] },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);

    try {
      await guard.canActivate(context);
    } catch (error) {
      const payload = (error as ForbiddenException).getResponse() as Record<string, unknown>;
      expect(payload.code).toBe('MODULE_ACCESS_DENIED');
      expect(payload.missingModules).toEqual(['crm']);
    }
  });

  it('enforces capability checks for Spa/Barber blueprint endpoints when metadata requires permissions', async () => {
    const spa = getBlueprintManifestV1('spa-standard');
    expect(spa).toBeDefined();
    enabledModules = spa?.enabledModules || [];
    requiredCapabilities = ['view_reports'];

    const deniedContext = createExecutionContext({
      path: '/reports',
      user: { tenantId: 'tenant-spa', userId: 'user-3', permissions: ['view_inventory'] },
    });

    await expect(guard.canActivate(deniedContext)).rejects.toThrow(ForbiddenException);

    try {
      await guard.canActivate(deniedContext);
    } catch (error) {
      const payload = (error as ForbiddenException).getResponse() as Record<string, unknown>;
      expect(payload.code).toBe('CAPABILITY_ACCESS_DENIED');
      expect(payload.missingCapabilities).toEqual(['view_reports']);
    }

    const allowedContext = createExecutionContext({
      path: '/reports',
      user: { tenantId: 'tenant-spa', userId: 'user-3', permissions: ['view_reports'] },
    });

    await expect(guard.canActivate(allowedContext)).resolves.toBe(true);
  });

  it('allows owner role across blueprints even when modules/capabilities would otherwise fail', async () => {
    enabledModules = ['dashboard'];
    requiredCapabilities = ['view_reports'];

    const ownerContext = createExecutionContext({
      path: '/reports',
      user: { tenantId: 'tenant-owner', userId: 'user-4', roles: [{ name: 'owner' }] },
    });

    await expect(guard.canActivate(ownerContext)).resolves.toBe(true);
    expect(prisma.tenantConfiguration.findUnique).not.toHaveBeenCalled();
  });
});
