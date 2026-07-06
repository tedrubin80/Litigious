const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function resetAdminPassword() {
  const email = process.argv[2] || process.env.ADMIN_EMAIL || 'admin@litigious.online';
  const password = process.argv[3] || process.env.ADMIN_PASSWORD;

  if (!password) {
    console.error('Usage: node scripts/reset-admin-password.js <email> <password>');
    console.error('   or: ADMIN_PASSWORD=secret node scripts/reset-admin-password.js [email]');
    process.exit(1);
  }

  console.log(`Resetting admin password for ${email}...`);

  try {
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        isActive: true
      },
      create: {
        email,
        name: 'System Administrator',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        isActive: true,
        emailVerified: true
      }
    });

    console.log('Admin password reset successfully.');
    console.log('Email:', user.email);
    console.log('Role:', user.role);

  } catch (error) {
    console.error('Error resetting password:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdminPassword();
