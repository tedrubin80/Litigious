const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function seedDemoData() {
  console.log('🌱 Seeding demo data...');

  try {
    // Clear existing data (except for schema)
    await prisma.task.deleteMany();
    await prisma.document.deleteMany();
    await prisma.case.deleteMany();
    await prisma.client.deleteMany();
    await prisma.user.deleteMany();

    console.log('✅ Cleared existing data');

    // Create demo admin user
    const adminPassword = await bcrypt.hash('demo123', 10);
    const demoAdmin = await prisma.user.create({
      data: {
        email: 'demo@legalestate.tech',
        password: adminPassword,
        name: 'Demo Administrator',
        firstName: 'Demo',
        lastName: 'Administrator',
        role: 'ADMIN',
        isActive: true,
        emailVerified: true,
        canAssignTasks: true,
        canManageClients: true,
        canViewBilling: true,
        canManageUsers: true,
        barNumber: 'DEMO001',
        phone: '+1-555-DEMO-01',
        title: 'Senior Partner',
        specialties: ['Personal Injury', 'Medical Malpractice']
      }
    });

    // Create demo user (attorney)
    const userPassword = await bcrypt.hash('user123', 10);
    const demoUser = await prisma.user.create({
      data: {
        email: 'user@legalestate.tech',
        password: userPassword,
        name: 'Demo Attorney',
        firstName: 'Demo',
        lastName: 'Attorney',
        role: 'USER',
        isActive: true,
        emailVerified: true,
        canAssignTasks: false,
        canManageClients: true,
        canViewBilling: false,
        canManageUsers: false,
        barNumber: 'DEMO002',
        phone: '+1-555-DEMO-02',
        title: 'Associate Attorney',
        specialties: ['Personal Injury']
      }
    });

    // Create demo paralegal
    const paralegalPassword = await bcrypt.hash('paralegal123', 10);
    const demoParalegal = await prisma.user.create({
      data: {
        email: 'paralegal@legalestate.tech',
        password: paralegalPassword,
        name: 'Demo Paralegal',
        firstName: 'Demo',
        lastName: 'Paralegal',
        role: 'PARALEGAL',
        isActive: true,
        emailVerified: true,
        canAssignTasks: false,
        canManageClients: false,
        canViewBilling: false,
        canManageUsers: false,
        phone: '+1-555-DEMO-03',
        title: 'Senior Paralegal'
      }
    });

    console.log('✅ Created demo users');

    // Create demo clients
    const demoClients = [
      {
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@email.com',
        phone: '+1-555-0101',
        address: '123 Main St, Anytown, ST 12345',
        dateOfBirth: new Date('1985-06-15'),
        emergencyContact: 'Jane Smith',
        emergencyPhone: '+1-555-0102',
        primaryAttorneyId: demoUser.id,
        status: 'ACTIVE'
      },
      {
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@email.com',
        phone: '+1-555-0201',
        address: '456 Oak Ave, Somewhere, ST 67890',
        dateOfBirth: new Date('1978-03-22'),
        emergencyContact: 'Mike Johnson',
        emergencyPhone: '+1-555-0202',
        primaryAttorneyId: demoUser.id,
        status: 'ACTIVE'
      },
      {
        firstName: 'Robert',
        lastName: 'Davis',
        email: 'robert.davis@email.com',
        phone: '+1-555-0301',
        address: '789 Pine Rd, Elsewhere, ST 54321',
        dateOfBirth: new Date('1990-11-08'),
        emergencyContact: 'Lisa Davis',
        emergencyPhone: '+1-555-0302',
        primaryAttorneyId: demoAdmin.id,
        status: 'ACTIVE'
      }
    ];

    const createdClients = [];
    for (const clientData of demoClients) {
      const client = await prisma.client.create({ data: clientData });
      createdClients.push(client);
    }

    console.log('✅ Created demo clients');

    // Create demo cases
    const demoCases = [
      {
        title: 'Smith v. Metro Hospital - Medical Malpractice',
        description: 'Patient suffered complications during routine surgery due to alleged negligence.',
        caseNumber: 'DEMO-2024-001',
        status: 'ACTIVE',
        caseType: 'Medical Malpractice',
        court: 'Superior Court of Demo County',
        judge: 'Hon. Demo Judge',
        filingDate: new Date('2024-01-15'),
        clientId: createdClients[0].id,
        primaryAttorneyId: demoUser.id,
        estimatedValue: 250000,
        priority: 'HIGH',
        notes: 'Initial consultation completed. Medical records requested.'
      },
      {
        title: 'Johnson Auto Accident Case',
        description: 'Rear-end collision resulting in whiplash and property damage.',
        caseNumber: 'DEMO-2024-002',
        status: 'DISCOVERY',
        caseType: 'Personal Injury',
        court: 'District Court of Demo County',
        filingDate: new Date('2024-02-20'),
        clientId: createdClients[1].id,
        primaryAttorneyId: demoUser.id,
        estimatedValue: 75000,
        priority: 'MEDIUM',
        notes: 'Police report obtained. Waiting for medical records.'
      },
      {
        title: 'Davis Workers Compensation',
        description: 'Workplace injury resulting in permanent disability.',
        caseNumber: 'DEMO-2024-003',
        status: 'NEGOTIATION',
        caseType: 'Workers Compensation',
        filingDate: new Date('2024-03-10'),
        clientId: createdClients[2].id,
        primaryAttorneyId: demoAdmin.id,
        estimatedValue: 150000,
        priority: 'HIGH',
        notes: 'IME scheduled. Preparing for settlement negotiations.'
      }
    ];

    const createdCases = [];
    for (const caseData of demoCases) {
      const demoCase = await prisma.case.create({ data: caseData });
      createdCases.push(demoCase);
    }

    console.log('✅ Created demo cases');

    // Create demo documents
    const demoDocuments = [
      {
        title: 'Medical Records - Surgery Report',
        fileName: 'surgery_report_smith.pdf',
        fileSize: 2540000,
        mimeType: 'application/pdf',
        uploadedById: demoUser.id,
        caseId: createdCases[0].id,
        documentType: 'MEDICAL_RECORD',
        description: 'Surgical notes and post-operative care records'
      },
      {
        title: 'Police Report - Accident #2024-0220',
        fileName: 'police_report_johnson.pdf',
        fileSize: 1890000,
        mimeType: 'application/pdf',
        uploadedById: demoParalegal.id,
        caseId: createdCases[1].id,
        documentType: 'POLICE_REPORT',
        description: 'Official police report from accident scene'
      },
      {
        title: 'Employment Records',
        fileName: 'employment_davis.pdf',
        fileSize: 1250000,
        mimeType: 'application/pdf',
        uploadedById: demoAdmin.id,
        caseId: createdCases[2].id,
        documentType: 'EMPLOYMENT_RECORD',
        description: 'Work history and injury documentation'
      }
    ];

    for (const docData of demoDocuments) {
      await prisma.document.create({ data: docData });
    }

    console.log('✅ Created demo documents');

    // Create demo tasks
    const demoTasks = [
      {
        title: 'Review Medical Records',
        description: 'Analyze surgery report for evidence of malpractice',
        assignedToId: demoUser.id,
        createdById: demoAdmin.id,
        caseId: createdCases[0].id,
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      },
      {
        title: 'Request Insurance Information',
        description: 'Contact insurance company for policy details',
        assignedToId: demoParalegal.id,
        createdById: demoUser.id,
        caseId: createdCases[1].id,
        priority: 'MEDIUM',
        status: 'PENDING',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days from now
      },
      {
        title: 'Prepare Settlement Demand',
        description: 'Draft demand letter for workers comp settlement',
        assignedToId: demoAdmin.id,
        createdById: demoAdmin.id,
        caseId: createdCases[2].id,
        priority: 'HIGH',
        status: 'NOT_STARTED',
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) // 10 days from now
      }
    ];

    for (const taskData of demoTasks) {
      await prisma.task.create({ data: taskData });
    }

    console.log('✅ Created demo tasks');

    // Create demo notes and activities (if tables exist)
    try {
      // Add some case notes
      for (let i = 0; i < createdCases.length; i++) {
        const caseData = createdCases[i];
        await prisma.case.update({
          where: { id: caseData.id },
          data: {
            notes: `${caseData.notes}\n\nDemo Note: This is sample case data for demonstration purposes.`
          }
        });
      }
    } catch (error) {
      console.log('ℹ️  Some optional demo data skipped (tables may not exist)');
    }

    console.log('🎉 Demo data seeding completed successfully!');
    console.log('');
    console.log('📋 Demo Credentials:');
    console.log('   Admin: demo@legalestate.tech / demo123');
    console.log('   User:  user@legalestate.tech / user123');
    console.log('   Paralegal: paralegal@legalestate.tech / paralegal123');
    console.log('');
    console.log('📊 Demo Data Created:');
    console.log(`   👥 Users: 3`);
    console.log(`   🏢 Clients: ${createdClients.length}`);
    console.log(`   📁 Cases: ${createdCases.length}`);
    console.log(`   📄 Documents: ${demoDocuments.length}`);
    console.log(`   ✅ Tasks: ${demoTasks.length}`);

  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedDemoData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { seedDemoData };