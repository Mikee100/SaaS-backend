const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBranchDetails() {
  const branchId = 'b152a8ff-680c-49f2-aae9-59c47b606eb3';
  const branch = await prisma.branch.findUnique({
    where: { id: branchId }
  });
  
  console.log('--- BRANCH FULL RECORD ---');
  if (branch) {
    console.log('ID:', branch.id);
    console.log('Name:', branch.name);
    console.log('TenantID:', branch.tenantId);
    console.log('DeletedAt:', branch.deletedAt);
  } else {
    console.log('Branch not found!');
  }
}

checkBranchDetails()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
