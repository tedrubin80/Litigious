const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createProductionUsers() {
  console.log('Creating production users...\n');

  const users = [
    {
      email: 'admin@legalestate.tech',
      name: 'System Administrator',
      password: 'admin123',
      role: 'SUPER_ADMIN'
    },
    {
      email: 'attorney@legalestate.tech',
      name: 'John Attorney',
      password: 'attorney123',
      role: 'ADMIN'
    },
    {
      email: 'paralegal@legalestate.tech',
      name: 'Sarah Paralegal',
      password: 'paralegal123',
      role: 'PARALEGAL'
    },
    {
      email: 'client@legalestate.tech',
      name: 'Demo Client',
      password: 'client123',
      role: 'CLIENT'
    }
  ];

  try {
    for (const userData of users) {
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
    console.log('Production Users Created:');
    console.log('=================================');
    console.log('\n🔑 Admin Account:');
    console.log('   Email: admin@legalestate.tech');
    console.log('   Password: admin123');
    console.log('\n👨‍⚖️ Attorney Account:');
    console.log('   Email: attorney@legalestate.tech');
    console.log('   Password: attorney123');
    console.log('\n👩‍💼 Paralegal Account:');
    console.log('   Email: paralegal@legalestate.tech');
    console.log('   Password: paralegal123');
    console.log('\n👤 Client Account:');
    console.log('   Email: client@legalestate.tech');
    console.log('   Password: client123');
    console.log('\n⚠️  Please change these passwords in production!');

  } catch (error) {
    console.error('Error creating users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createProductionUsers();