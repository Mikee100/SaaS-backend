import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function makeSuperadmin(userId: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      console.error('User not found:', userId);
      return;
    }
    await prisma.user.update({
      where: { id: userId },
      data: { isSuperadmin: true },
    });
    console.log(`User ${user.email} (${user.id}) is now a superadmin.`);
  } catch (error) {
    console.error('Error updating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// If running directly, get userId from command line
if (require.main === module) {
  const userId = process.argv[2];
  if (!userId) {
    console.error('Usage: npx ts-node make-superadmin.ts <userId>');
    process.exit(1);
  }
  makeSuperadmin(userId);
}

export default makeSuperadmin;
