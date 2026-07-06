const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createDemoUsers() {
  console.log('Creating demo users...\n');

  const demoUsers = [
    {
      email: 'demo@litigious.online',
      name: 'Demo Administrator',
      password: 'demo123',
      role: 'SUPER_ADMIN'
    },
    {
      email: 'user@litigious.online',
      name: 'Demo User',
      password: 'user123',
      role: 'ATTORNEY'
    },
    {
      email: 'client@demo.tech',
      name: 'Demo Client',
      password: 'client123',
      role: 'CLIENT'
    }
  ];

  try {
    for (const userData of demoUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {
          password: hashedPassword,
          name: userData.name,
          role: userData.role
        },
        create: {
          email: userData.email,
          name: userData.name,
          password: hashedPassword,
          role: userData.role
        }
      });

      console.log(`✅ Created/Updated: ${user.email} (${user.role})`);
    }

    console.log('\n=================================');
    console.log('Demo Users Created:');
    console.log('=================================');
    console.log('\n🎭 Demo Admin Account:');
    console.log('   Email: demo@litigious.online');
    console.log('   Password: demo123');
    console.log('\n👤 Demo User Account:');
    console.log('   Email: user@litigious.online');
    console.log('   Password: user123');
    console.log('\n👥 Demo Client Account:');
    console.log('   Email: client@demo.tech');
    console.log('   Password: client123');
    console.log('\n⚠️  These accounts reset daily at 3:00 AM UTC');

  } catch (error) {
    console.error('Error creating demo users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDemoUsers();