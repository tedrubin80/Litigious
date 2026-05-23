const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedDemoUsers() {
  console.log('🌱 Seeding demo users...');
  
  try {
    const demoUsers = [
      {
        email: 'admin@legalestate.com',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        isActive: true
      },
      {
        email: 'demo@legalestate.com',
        password: 'demo123',
        firstName: 'Demo',
        lastName: 'Attorney',
        role: 'ATTORNEY',
        isActive: true
      },
      {
        email: 'paralegal@legalestate.com',
        password: 'paralegal123',
        firstName: 'Demo',
        lastName: 'Paralegal',
        role: 'PARALEGAL',
        isActive: true
      }
    ];

    for (const userData of demoUsers) {
      // Check if user already exists
      const existing = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (existing) {
        console.log(`✓ User ${userData.email} already exists`);
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create user
      await prisma.user.create({
        data: {
          ...userData,
          password: hashedPassword,
          name: `${userData.firstName} ${userData.lastName}`
        }
      });

      console.log(`✅ Created user: ${userData.email}`);
    }

    console.log('🎉 Demo users seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding demo users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedDemoUsers();