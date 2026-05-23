const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetAdminPassword() {
  console.log('Resetting admin password...');

  try {
    // Hash the new password
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update admin user
    const user = await prisma.user.upsert({
      where: { email: 'admin@legalestate.tech' },
      update: {
        password: hashedPassword,
        role: 'SUPER_ADMIN'
      },
      create: {
        email: 'admin@legalestate.tech',
        name: 'System Administrator',
        password: hashedPassword,
        role: 'SUPER_ADMIN'
      }
    });

    console.log('✅ Admin password reset successfully!');
    console.log('Email:', user.email);
    console.log('Password: admin123');
    console.log('Role:', user.role);

  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdminPassword();