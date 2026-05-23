const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive database seeding...');

  try {
    // Create Users (Attorneys and Staff)
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = await prisma.user.create({
      data: {
        email: 'admin@legalestate.com',
        password: hashedPassword,
        name: 'System Administrator',
        role: 'ADMIN',
        phone: '(555) 123-4567',
        address: '123 Legal Street, Law City, LC 12345',
        barNumber: 'ADM001',
        hourlyRate: 450.00,
        isActive: true
      }
    });

    const attorney1 = await prisma.user.create({
      data: {
        email: 'sarah.johnson@legalestate.com',
        password: hashedPassword,
        name: 'Sarah Johnson',
        role: 'ATTORNEY',
        phone: '(555) 234-5678',
        address: '456 Attorney Ave, Law City, LC 12345',
        barNumber: 'ATT001',
        hourlyRate: 375.00,
        isActive: true
      }
    });

    const attorney2 = await prisma.user.create({
      data: {
        email: 'michael.chen@legalestate.com',
        password: hashedPassword,
        name: 'Michael Chen',
        role: 'ATTORNEY',
        phone: '(555) 345-6789',
        address: '789 Lawyer Lane, Law City, LC 12345',
        barNumber: 'ATT002',
        hourlyRate: 425.00,
        isActive: true
      }
    });

    const paralegal = await prisma.user.create({
      data: {
        email: 'jennifer.martinez@legalestate.com',
        password: hashedPassword,
        name: 'Jennifer Martinez',
        role: 'PARALEGAL',
        phone: '(555) 456-7890',
        address: '321 Paralegal Place, Law City, LC 12345',
        hourlyRate: 125.00,
        isActive: true
      }
    });

    console.log('✅ Created users (attorneys and staff)');

    // Create Clients
    const client1 = await prisma.client.create({
      data: {
        clientNumber: 'CLI001',
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@email.com',
        phone: '(555) 987-6543',
        mobile: '(555) 876-5432',
        address: '123 Client Street',
        city: 'Client City',
        state: 'CC',
        zipCode: '12345',
        dateOfBirth: new Date('1980-05-15'),
        employer: 'ABC Corporation',
        occupation: 'Manager',
        maritalStatus: 'MARRIED',
        spouseName: 'Jane Smith',
        referredBy: 'Google Search',
        preferredContact: 'EMAIL',
        isActive: true,
        notes: 'Referred by previous client. Very responsive.'
      }
    });

    const client2 = await prisma.client.create({
      data: {
        clientNumber: 'CLI002',
        firstName: 'Mary',
        lastName: 'Johnson',
        email: 'mary.johnson@email.com',
        phone: '(555) 765-4321',
        mobile: '(555) 654-3210',
        address: '456 Client Avenue',
        city: 'Client Town',
        state: 'CT',
        zipCode: '54321',
        dateOfBirth: new Date('1975-11-22'),
        employer: 'XYZ Industries',
        occupation: 'Supervisor',
        maritalStatus: 'SINGLE',
        referredBy: 'Attorney Referral',
        preferredContact: 'PHONE',
        isActive: true,
        notes: 'High-profile case. Handle with care.'
      }
    });

    const client3 = await prisma.client.create({
      data: {
        clientNumber: 'CLI003',
        firstName: 'Robert',
        lastName: 'Davis',
        email: 'robert.davis@email.com',
        phone: '(555) 543-2109',
        mobile: '(555) 432-1098',
        address: '789 Client Boulevard',
        city: 'Client Village',
        state: 'CV',
        zipCode: '67890',
        dateOfBirth: new Date('1965-08-10'),
        employer: 'Self-Employed',
        occupation: 'Contractor',
        maritalStatus: 'DIVORCED',
        referredBy: 'Previous Client',
        preferredContact: 'PHONE',
        isActive: true,
        notes: 'Prefers morning meetings. Very detail-oriented.'
      }
    });

    console.log('✅ Created clients');

    // Create Emergency Contacts
    await prisma.emergencyContact.create({
      data: {
        clientId: client1.id,
        name: 'Jane Smith',
        relationship: 'Spouse',
        phone: '(555) 876-5432',
        email: 'jane.smith@email.com',
        address: '123 Client Street, Client City, CC 12345'
      }
    });

    await prisma.emergencyContact.create({
      data: {
        clientId: client2.id,
        name: 'Susan Johnson',
        relationship: 'Sister',
        phone: '(555) 654-3210',
        email: 'susan.johnson@email.com'
      }
    });

    console.log('✅ Created emergency contacts');

    // Create Cases
    const case1 = await prisma.case.create({
      data: {
        caseNumber: 'CASE-2024-001',
        clientId: client1.id,
        caseType: 'PERSONAL_INJURY',
        status: 'ACTIVE',
        priority: 'HIGH',
        dateOpened: new Date('2024-01-15'),
        description: 'Motor vehicle accident on Highway 95. Client sustained back and neck injuries.',
        courtName: 'Superior Court of Legal County',
        judge: 'Hon. Patricia Wilson',
        opposingParty: 'ABC Insurance Company',
        opposingCounsel: 'Defense Law Firm LLC',
        jurisdiction: 'Legal County, LC',
        practiceArea: 'PERSONAL_INJURY',
        estimatedValue: 150000.00,
        userId: attorney1.id,
        nextAction: 'Complete medical record review and prepare demand letter'
      }
    });

    const case2 = await prisma.case.create({
      data: {
        caseNumber: 'CASE-2024-002',
        clientId: client2.id,
        caseType: 'AUTO_ACCIDENT',
        status: 'ACTIVE',
        priority: 'MEDIUM',
        dateOpened: new Date('2024-02-10'),
        description: 'Rear-end collision at intersection. Client has ongoing medical treatment.',
        courtName: 'Municipal Court of Client County',
        opposingParty: 'XYZ Insurance Corp',
        opposingCounsel: 'Smith & Associates',
        jurisdiction: 'Client County, CT',
        practiceArea: 'PERSONAL_INJURY',
        estimatedValue: 75000.00,
        userId: attorney2.id,
        nextAction: 'Schedule independent medical examination'
      }
    });

    const case3 = await prisma.case.create({
      data: {
        caseNumber: 'CASE-2024-003',
        clientId: client3.id,
        caseType: 'WORKERS_COMPENSATION',
        status: 'PENDING',
        priority: 'MEDIUM',
        dateOpened: new Date('2024-03-05'),
        description: 'Construction site injury - fall from scaffolding.',
        practiceArea: 'PERSONAL_INJURY',
        estimatedValue: 200000.00,
        userId: attorney1.id,
        nextAction: 'File workers compensation claim'
      }
    });

    console.log('✅ Created cases');

    // Create Time Entries
    const timeEntries = [
      {
        caseId: case1.id,
        userId: attorney1.id,
        description: 'Initial client consultation and case evaluation',
        hours: 2.5,
        rate: 375.00,
        billable: true,
        date: new Date('2024-01-15'),
        category: 'CONSULTATION'
      },
      {
        caseId: case1.id,
        userId: attorney1.id,
        description: 'Legal research on liability issues',
        hours: 3.0,
        rate: 375.00,
        billable: true,
        date: new Date('2024-01-16'),
        category: 'RESEARCH'
      },
      {
        caseId: case1.id,
        userId: paralegal.id,
        description: 'Collect and organize medical records',
        hours: 4.0,
        rate: 125.00,
        billable: true,
        date: new Date('2024-01-17'),
        category: 'ADMINISTRATIVE'
      },
      {
        caseId: case2.id,
        userId: attorney2.id,
        description: 'Phone conference with client',
        hours: 0.5,
        rate: 425.00,
        billable: true,
        date: new Date('2024-02-11'),
        category: 'PHONE_CALLS'
      },
      {
        caseId: case2.id,
        userId: attorney2.id,
        description: 'Draft demand letter',
        hours: 2.0,
        rate: 425.00,
        billable: true,
        date: new Date('2024-02-12'),
        category: 'DRAFTING'
      }
    ];

    for (const entry of timeEntries) {
      await prisma.timeEntry.create({ data: entry });
    }

    console.log('✅ Created time entries');

    // Create Expenses
    const expenses = [
      {
        caseId: case1.id,
        description: 'Medical records from General Hospital',
        amount: 45.00,
        category: 'MEDICAL_RECORDS',
        date: new Date('2024-01-18'),
        billable: true
      },
      {
        caseId: case1.id,
        description: 'Court filing fee',
        amount: 350.00,
        category: 'COURT_FEES',
        date: new Date('2024-01-20'),
        billable: true
      },
      {
        caseId: case2.id,
        description: 'Accident scene photographs',
        amount: 125.00,
        category: 'INVESTIGATION',
        date: new Date('2024-02-13'),
        billable: true
      }
    ];

    for (const expense of expenses) {
      await prisma.expense.create({ data: expense });
    }

    console.log('✅ Created expenses');

    // Create Tasks
    const tasks = [
      {
        title: 'Review medical records for Case-2024-001',
        description: 'Thoroughly review all medical documentation and treatment notes',
        caseId: case1.id,
        clientId: client1.id,
        userId: attorney1.id,
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        dueDate: new Date('2024-12-31')
      },
      {
        title: 'Follow up with insurance adjuster',
        description: 'Contact insurance company regarding settlement negotiations',
        caseId: case2.id,
        clientId: client2.id,
        userId: attorney2.id,
        priority: 'MEDIUM',
        status: 'PENDING',
        dueDate: new Date('2024-12-28')
      },
      {
        title: 'Prepare discovery requests',
        description: 'Draft comprehensive interrogatories and document requests',
        caseId: case1.id,
        userId: paralegal.id,
        priority: 'MEDIUM',
        status: 'PENDING',
        dueDate: new Date('2025-01-15')
      }
    ];

    for (const task of tasks) {
      await prisma.task.create({ data: task });
    }

    console.log('✅ Created tasks');

    // Create Appointments
    const appointments = [
      {
        title: 'Client Meeting - John Smith',
        description: 'Case strategy discussion and settlement options',
        caseId: case1.id,
        userId: attorney1.id,
        startTime: new Date('2024-12-30T10:00:00'),
        endTime: new Date('2024-12-30T11:00:00'),
        location: 'Conference Room A',
        type: 'MEETING',
        status: 'SCHEDULED'
      },
      {
        title: 'Court Hearing - Johnson v. XYZ Insurance',
        description: 'Motion hearing for discovery dispute',
        caseId: case2.id,
        userId: attorney2.id,
        startTime: new Date('2025-01-05T14:00:00'),
        endTime: new Date('2025-01-05T15:30:00'),
        location: 'Municipal Courthouse - Room 3B',
        type: 'COURT_HEARING',
        status: 'SCHEDULED'
      },
      {
        title: 'Deposition - Opposing Expert',
        description: 'Medical expert deposition',
        caseId: case1.id,
        userId: attorney1.id,
        startTime: new Date('2025-01-10T09:00:00'),
        endTime: new Date('2025-01-10T12:00:00'),
        location: 'Court Reporter Services',
        type: 'DEPOSITION',
        status: 'SCHEDULED'
      }
    ];

    for (const appointment of appointments) {
      await prisma.appointment.create({ data: appointment });
    }

    console.log('✅ Created appointments');

    // Create Deadlines
    const deadlines = [
      {
        caseId: case1.id,
        title: 'Discovery Deadline',
        description: 'All discovery must be completed',
        dueDate: new Date('2025-03-15'),
        type: 'DISCOVERY_DEADLINE',
        priority: 'HIGH',
        reminder1: new Date('2025-03-01'),
        reminder2: new Date('2025-03-10')
      },
      {
        caseId: case2.id,
        title: 'Statute of Limitations',
        description: 'File lawsuit or case will be time-barred',
        dueDate: new Date('2025-02-10'),
        type: 'STATUTE_OF_LIMITATIONS',
        priority: 'URGENT',
        reminder1: new Date('2025-01-25'),
        reminder2: new Date('2025-02-05')
      },
      {
        caseId: case1.id,
        title: 'Motion Response Due',
        description: 'Response to defendant\'s motion to dismiss',
        dueDate: new Date('2024-12-28'),
        type: 'RESPONSE_DUE',
        priority: 'HIGH',
        reminder1: new Date('2024-12-21'),
        reminder2: new Date('2024-12-26')
      }
    ];

    for (const deadline of deadlines) {
      await prisma.deadline.create({ data: deadline });
    }

    console.log('✅ Created deadlines');

    // Create Communications
    const communications = [
      {
        caseId: case1.id,
        clientId: client1.id,
        type: 'EMAIL',
        direction: 'OUTBOUND',
        subject: 'Case Update - Medical Records Received',
        content: 'We have received your medical records and are reviewing them. We will contact you next week with our analysis.',
        date: new Date('2024-01-19')
      },
      {
        caseId: case2.id,
        clientId: client2.id,
        type: 'PHONE_CALL',
        direction: 'INBOUND',
        subject: 'Client Inquiry about Settlement',
        content: 'Client called asking about timeline for settlement negotiations. Explained current status and next steps.',
        date: new Date('2024-02-14'),
        followUp: new Date('2024-03-01')
      },
      {
        caseId: case1.id,
        type: 'LETTER',
        direction: 'OUTBOUND',
        subject: 'Demand Letter to ABC Insurance',
        content: 'Formal demand letter sent requesting settlement of $150,000 for client\'s injuries.',
        date: new Date('2024-01-25')
      }
    ];

    for (const comm of communications) {
      await prisma.communication.create({ data: comm });
    }

    console.log('✅ Created communications');

    // Create Notes
    const notes = [
      {
        caseId: case1.id,
        userId: attorney1.id,
        title: 'Case Strategy Notes',
        content: 'Client has strong liability case. Medical evidence supports significant injury claims. Recommend aggressive settlement approach.',
        private: false
      },
      {
        caseId: case2.id,
        userId: attorney2.id,
        title: 'Client Meeting Notes',
        content: 'Client is anxious about timeline. Explained legal process and set expectations for settlement negotiations.',
        private: false
      },
      {
        userId: paralegal.id,
        title: 'General Office Note',
        content: 'Updated case management system with new client intake procedures.',
        private: true
      }
    ];

    for (const note of notes) {
      await prisma.note.create({ data: note });
    }

    console.log('✅ Created notes');

    // Create Settlements (using new comprehensive schema)
    const settlement1 = await prisma.settlement.create({
      data: {
        caseId: case1.id,
        type: 'DEMAND',
        amount: 150000.00,
        status: 'NEGOTIATING',
        description: 'Initial settlement demand for personal injury case',
        attorneyFees: 50000.00,
        costs: 5000.00,
        netToClient: 95000.00
      }
    });

    const settlement2 = await prisma.settlement.create({
      data: {
        caseId: case2.id,
        type: 'FINAL_SETTLEMENT',
        amount: 75000.00,
        status: 'ACCEPTED',
        description: 'Final settlement agreement reached',
        attorneyFees: 25000.00,
        costs: 2500.00,
        netToClient: 47500.00,
        date: new Date('2024-02-20')
      }
    });

    console.log('✅ Created settlements');

    // Create Liens
    await prisma.lien.create({
      data: {
        caseId: case1.id,
        settlementId: settlement1.id,
        type: 'MEDICAL',
        creditor: 'General Hospital',
        amount: 12500.00,
        description: 'Outstanding medical bills for emergency treatment',
        resolved: false
      }
    });

    await prisma.lien.create({
      data: {
        caseId: case2.id,
        settlementId: settlement2.id,
        type: 'INSURANCE',
        creditor: 'Health Insurance Co.',
        amount: 3500.00,
        description: 'Subrogation claim for medical payments',
        resolved: true,
        resolvedAt: new Date('2024-02-18')
      }
    });

    console.log('✅ Created liens');

    // Create Documents
    await prisma.document.create({
      data: {
        caseId: case1.id,
        name: 'Medical Records - General Hospital',
        type: 'MEDICAL_RECORDS',
        uploadedBy: paralegal.id,
        size: '2.5MB',
        metadata: JSON.stringify({
          pages: 45,
          dateRange: '2024-01-15 to 2024-01-20',
          provider: 'General Hospital'
        })
      }
    });

    await prisma.document.create({
      data: {
        caseId: case2.id,
        name: 'Demand Letter - Auto Accident',
        type: 'DEMAND_LETTER',
        content: 'This is a comprehensive demand letter requesting settlement...',
        uploadedBy: attorney2.id,
        size: '45KB',
        metadata: JSON.stringify({
          generatedBy: 'AI',
          documentType: 'DEMAND_LETTER',
          provider: 'mock-ai'
        })
      }
    });

    console.log('✅ Created documents');

    // Create sample billing
    const billing1 = await prisma.billing.create({
      data: {
        clientId: client1.id,
        caseId: case1.id,
        invoiceNumber: 'INV-2024-001',
        status: 'SENT',
        issueDate: new Date('2024-01-31'),
        dueDate: new Date('2024-02-28'),
        totalAmount: 1437.50,
        notes: 'First billing for Case-2024-001'
      }
    });

    // Get time entries and expenses for billing items
    const case1TimeEntries = await prisma.timeEntry.findMany({
      where: { caseId: case1.id }
    });
    
    const case1Expenses = await prisma.expense.findMany({
      where: { caseId: case1.id }
    });

    // Create billing items
    for (const timeEntry of case1TimeEntries) {
      await prisma.billingItem.create({
        data: {
          billingId: billing1.id,
          timeEntryId: timeEntry.id,
          description: timeEntry.description,
          quantity: timeEntry.hours,
          rate: timeEntry.rate || 0,
          amount: (timeEntry.hours * (timeEntry.rate || 0))
        }
      });
    }

    for (const expense of case1Expenses) {
      await prisma.billingItem.create({
        data: {
          billingId: billing1.id,
          expenseId: expense.id,
          description: expense.description,
          quantity: 1,
          rate: expense.amount,
          amount: expense.amount
        }
      });
    }

    console.log('✅ Created billing and billing items');

    console.log('🎉 Comprehensive database seeding completed successfully!');
    console.log(`
📊 Created:
- 4 Users (1 Admin, 2 Attorneys, 1 Paralegal)
- 3 Clients with emergency contacts
- 3 Cases (Personal Injury, Auto Accident, Workers Comp)
- 5 Time Entries
- 3 Expenses  
- 3 Tasks
- 3 Appointments
- 3 Deadlines
- 3 Communications
- 3 Notes
- 2 Settlements
- 2 Liens
- 2 Documents
- 1 Invoice with billing items

🔐 Login Credentials:
- Email: admin@legalestate.com
- Password: admin123

The system now has comprehensive legal practice management data!
    `);

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });