"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function assignOwnerRole(userId, tenantId) {
    let ownerRole = await prisma.role.findFirst({ where: { name: { equals: 'owner' }, tenantId } });
    if (!ownerRole) {
        ownerRole = await prisma.role.create({
            data: {
                name: 'owner',
                description: 'Tenant owner',
                tenantId,
            },
        });
        console.log(`Created owner role for tenant ${tenantId}`);
    }
    await prisma.userRole.upsert({
        where: {
            userId_roleId_tenantId: {
                userId,
                roleId: ownerRole.id,
                tenantId
            }
        },
        update: {},
        create: {
            userId,
            roleId: ownerRole.id,
            tenantId
        }
    });
    console.log(`Owner role assigned to user ${userId} for tenant ${tenantId}`);
}
const [, , userId, tenantId] = process.argv;
if (!userId || !tenantId) {
    console.error('Usage: npx ts-node scripts/assign-owner-role.ts <userId> <tenantId>');
    process.exit(1);
}
assignOwnerRole(userId, tenantId)
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=assign-owner-role.js.map