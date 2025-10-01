import { seedPermissions } from '../scripts/seed-permissions';

async function main() {
  await seedPermissions();
  // Add other seeding logic here if needed
}

main()
  .catch(e => { console.error(e); process.exit(1); });
