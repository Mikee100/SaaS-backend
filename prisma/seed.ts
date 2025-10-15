import { seedPermissions } from '../scripts/seed-permissions';
import { seedDefaultRoles } from '../scripts/seed-default-roles';
import { seedPlans } from '../scripts/seed-plans';
import createSuperadmin from '../scripts/create-superadmin';

async function main() {
  await seedPermissions();
  await seedDefaultRoles();
  await seedPlans();
  await createSuperadmin();
  // Add other seeding logic here if needed
}

main()
  .catch(e => { console.error(e); process.exit(1); });
