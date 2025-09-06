"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    try {
        console.log('Checking database connection...');
        await prisma.$connect();
        console.log('Database connection successful!\n');
        console.log('Listing all users:');
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                isSuperadmin: true,
                tenantId: true,
                branchId: true,
                userRoles: {
                    include: {
                        role: true,
                        tenant: true
                    }
                }
            }
        });
        console.log(`Found ${users.length} users:`);
        console.log(JSON.stringify(users, null, 2));
        const adminUsers = users.filter(user => user.userRoles.some(ur => ur.role.name.toLowerCase() === 'admin'));
        console.log(`\nFound ${adminUsers.length} admin users:`);
        console.log(JSON.stringify(adminUsers, null, 2));
        if (adminUsers.length === 0) {
            console.log('\nNo admin users found. You may want to create an admin user.');
        }
    }
    catch (error) {
        console.error('Error checking database:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
main()
    .catch(e => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=check-users.js.map