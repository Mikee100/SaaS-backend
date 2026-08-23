import { spawn } from 'child_process';

const STEPS: Array<{ label: string; command: string; args: string[] }> = [
  {
    label: 'Apply Prisma migrations',
    command: 'npx',
    args: ['prisma', 'migrate', 'deploy'],
  },
  {
    label: 'Seed global permissions',
    command: 'npx',
    args: ['ts-node', 'scripts/seed-permissions.ts'],
  },
  {
    label: 'Seed subscription plans/packages',
    command: 'npx',
    args: ['ts-node', 'scripts/seed-plans.ts'],
  },
  {
    label: 'Seed business classifications and measurement units',
    command: 'npx',
    args: ['ts-node', 'scripts/seed-classifications.ts'],
  },
  {
    label: 'Ensure superadmin account exists',
    command: 'npx',
    args: ['ts-node', 'scripts/create-superadmin.ts'],
  },
  {
    label: 'Seed tenant default roles',
    command: 'npx',
    args: ['ts-node', 'scripts/seed-default-roles.ts'],
  },
  {
    label: 'Seed CRM entitlements for eligible tenants',
    command: 'npx',
    args: ['ts-node', 'scripts/seed-crm-entitlements.ts'],
  },
];

const shouldSkipMigrations =
  process.argv.includes('--skip-migrations') ||
  process.env.SKIP_PRISMA_MIGRATIONS === 'true';

function runStep(step: { label: string; command: string; args: string[] }): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`\n==> ${step.label}`);
    console.log(`$ ${step.command} ${step.args.join(' ')}`);

    const child = spawn(step.command, step.args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: process.env,
    });

    child.on('error', (error) => reject(error));
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Step failed with exit code ${code}: ${step.label}`));
      }
    });
  });
}

async function main() {
  console.log('Starting new database bootstrap sequence...');

  const stepsToRun = shouldSkipMigrations
    ? STEPS.filter((step) => step.label !== 'Apply Prisma migrations')
    : STEPS;

  if (shouldSkipMigrations) {
    console.log('Skipping Prisma migrations. Running seed-only bootstrap...');
  }

  for (const step of stepsToRun) {
    await runStep(step);
  }

  console.log('\nDatabase bootstrap completed successfully.');
}

main().catch((error) => {
  console.error('\nDatabase bootstrap failed.');
  console.error(error);
  process.exit(1);
});
