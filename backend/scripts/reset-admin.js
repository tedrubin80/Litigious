#!/usr/bin/env node
/**
 * Creates or resets the admin user.
 * Usage: node scripts/reset-admin.js [email] [password]
 * Defaults: admin@litigious.online / (prompted or env ADMIN_PASSWORD)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || 'admin@litigious.online';
  const password = process.argv[3] || process.env.ADMIN_PASSWORD;

  if (!password) {
    console.error('Usage: node scripts/reset-admin.js <email> <password>');
    console.error('   or: ADMIN_PASSWORD=secret node scripts/reset-admin.js <email>');
    process.exit(1);
  }

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashed,
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      email,
      password: hashed,
      name: 'Administrator',
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log(`Admin user ready: ${user.email} (id: ${user.id})`);
  console.log('Login at: https://litigious.online/admin/login');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
