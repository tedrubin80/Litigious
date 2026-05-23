const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting to seed the database...');

  // Create Users (Admin, Attorney, Paralegal)
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@legalestate.com',
      password: await bcrypt.hash('admin123', 10),
      name: 'System Administrator',
      firstName: 'System',
      lastName: 'Administrator',
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
      firstName: 'Jane',
      lastName: 'Attorney',
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
      firstName: 'John',
      lastName: 'Paralegal',
      role: 'PARALEGAL',
      phone: '(555) 100-0002',
      address: '123 Legal Ave, Law City, LC 12345',
      hourlyRate: 125.00,
    },
  });

  // Create Clients
  const client1 = await prisma.client.create({
    data: {
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice.johnson@email.com',
      phone: '(555) 200-0001',
      address: '456 Main St',
      city: 'Anytown',
      state: 'CA',
      zipCode: '90210',
      dateOfBirth: new Date('1985-05-15'),
      emergencyContact: 'Bob Johnson',
      emergencyPhone: '(555) 200-0002',
      source: 'Referral',
      createdById: attorney.id,
    },
  });

  const client2 = await prisma.client.create({
    data: {
      firstName: 'Michael',
      lastName: 'Smith',
      email: 'michael.smith@email.com',
      phone: '(555) 200-0003',
      address: '789 Oak Ave',
      city: 'Somewhere',
      state: 'CA',
      zipCode: '90211',
      dateOfBirth: new Date('1978-11-22'),
      emergencyContact: 'Sarah Smith',
      emergencyPhone: '(555) 200-0004',
      source: 'Website',
      createdById: attorney.id,
    },
  });

  // Create Medical Providers
  const provider1 = await prisma.medicalProvider.create({
    data: {
      name: 'City General Hospital',
      type: 'Hospital',
      address: '100 Hospital Blvd, Medical City, MC 12345',
      phone: '(555) 300-0001',
      email: 'records@citygeneralhospital.com',
      contactPerson: 'Dr. Medical Records',
    },
  });

  const provider2 = await prisma.medicalProvider.create({
    data: {
      name: 'Downtown Physical Therapy',
      type: 'Clinic',
      address: '200 Therapy St, Physical City, PC 12345',
      phone: '(555) 300-0002',
      email: 'info@downtownpt.com',
      contactPerson: 'Lisa Therapist',
    },
  });

  // Create Cases
  const case1 = await prisma.case.create({
    data: {
      caseNumber: 'CASE-2024-001',
      title: 'Johnson v. Speedy Delivery Corp',
      description: 'Motor vehicle accident involving delivery truck rear-ending client vehicle at intersection',
      type: 'AUTO_ACCIDENT',
      status: 'ACTIVE',
      dateOpened: new Date('2024-01-15'),
      statute: new Date('2026-01-15'), // 2 year statute
      clientId: client1.id,
      attorneyId: attorney.id,
      paralegalId: paralegal.id,
      settlementAmount: 75000.00,
      attorneyFees: 25000.00,
      costs: 5000.00,
      netToClient: 45000.00,
    },
  });

  const case2 = await prisma.case.create({
    data: {
      caseNumber: 'CASE-2024-002', 
      title: 'Smith v. Property Management Inc',
      description: 'Slip and fall accident at apartment complex due to broken stairs',
      type: 'PREMISES_LIABILITY',
      status: 'SETTLEMENT_NEGOTIATION',
      dateOpened: new Date('2024-02-10'),
      statute: new Date('2026-02-10'),
      clientId: client2.id,
      attorneyId: attorney.id,
      paralegalId: paralegal.id,
      settlementAmount: 50000.00,
      attorneyFees: 16666.67,
      costs: 3333.33,
      netToClient: 30000.00,
    },
  });

  // Add Medical Providers to Cases
  await prisma.case.update({
    where: { id: case1.id },
    data: {
      medicalProviders: {
        connect: [{ id: provider1.id }, { id: provider2.id }]
      }
    },
  });

  // Create Incidents
  await prisma.incident.create({
    data: {
      caseId: case1.id,
      dateOfIncident: new Date('2024-01-10'),
      timeOfIncident: '3:30 PM',
      location: 'Intersection of Main St and 1st Ave',
      description: 'Client was stopped at red light when delivery truck rear-ended vehicle at approximately 25 mph',
      policeReport: 'Yes',
      policeReportNum: 'PR-2024-0110-001',
      weatherConditions: 'Clear, dry conditions',
      witnesses: [
        {
          name: 'Sarah Witness',
          phone: '(555) 400-0001',
          statement: 'Saw the truck fail to stop and hit the car in front'
        }
      ],
      photos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'],
    },
  });

  await prisma.incident.create({
    data: {
      caseId: case2.id,
      dateOfIncident: new Date('2024-02-05'),
      timeOfIncident: '7:45 AM',
      location: 'Stairway of Sunset Apartments, Unit 2B',
      description: 'Client fell down broken wooden stairs that had missing handrail',
      policeReport: 'No',
      weatherConditions: 'Light rain',
      witnesses: [
        {
          name: 'Neighbor Jones',
          phone: '(555) 400-0002',
          statement: 'Heard the fall and came to help'
        }
      ],
      photos: ['fall1.jpg', 'fall2.jpg', 'stairs1.jpg'],
    },
  });

  // Create Medical Records
  await prisma.medicalRecord.create({
    data: {
      caseId: case1.id,
      providerId: provider1.id,
      dateOfService: new Date('2024-01-10'),
      typeOfService: 'Emergency Room Visit',
      description: 'Initial evaluation and treatment for back and neck pain',
      cost: 2500.00,
      requested: true,
      received: true,
      dateRequested: new Date('2024-01-20'),
      dateReceived: new Date('2024-02-01'),
      notes: 'Records show whiplash and lower back strain',
    },
  });

  await prisma.medicalRecord.create({
    data: {
      caseId: case1.id,
      providerId: provider2.id,
      dateOfService: new Date('2024-01-25'),
      typeOfService: 'Physical Therapy - Initial Evaluation',
      description: 'PT evaluation and treatment plan for neck and back injuries',
      cost: 350.00,
      requested: true,
      received: true,
      dateRequested: new Date('2024-02-01'),
      dateReceived: new Date('2024-02-10'),
    },
  });

  // Create Insurance Records
  await prisma.insurance.create({
    data: {
      caseId: case1.id,
      company: 'Speedy Delivery Insurance Co',
      policyNumber: 'SDL-123456789',
      adjusterName: 'Tom Adjuster',
      adjusterPhone: '(555) 500-0001',
      adjusterEmail: 'tom.adjuster@speedyins.com',
      policyLimits: '$100,000 / $300,000',
      type: 'Commercial Auto',
      isOwnInsurance: false,
    },
  });

  await prisma.insurance.create({
    data: {
      caseId: case1.id,
      company: 'Client Auto Insurance',
      policyNumber: 'CAI-987654321',
      policyLimits: '$25,000 / $50,000',
      type: 'Personal Auto',
      isOwnInsurance: true,
    },
  });

  // Create Settlement
  await prisma.settlement.create({
    data: {
      caseId: case1.id,
      amount: 75000.00,
      status: 'EXECUTED',
      proposedDate: new Date('2024-06-01'),
      acceptedDate: new Date('2024-06-15'),
      executedDate: new Date('2024-07-01'),
      attorneyFees: 25000.00,
      costs: 5000.00,
      netToClient: 45000.00,
      attorneyPercent: 33.33,
      paymentTerms: 'Lump sum payment within 30 days',
      settlor: 'Speedy Delivery Corp',
      payorContact: 'Claims Manager',
      payorPhone: '(555) 500-0001',
      description: 'Full and final settlement for all claims arising from motor vehicle accident',
      confidential: false,
      demandLetterSent: true,
      agreementSigned: true,
      releasesSigned: true,
      negotiatedById: attorney.id,
      approvedById: adminUser.id,
    },
  });

  // Create Documents
  await prisma.document.create({
    data: {
      title: 'Police Report - Johnson Accident',
      filename: 'police_report_johnson.pdf',
      originalName: 'Police Report 2024-0110-001.pdf',
      type: 'POLICE_REPORT',
      fileType: 'pdf',
      fileSize: 1024000,
      filePath: '/documents/police_report_johnson.pdf',
      description: 'Official police report from accident scene',
      caseId: case1.id,
      uploadedBy: paralegal.id,
    },
  });

  await prisma.document.create({
    data: {
      title: 'Demand Letter - Johnson v Speedy Delivery',
      type: 'DEMAND_LETTER',
      content: 'DEMAND LETTER\n\nDear Insurance Adjuster,\n\nThis letter serves as formal demand for settlement...',
      description: 'AI-generated demand letter for settlement negotiations',
      caseId: case1.id,
      uploadedBy: attorney.id,
      generatedBy: 'AI',
      aiProvider: 'openai',
      metadata: {
        usage: { tokens: 1500, cost: 0.03 },
        template: 'demand_letter'
      },
    },
  });

  // Create Tasks
  await prisma.task.create({
    data: {
      title: 'Review medical records',
      description: 'Review and summarize all medical records for Johnson case',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      priority: 'HIGH',
      status: 'PENDING',
      caseId: case1.id,
      assignedToId: paralegal.id,
      createdById: attorney.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Schedule deposition',
      description: 'Contact opposing counsel to schedule defendant driver deposition',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      priority: 'MEDIUM',
      status: 'PENDING',
      caseId: case2.id,
      assignedToId: attorney.id,
      createdById: attorney.id,
    },
  });

  // Create Time Entries
  await prisma.timeEntry.create({
    data: {
      description: 'Initial client consultation and case evaluation',
      hours: 2.5,
      rate: 350.00,
      amount: 875.00,
      date: new Date('2024-01-16'),
      billable: true,
      billed: false,
      caseId: case1.id,
      userId: attorney.id,
    },
  });

  await prisma.timeEntry.create({
    data: {
      description: 'Document review and organization',
      hours: 3.0,
      rate: 125.00,
      amount: 375.00,
      date: new Date('2024-01-17'),
      billable: true,
      billed: false,
      caseId: case1.id,
      userId: paralegal.id,
    },
  });

  // Create Calendar Events
  await prisma.calendarEvent.create({
    data: {
      title: 'Deposition - Delivery Driver',
      description: 'Deposition of defendant driver in Johnson case',
      type: 'DEPOSITION',
      startDate: new Date('2024-09-15'),
      startTime: '10:00 AM',
      endTime: '4:00 PM',
      location: 'Legal Estate Law Offices',
      caseId: case1.id,
      createdById: attorney.id,
      assignedToId: attorney.id,
      reminderTime: 60, // 1 hour before
    },
  });

  await prisma.calendarEvent.create({
    data: {
      title: 'Court Date - Motion Hearing',
      description: 'Motion to compel discovery responses',
      type: 'COURT_DATE',
      startDate: new Date('2024-10-01'),
      startTime: '9:00 AM',
      location: 'Superior Court Room 3A',
      caseId: case2.id,
      createdById: attorney.id,
      assignedToId: attorney.id,
      courtroom: '3A',
      reminderTime: 1440, // 24 hours before
    },
  });

  // Create Communications
  await prisma.communication.create({
    data: {
      type: 'EMAIL',
      direction: 'OUTBOUND',
      subject: 'Settlement Demand - Johnson Case',
      content: 'Please see attached demand letter for settlement of our client\'s claim...',
      dateTime: new Date('2024-06-01'),
      caseId: case1.id,
      clientId: client1.id,
      userId: attorney.id,
    },
  });

  // Create Expenses
  await prisma.expense.create({
    data: {
      description: 'Court filing fees',
      amount: 350.00,
      category: 'Court Costs',
      date: new Date('2024-03-01'),
      reimbursable: true,
      reimbursed: false,
      caseId: case1.id,
    },
  });

  // Create Invoice
  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2024-001',
      clientId: client1.id,
      caseId: case1.id,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      status: 'SENT',
      subtotal: 1250.00,
      taxRate: 8.25,
      taxAmount: 103.13,
      totalAmount: 1353.13,
      description: 'Legal services for motor vehicle accident case',
      terms: 'Payment due within 30 days',
      createdById: attorney.id,
      sentToClient: true,
      sentDate: new Date(),
    },
  });

  // Create Invoice Line Items
  await prisma.invoiceLineItem.create({
    data: {
      invoiceId: invoice.id,
      description: 'Attorney consultation and case evaluation',
      quantity: 2.5,
      rate: 350.00,
      amount: 875.00,
    },
  });

  await prisma.invoiceLineItem.create({
    data: {
      invoiceId: invoice.id,
      description: 'Document review and organization',
      quantity: 3.0,
      rate: 125.00,
      amount: 375.00,
    },
  });

  // Create Activity Log
  await prisma.activity.create({
    data: {
      action: 'CREATE',
      description: 'Created new case: Johnson v. Speedy Delivery Corp',
      entityType: 'CASE',
      entityId: case1.id,
      userId: attorney.id,
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Legal Estate System)',
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log('📊 Created:');
  console.log('   - 3 Users (Admin, Attorney, Paralegal)');
  console.log('   - 2 Clients');
  console.log('   - 2 Medical Providers');
  console.log('   - 2 Cases');
  console.log('   - 2 Incidents');
  console.log('   - 2 Medical Records');
  console.log('   - 2 Insurance Records');
  console.log('   - 1 Settlement');
  console.log('   - 2 Documents');
  console.log('   - 2 Tasks');
  console.log('   - 2 Time Entries');
  console.log('   - 2 Calendar Events');
  console.log('   - 1 Communication');
  console.log('   - 1 Expense');
  console.log('   - 1 Invoice with 2 Line Items');
  console.log('   - 1 Activity Log Entry');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });