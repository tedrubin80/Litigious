const bcrypt = require('bcryptjs');
const prisma = require('./lib/prisma');

async function seed() {
  try {
    console.log('🌱 Seeding database...');

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@legalestate.com' },
      update: {},
      create: {
        email: 'admin@legalestate.com',
        password: hashedPassword,
        name: 'System Administrator',
        role: 'ADMIN'
      }
    });

    console.log('✅ Created admin user:', adminUser.email);

    // Create sample cases
    const case1 = await prisma.case.upsert({
      where: { id: 'case-1' },
      update: {},
      create: {
        id: 'case-1',
        clientName: 'John Smith',
        caseType: 'Personal Injury',
        status: 'Active',
        nextAction: 'Medical records review',
        attorney: 'Sarah Johnson',
        userId: adminUser.id
      }
    });

    const case2 = await prisma.case.upsert({
      where: { id: 'case-2' },
      update: {},
      create: {
        id: 'case-2',
        clientName: 'Mary Johnson',
        caseType: 'Auto Accident',
        status: 'Settlement',
        nextAction: 'Settlement negotiation',
        attorney: 'Michael Chen',
        userId: adminUser.id
      }
    });

    console.log('✅ Created sample cases');

    // Create sample documents
    await prisma.document.upsert({
      where: { id: 'doc-1' },
      update: {},
      create: {
        id: 'doc-1',
        name: 'Medical Records - Smith Case',
        type: 'Medical Report',
        uploadedBy: 'Sarah Johnson',
        size: '2.4 MB',
        caseId: case1.id
      }
    });

    await prisma.document.upsert({
      where: { id: 'doc-2' },
      update: {},
      create: {
        id: 'doc-2',
        name: 'Insurance Settlement - Johnson Case',
        type: 'Settlement Document',
        uploadedBy: 'Michael Chen',
        size: '1.8 MB',
        caseId: case2.id
      }
    });

    console.log('✅ Created sample documents');
    console.log('🎉 Database seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();