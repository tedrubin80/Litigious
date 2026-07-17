#!/usr/bin/env node
/**
 * Copy .env.example → .env when missing (safe for first-time setup).
 */
const fs = require('fs');
const path = require('path');

const pairs = [
  ['backend/.env.example', 'backend/.env'],
  ['frontend/.env.example', 'frontend/.env.local']
];

for (const [example, target] of pairs) {
  const examplePath = path.join(__dirname, '..', example);
  const targetPath = path.join(__dirname, '..', target);

  if (!fs.existsSync(examplePath)) {
    console.warn(`⚠️  Missing template: ${example}`);
    continue;
  }

  if (fs.existsSync(targetPath)) {
    console.log(`✓ ${target} already exists`);
    continue;
  }

  fs.copyFileSync(examplePath, targetPath);
  console.log(`✓ Created ${target} from ${example}`);
}

console.log('\nNext: edit backend/.env (DATABASE_URL, JWT_SECRET, SESSION_SECRET), then npm run db:push');
