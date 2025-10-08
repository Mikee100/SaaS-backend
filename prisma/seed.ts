import { seedPermissions } from '../scripts/seed-permissions';
import { seedDefaultRoles } from '../scripts/seed-default-roles';
import { seedPlans } from '../scripts/seed-plans';

async function main() {
  await seedPermissions();
  await seedDefaultRoles();
  await seedPlans();
  // Add other seeding logic here if needed
}

main()
  .catch(e => { console.error(e); process.exit(1); });
