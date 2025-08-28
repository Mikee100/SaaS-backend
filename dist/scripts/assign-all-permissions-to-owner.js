"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function assignAllPermissionsToOwner(tenantId) {
    const ownerRole = await prisma.role.findFirst({ where: { name: 'owner', tenantId } });
    if (!ownerRole) {
        console.error(`No owner role found for tenant ${tenantId}`);
        process.exit(1);
    }
    const permissions = await prisma.permission.findMany();
    for (const perm of permissions) {
        const exists = await prisma.rolePermission.findFirst({ where: { roleId: ownerRole.id, permissionId: perm.id } });
        if (!exists) {
            await prisma.rolePermission.create({
                data: {
                    roleId: ownerRole.id,
                    permissionId: perm.id,
                }
            });
            console.log(`Assigned permission '${perm.name}' to owner role for tenant ${tenantId}`);
        }
    }
    console.log('All permissions assigned to owner role.');
}
const [, , tenantId] = process.argv;
if (!tenantId) {
    console.error('Usage: npx ts-node scripts/assign-all-permissions-to-owner.ts <tenantId>');
    process.exit(1);
}
assignAllPermissionsToOwner(tenantId)
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=assign-all-permissions-to-owner.js.map