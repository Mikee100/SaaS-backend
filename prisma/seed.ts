import { seedPermissions } from '../scripts/seed-permissions';
import { seedDefaultRoles } from '../scripts/seed-default-roles';

async function main() {
  await seedPermissions();
  await seedDefaultRoles();
  // Add other seeding logic here if needed
}

main()
  .catch(e => { console.error(e); process.exit(1); });
