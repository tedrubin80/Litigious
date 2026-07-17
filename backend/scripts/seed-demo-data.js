#!/usr/bin/env node
/**
 * LegalEstate demo/showcase dataset.
 * Resets core tables and loads realistic sample data for dashboards, charts, and client portal demos.
 *
 * Usage: npm run seed:demo (from backend/)
 * Requires: DATABASE_URL in environment or backend/.env
 */
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { purgeUserUploads } = require('../src/lib/demoCleanup');
const { getAppName } = require('../src/lib/brand');

const prisma = new PrismaClient();

const DEMO_PASSWORD = process.env.DEMO_SEED_PASSWORD || 'DemoShow2026!';
const UPLOADS_ROOT = path.join(__dirname, '../uploads/demo');

const monthsAgo = (n) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setHours(12, 0, 0, 0);
  return d;
};

const hash = (value) => bcrypt.hash(value, 10);

async function clearDemoData() {
  const uploadCleanup = purgeUserUploads();
  if (uploadCleanup.totalRemoved > 0) {
    console.log(`🧹 Removed ${uploadCleanup.totalRemoved} user-uploaded file(s) from disk`);
  }

  const deleters = [
    () => prisma.activity.deleteMany(),
    () => prisma.caseActivity?.deleteMany?.() ?? Promise.resolve(),
    () => prisma.task.deleteMany(),
    () => prisma.document.deleteMany(),
    () => prisma.timeEntry.deleteMany(),
    () => prisma.communication.deleteMany(),
    () => prisma.expense.deleteMany(),
    () => prisma.note.deleteMany(),
    () => prisma.settlement.deleteMany(),
    () => prisma.invoiceLineItem.deleteMany(),
    () => prisma.invoice.deleteMany(),
    () => prisma.calendarEvent.deleteMany(),
    () => prisma.incident.deleteMany(),
    () => prisma.medicalRecord.deleteMany(),
    () => prisma.insurance.deleteMany(),
    () => prisma.case.deleteMany(),
    () => prisma.client.deleteMany(),
    () => prisma.user.deleteMany()
  ];

  for (const run of deleters) {
    try {
      await run();
    } catch (error) {
      if (!error.message?.includes('does not exist')) {
        throw error;
      }
    }
  }
}

async function ensureDemoUploads() {
  fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
  const samplePath = path.join(UPLOADS_ROOT, 'demo-police-report.txt');
  if (!fs.existsSync(samplePath)) {
    fs.writeFileSync(
      samplePath,
      `DEMO POLICE REPORT\n\nCase: Chen v. National Freight Lines\nDate of incident: sample data for ${getAppName()} showcase.\n`,
      'utf8'
    );
  }
  return samplePath;
}

