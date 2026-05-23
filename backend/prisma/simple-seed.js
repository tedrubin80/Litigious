const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting to seed the database...');

  // Create Users with only the fields that work
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@legalestate.com',
      password: await bcrypt.hash('admin123', 10),
      name: 'System Administrator',
      role: 'ADMIN',
      phone: '(555) 100-0000',
      address: '123 Legal Ave, Law City, LC 12345',
    },
  });

  const attorney = await prisma.user.create({
    data: {
      email: 'attorney@legalestate.com',
      password: await bcrypt.hash('attorney123', 10),
      name: 'Jane Attorney',
      role: 'ATTORNEY',
      phone: '(555) 100-0001',
      address: '123 Legal Ave, Law City, LC 12345',
      barNumber: 'BAR12345',
      hourlyRate: 350.00,
    },
  });

  const paralegal = await prisma.user.create({
    data: {
      email: 'paralegal@legalestate.com',
      password: await bcrypt.hash('paralegal123', 10),
      name: 'John Paralegal',
      role: 'PARALEGAL',
      phone: '(555) 100-0002',
      address: '123 Legal Ave, Law City, LC 12345',
      hourlyRate: 125.00,
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log('📊 Created:');
  console.log('   - 3 Users (Admin, Attorney, Paralegal)');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });