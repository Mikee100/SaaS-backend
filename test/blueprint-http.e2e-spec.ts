import { CanActivate, Controller, ExecutionContext, Get, INestApplication, Injectable, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ModuleAccessGuard } from '../src/auth/module-access.guard';
import { PrismaService } from '../src/prisma.service';
import { UserService } from '../src/user/user.service';
import { MODULES_CONFIG_KEY } from '../src/auth/module-access.constants';
import { Permissions } from '../src/auth/decorators/permissions.decorator';
import * as request from 'supertest';
import { App } from 'supertest/types';

const tenantModules: Record<string, string[]> = {
  'tenant-fashion': [
    'dashboard',
    'sales',
    'credits',
    'inventory',
    'expenses',
    'analytics',
    'reports',
    'accounts',
    'settings',
    'billing',
  ],
  'tenant-restaurant': [
    'dashboard',
    'sales',
    'inventory',
    'expenses',
    'analytics',
    'reports',
    'accounts',
    'settings',
    'billing',
  ],
  'tenant-spa': [
    'dashboard',
    'sales',
    'inventory',
    'expenses',
    'reports',
    'settings',
    'billing',
    'crm',
  ],
};

const prismaMock = {
  tenantConfiguration: {
    findUnique: jest.fn(
      async (args: {
        where: { tenantId_key: { tenantId: string; key: string } };
      }) => {
        const tenantId = args?.where?.tenantId_key?.tenantId;
        const key = args?.where?.tenantId_key?.key;

        if (key === MODULES_CONFIG_KEY) {
          return {
            value: JSON.stringify(tenantModules[tenantId] || ['dashboard']),
          };
        }

        return null;
      },
    ),
  },
};

const userServiceMock = {
  getEffectivePermissions: jest.fn().mockResolvedValue([]),
};

@Injectable()
class InjectUserFromHeadersGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: Record<string, unknown>;
    }>();

    const header = req.headers;

    const parseCsv = (value: string | undefined): string[] =>
      String(value || '')
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);

    req.user = {
      tenantId: header['x-tenant-id'],
      userId: header['x-user-id'] || 'test-user',
      permissions: parseCsv(header['x-permissions']),
      roles: parseCsv(header['x-roles']),
      isSuperadmin: String(header['x-superadmin'] || '').toLowerCase() === 'true',
    };

    return true;
  }
}

@Controller()
class TestRoutesController {
  @Get('tenant/configurations/manifest/effective')
  getManifestEffective() {
    return { ok: true };
  }

  @Get('sales')
  getSales() {
    return { ok: true };
  }

  @Get('crm/pipeline')
  getCrmPipeline() {
    return { ok: true };
  }

  @Get('reports')
  @Permissions('view_reports')
  getReports() {
    return { ok: true };
  }
}

@Module({
  controllers: [TestRoutesController],
  providers: [
    {
      provide: PrismaService,
      useValue: prismaMock,
    },
    {
      provide: UserService,
      useValue: userServiceMock,
    },
    {
      provide: APP_GUARD,
      useClass: InjectUserFromHeadersGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ModuleAccessGuard,
    },
  ],
})
class TestAppModule {}

describe('Blueprint HTTP route enforcement (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows manifest endpoint regardless of module configuration', async () => {
    await request(app.getHttpServer())
      .get('/tenant/configurations/manifest/effective')
      .set('x-tenant-id', 'tenant-restaurant')
      .expect(200)
      .expect({ ok: true });
  });

  it('blocks restaurant tenant from CRM pipeline route when crm module is disabled', async () => {
    const response = await request(app.getHttpServer())
      .get('/crm/pipeline')
      .set('x-tenant-id', 'tenant-restaurant')
      .expect(403);

    expect(response.body.code).toBe('MODULE_ACCESS_DENIED');
    expect(response.body.missingModules).toEqual(['crm']);
  });

  it('allows fashion tenant sales route and enforces capability on reports', async () => {
    await request(app.getHttpServer())
      .get('/sales')
      .set('x-tenant-id', 'tenant-fashion')
      .set('x-permissions', 'view_sales')
      .expect(200);

    const denied = await request(app.getHttpServer())
      .get('/reports')
      .set('x-tenant-id', 'tenant-fashion')
      .set('x-permissions', 'view_inventory')
      .expect(403);

    expect(denied.body.code).toBe('CAPABILITY_ACCESS_DENIED');

    await request(app.getHttpServer())
      .get('/reports')
      .set('x-tenant-id', 'tenant-fashion')
      .set('x-permissions', 'view_reports')
      .expect(200);
  });

  it('allows owner-role bypass for restricted route', async () => {
    await request(app.getHttpServer())
      .get('/crm/pipeline')
      .set('x-tenant-id', 'tenant-restaurant')
      .set('x-roles', 'owner')
      .expect(200);
  });
});
