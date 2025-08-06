const { execSync } = require('child_process');

try {
  console.log('Running database seed...');
  execSync('npx prisma db seed', { stdio: 'inherit' });
  console.log('Seed completed successfully!');
} catch (error) {
  console.error('Error running seed:', error.message);
  process.exit(1);
} 