async function seedDemoData() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required. Copy backend/.env.example to backend/.env first.');
  }

  console.log('🌱 Seeding LegalEstate demo/showcase data...');
  await clearDemoData();
  console.log('✅ Cleared existing demo tables');

  const passwordHash = await hash(DEMO_PASSWORD);
  const sampleFile = await ensureDemoUploads();

  const admin = await prisma.user.create({
    data: {
      email: 'admin@litigious.online',
      password: passwordHash,
      name: 'Alex Morgan',
      firstName: 'Alex',
      lastName: 'Morgan',
      role: 'SUPER_ADMIN',
      phone: '(555) 100-0001',
      emailVerified: true,
      isActive: true
    }
  });

  const attorney = await prisma.user.create({
    data: {
      email: 'attorney@litigious.online',
      password: passwordHash,
      name: 'Jordan Reed',
      firstName: 'Jordan',
      lastName: 'Reed',
      role: 'ATTORNEY',
      phone: '(555) 100-0002',
      barNumber: 'BAR-CA-48291',
      hourlyRate: 395,
      emailVerified: true,
      isActive: true
    }
  });

  const paralegal = await prisma.user.create({
    data: {
      email: 'paralegal@litigious.online',
      password: passwordHash,
      name: 'Sam Rivera',
      firstName: 'Sam',
      lastName: 'Rivera',
      role: 'PARALEGAL',
      phone: '(555) 100-0003',
      hourlyRate: 145,
      emailVerified: true,
      isActive: true
    }
  });

  const clientUser = await prisma.user.create({
    data: {
      email: 'client@litigious.online',
      password: passwordHash,
      name: 'Maria Chen',
      firstName: 'Maria',
      lastName: 'Chen',
      role: 'CLIENT',
      phone: '(555) 200-0101',
      emailVerified: true,
      isActive: true
    }
  });

  const clients = await Promise.all([
    prisma.client.create({
      data: {
        firstName: 'Maria',
        lastName: 'Chen',
        email: 'client@litigious.online',
        phone: '(555) 200-0101',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90012',
        clientNumber: 'CL20260001',
        source: 'Referral',
        createdById: attorney.id
      }
    }),
    prisma.client.create({
      data: {
        firstName: 'David',
        lastName: 'Okonkwo',
        email: 'david.okonkwo@email.com',
        phone: '(555) 200-0102',
        city: 'Pasadena',
        state: 'CA',
        zipCode: '91101',
        clientNumber: 'CL20260002',
        source: 'Website',
        createdById: attorney.id
      }
    }),
    prisma.client.create({
      data: {
        firstName: 'Elena',
        lastName: 'Vasquez',
        email: 'elena.vasquez@email.com',
        phone: '(555) 200-0103',
        city: 'Glendale',
        state: 'CA',
        zipCode: '91203',
        clientNumber: 'CL20260003',
        source: 'Advertising',
        createdById: attorney.id
      }
    })
  ]);

  const caseDefinitions = [
    {
      caseNumber: 'CS2026-1042',
      title: 'Chen v. National Freight Lines',
      description: 'Rear-end collision on I-405; cervical strain and lost wages claim.',
      type: 'AUTO_ACCIDENT',
      status: 'ACTIVE',
      dateOpened: monthsAgo(1),
      estimatedValue: 92000,
      demandAmount: 110000,
      clientId: clients[0].id
    },
    {
      caseNumber: 'CS2026-1031',
      title: 'Okonkwo v. Riverside Medical Group',
      description: 'Delayed diagnosis — ongoing discovery and expert review.',
      type: 'MEDICAL_MALPRACTICE',
      status: 'DISCOVERY',
      dateOpened: monthsAgo(3),
      estimatedValue: 240000,
      clientId: clients[1].id
    },
    {
      caseNumber: 'CS2026-1018',
      title: 'Vasquez Workers Compensation',
      description: 'Warehouse shoulder injury — settled after mediation.',
      type: 'WORKERS_COMP',
      status: 'SETTLED',
      dateOpened: monthsAgo(5),
      dateClosed: monthsAgo(1),
      settlementDate: monthsAgo(1),
      settlementAmount: 118000,
      attorneyFees: 47200,
      costs: 4200,
      netToClient: 66600,
      estimatedValue: 120000,
      clientId: clients[2].id
    },
    {
      caseNumber: 'CS2026-1055',
      title: 'Chen Premises Slip & Fall',
      description: 'Grocery store wet-floor incident — intake and records gathering.',
      type: 'PREMISES_LIABILITY',
      status: 'INTAKE',
      dateOpened: monthsAgo(0),
      estimatedValue: 65000,
      clientId: clients[0].id
    },
    {
      caseNumber: 'CS2025-0991',
      title: 'Okonkwo v. Metro Delivery Co.',
      description: 'T-bone intersection collision — settled last quarter.',
      type: 'AUTO_ACCIDENT',
      status: 'SETTLED',
      dateOpened: monthsAgo(6),
      dateClosed: monthsAgo(2),
      settlementDate: monthsAgo(2),
      settlementAmount: 84500,
      attorneyFees: 28150,
      costs: 3100,
      netToClient: 53250,
      estimatedValue: 90000,
      clientId: clients[1].id
    },
    {
      caseNumber: 'CS2026-1024',
      title: 'Vasquez v. Harbor Property Mgmt',
      description: 'Stairway handrail failure — active negotiation with insurer.',
      type: 'PREMISES_LIABILITY',
      status: 'SETTLEMENT_NEGOTIATION',
      dateOpened: monthsAgo(2),
      estimatedValue: 155000,
      demandAmount: 175000,
      clientId: clients[2].id
    }
  ];

  const cases = [];
  for (const definition of caseDefinitions) {
    const created = await prisma.case.create({
      data: {
        ...definition,
        attorneyId: attorney.id,
        paralegalId: paralegal.id,
        internalNotes: 'Demo case — safe to reset with npm run seed:demo',
        updatedAt: new Date()
      }
    });
    cases.push(created);
  }

  const documents = await Promise.all([
    prisma.document.create({
      data: {
        title: 'Police Report — Chen Accident',
        filename: 'demo-police-report.txt',
        originalName: 'police-report-chen.txt',
        fileType: 'text/plain',
        fileSize: fs.statSync(sampleFile).size,
        filePath: sampleFile,
        type: 'POLICE_REPORT',
        description: 'Demo police report file for preview/download',
        caseId: cases[0].id,
        clientId: clients[0].id,
        uploadedBy: paralegal.id
      }
    }),
    prisma.document.create({
      data: {
        title: 'Demand Letter Draft — Vasquez WC',
        type: 'DEMAND_LETTER',
        content: 'DEMAND FOR SETTLEMENT\n\nThis letter constitutes a formal demand...',
        description: 'AI-assisted demand letter (demo content)',
        caseId: cases[2].id,
        clientId: clients[2].id,
        uploadedBy: attorney.id,
        generatedBy: 'AI',
        aiProvider: 'openai'
      }
    }),
    prisma.document.create({
      data: {
        title: 'Medical Summary — Okonkwo',
        type: 'MEDICAL_RECORD',
        content: 'Demo medical chronology for showcase purposes.',
        description: 'Summarized treatment timeline',
        caseId: cases[1].id,
        clientId: clients[1].id,
        uploadedBy: paralegal.id
      }
    })
  ]);

  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        title: 'Obtain radiology records',
        description: 'Request MRI and X-ray records from Harbor Imaging',
        dueDate: new Date(Date.now() + 5 * 86400000),
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        caseId: cases[0].id,
        assignedToId: paralegal.id,
        createdById: attorney.id
      }
    }),
    prisma.task.create({
      data: {
        title: 'Draft mediation brief',
        description: 'Prepare brief for Vasquez premises case',
        dueDate: new Date(Date.now() + 12 * 86400000),
        priority: 'MEDIUM',
        status: 'PENDING',
        caseId: cases[5].id,
        assignedToId: attorney.id,
        createdById: admin.id
      }
    }),
    prisma.task.create({
      data: {
        title: 'Client status call — Chen',
        description: 'Weekly check-in on treatment progress',
        dueDate: new Date(Date.now() + 2 * 86400000),
        priority: 'MEDIUM',
        status: 'PENDING',
        caseId: cases[0].id,
        assignedToId: paralegal.id,
        createdById: paralegal.id
      }
    }),
    prisma.task.create({
      data: {
        title: 'Review expert report',
        description: 'Malpractice causation analysis',
        dueDate: new Date(Date.now() - 2 * 86400000),
        priority: 'HIGH',
        status: 'PENDING',
        caseId: cases[1].id,
        assignedToId: attorney.id,
        createdById: attorney.id
      }
    })
  ]);

  await Promise.all([
    prisma.timeEntry.create({
      data: {
        description: 'Initial client interview — Chen',
        hours: 1.5,
        rate: 395,
        amount: 592.5,
        date: monthsAgo(1),
        billable: true,
        caseId: cases[0].id,
        userId: attorney.id
      }
    }),
    prisma.timeEntry.create({
      data: {
        description: 'Medical records organization',
        hours: 3,
        rate: 145,
        amount: 435,
        date: monthsAgo(0),
        billable: true,
        caseId: cases[1].id,
        userId: paralegal.id
      }
    }),
    prisma.timeEntry.create({
      data: {
        description: 'Settlement negotiation call',
        hours: 2,
        rate: 395,
        amount: 790,
        date: monthsAgo(1),
        billable: true,
        caseId: cases[2].id,
        userId: attorney.id
      }
    })
  ]);

  const activityTemplates = [
    ['CREATE', 'Opened case CS2026-1042 for Maria Chen', 'CASE', cases[0].id, attorney.id],
    ['UPDATE', 'Uploaded police report to Chen v. National Freight', 'DOCUMENT', documents[0].id, paralegal.id],
    ['UPDATE', 'Settlement executed — Vasquez Workers Compensation', 'CASE', cases[2].id, attorney.id],
    ['CREATE', 'Scheduled expert review for Okonkwo malpractice matter', 'TASK', tasks[3].id, attorney.id],
    ['LOGIN', 'Staff dashboard review', 'USER', admin.id, admin.id],
    ['UPDATE', 'Demand letter generated for workers comp file', 'DOCUMENT', documents[1].id, attorney.id],
    ['UPDATE', 'Moved Harbor Property case to settlement negotiation', 'CASE', cases[5].id, paralegal.id],
    ['CREATE', 'New intake — Chen premises slip & fall', 'CASE', cases[3].id, paralegal.id]
  ];

  for (const [action, description, entityType, entityId, userId] of activityTemplates) {
    await prisma.activity.create({
      data: {
        action,
        description,
        entityType,
        entityId,
        userId,
        ipAddress: '127.0.0.1',
        userAgent: 'LegalEstate Demo Seed'
      }
    });
  }

  console.log('');
  console.log('🎉 Demo data ready for showcase');
  console.log('');
  console.log('🔐 Login credentials (all use the same password):');
  console.log(`   Password: ${DEMO_PASSWORD}`);
  console.log('   Staff admin:    admin@litigious.online');
  console.log('   Attorney:       attorney@litigious.online');
  console.log('   Paralegal:      paralegal@litigious.online');
  console.log('   Client portal:  client@litigious.online');
  console.log('');
  console.log('📊 Seeded:');
  console.log(`   Users: ${4} | Clients: ${clients.length} | Cases: ${cases.length}`);
  console.log(`   Documents: ${documents.length} | Tasks: ${tasks.length} | Activities: ${activityTemplates.length}`);
}

if (require.main === module) {
  seedDemoData()
    .catch((error) => {
      console.error('❌ Demo seed failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { seedDemoData };
