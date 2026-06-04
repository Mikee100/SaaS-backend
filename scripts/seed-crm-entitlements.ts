import { PrismaClient } from '@prisma/client';
import {
  CRM_ENTITLEMENTS_CONFIG_KEY,
  getDefaultCrmEntitlements,
} from '../src/auth/crm-entitlements.constants';
import {
  MODULES_CONFIG_KEY,
  normalizeEnabledModules,
} from '../src/auth/module-access.constants';

const prisma = new PrismaClient();

async function seedCrmEntitlements() {
  console.log('Seeding default CRM entitlements for existing tenants...');

  const tenants = await prisma.tenant.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
  });

  let created = 0;
  let skipped = 0;

  for (const tenant of tenants) {
    const existingCrm = await prisma.tenantConfiguration.findUnique({
      where: {
        tenantId_key: {
          tenantId: tenant.id,
          key: CRM_ENTITLEMENTS_CONFIG_KEY,
        },
      },
      select: { id: true },
    });

    if (existingCrm) {
      skipped += 1;
      continue;
    }

    const moduleConfig = await prisma.tenantConfiguration.findUnique({
      where: {
        tenantId_key: {
          tenantId: tenant.id,
          key: MODULES_CONFIG_KEY,
        },
      },
      select: { value: true },
    });

    let parsedModules: unknown;
    try {
      parsedModules = moduleConfig?.value ? JSON.parse(moduleConfig.value) : undefined;
    } catch {
      parsedModules = undefined;
    }

    const enabledModules = normalizeEnabledModules(parsedModules);
    if (!enabledModules.includes('crm')) {
      skipped += 1;
      continue;
    }

    const payload = {
      ...getDefaultCrmEntitlements(),
      source: 'migration',
      reason: 'phase_1_crm_entitlement_initialization',
      effectiveFrom: new Date().toISOString(),
      effectiveTo: null,
    };

    await prisma.tenantConfiguration.create({
      data: {
        id: `tenant_config_${tenant.id}_${CRM_ENTITLEMENTS_CONFIG_KEY}_${Date.now()}`,
        tenantId: tenant.id,
        key: CRM_ENTITLEMENTS_CONFIG_KEY,
        value: JSON.stringify(payload),
        description: 'Tenant CRM entitlements (default from migration)',
        category: 'general',
        isEncrypted: false,
        isPublic: false,
        updatedAt: new Date(),
      },
    });

    created += 1;
    console.log(`Initialized CRM entitlements for tenant: ${tenant.name} (${tenant.id})`);
  }

  console.log(`CRM entitlement seeding complete. Created: ${created}, Skipped: ${skipped}`);
  await prisma.$disconnect();
}

if (require.main === module) {
  seedCrmEntitlements().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { seedCrmEntitlements };