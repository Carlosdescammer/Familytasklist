#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');

// This script pushes the database schema non-interactively
// by simulating the 'Enter' key press to select the default option

try {
  console.log('Pushing database schema...');

  // Run drizzle-kit push and automatically accept default (No truncate)
  const result = execSync(
    'echo "" | dotenv -e .env.local -- npx drizzle-kit push',
    {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: '/bin/bash'
    }
  );

  console.log('✓ Schema pushed successfully!');
  process.exit(0);
} catch (error) {
  console.error('Error pushing schema:', error.message);
  process.exit(1);
}
