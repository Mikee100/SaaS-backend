import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModuleAccessGuard } from './module-access.guard';
import { MODULE_ACCESS_KEY } from './module-access.decorator';
import { PERMISSIONS_KEY } from './decorators/permissions.decorator';
import { PrismaService } from '../prisma.service';
import { UserService } from '../user/user.service';

function buildExecutionContext(options: {
  path?: string;
  method?: string;
  user?: Record<string, unknown>;
}): ExecutionContext {
  const request = {
    path: options.path || '/health',
    url: options.path || '/health',
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

describe('ModuleAccessGuard', () => {
  let guard: ModuleAccessGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let prisma: { tenantConfiguration: { findUnique: jest.Mock } };
  let userService: { getEffectivePermissions: jest.Mock };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };

    prisma = {
      tenantConfiguration: {
        findUnique: jest.fn(),
      },
    };

    userService = {
      getEffectivePermissions: jest.fn(),
    };

    guard = new ModuleAccessGuard(
      reflector as unknown as Reflector,
      prisma as unknown as PrismaService,
      userService as unknown as UserService,
    );
  });

  it('returns true when no module/capability requirements exist', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const context = buildExecutionContext({
      path: '/health',
      user: { tenantId: 't1', userId: 'u1' },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('throws CAPABILITY_ACCESS_DENIED when required capability is missing', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === PERMISSIONS_KEY) return ['view_reports'];
      if (key === MODULE_ACCESS_KEY) return [];
      return undefined;
    });

    userService.getEffectivePermissions.mockResolvedValue([]);

    const context = buildExecutionContext({
      path: '/any',
      user: { tenantId: 'tenant-1', userId: 'user-1', permissions: [] },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);

    try {
      await guard.canActivate(context);
    } catch (error) {
      const forbidden = error as ForbiddenException;
      const payload = forbidden.getResponse() as Record<string, unknown>;
      expect(payload.code).toBe('CAPABILITY_ACCESS_DENIED');
      expect(payload.missingCapabilities).toEqual(['view_reports']);
    }
  });

  it('accepts alias permission mapping for capabilities', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === PERMISSIONS_KEY) return ['view_reports'];
      if (key === MODULE_ACCESS_KEY) return [];
      return undefined;
    });

    const context = buildExecutionContext({
      path: '/any',
      user: {
        tenantId: 'tenant-1',
        userId: 'user-1',
        permissions: ['view_sales'],
      },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('throws MODULE_ACCESS_DENIED when required module is disabled', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === MODULE_ACCESS_KEY) return ['inventory'];
      if (key === PERMISSIONS_KEY) return [];
      return undefined;
    });

    prisma.tenantConfiguration.findUnique.mockResolvedValue({
      value: JSON.stringify(['sales']),
    });

    const context = buildExecutionContext({
      path: '/inventory',
      user: { tenantId: 'tenant-1', userId: 'user-1', permissions: ['*'] },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);

    try {
      await guard.canActivate(context);
    } catch (error) {
      const forbidden = error as ForbiddenException;
      const payload = forbidden.getResponse() as Record<string, unknown>;
      expect(payload.code).toBe('MODULE_ACCESS_DENIED');
      expect(payload.missingModules).toEqual(['inventory']);
    }
  });

  it('bypasses checks for owner role', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === MODULE_ACCESS_KEY) return ['inventory'];
      if (key === PERMISSIONS_KEY) return ['manage_inventory'];
      return undefined;
    });

    const context = buildExecutionContext({
      path: '/inventory',
      user: {
        tenantId: 'tenant-1',
        userId: 'user-1',
        roles: [{ name: 'owner' }],
      },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(prisma.tenantConfiguration.findUnique).not.toHaveBeenCalled();
  });
});
