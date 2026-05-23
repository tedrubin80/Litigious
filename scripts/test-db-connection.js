#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

async function testPrismaConnection() {
  console.log(`${colors.cyan}Testing Prisma database connection...${colors.reset}`);
  
  try {
    // Test Prisma connection by trying to generate client
    execSync('cd backend && npx prisma generate', { stdio: 'pipe' });
    console.log(`${colors.green}✓ Prisma client generated successfully${colors.reset}`);
    
    // Test database connection
    execSync('cd backend && npx prisma db push --skip-generate', { stdio: 'pipe' });
    console.log(`${colors.green}✓ Database schema synchronized${colors.reset}`);
    
    // Import Prisma client and test query
    const { PrismaClient } = require(path.join(__dirname, '../backend/node_modules/@prisma/client'));
    const prisma = new PrismaClient();
    
    try {
      // Test database query
      await prisma.$connect();
      console.log(`${colors.green}✓ Database connection established${colors.reset}`);
      
      // Test a simple query
      const userCount = await prisma.user.count();
      console.log(`${colors.green}✓ Database query successful (${userCount} users found)${colors.reset}`);
      
      // Check if demo users exist
      const demoUsers = await prisma.user.findMany({
        where: {
          email: {
            in: ['admin@legalestate.com', 'demo@legalestate.com', 'paralegal@legalestate.com']
          }
        },
        select: {
          email: true,
          role: true
        }
      });
      
      if (demoUsers.length > 0) {
        console.log(`${colors.green}✓ Demo users found:${colors.reset}`);
        demoUsers.forEach(user => {
          console.log(`  - ${user.email} (${user.role})`);
        });
      } else {
        console.log(`${colors.yellow}⚠ No demo users found. You may need to seed the database.${colors.reset}`);
      }
      
      await prisma.$disconnect();
      return true;
    } catch (error) {
      console.log(`${colors.red}✗ Database query failed: ${error.message}${colors.reset}`);
      await prisma.$disconnect();
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗ Prisma connection failed: ${error.message}${colors.reset}`);
    return false;
  }
}

async function checkDatabaseTables() {
  console.log(`\n${colors.cyan}Checking database tables...${colors.reset}`);
  
  try {
    const { PrismaClient } = require(path.join(__dirname, '../backend/node_modules/@prisma/client'));
    const prisma = new PrismaClient();
    
    const tables = [
      { name: 'User', model: prisma.user },
      { name: 'Case', model: prisma.case },
      { name: 'Client', model: prisma.client },
      { name: 'Document', model: prisma.document },
      { name: 'Task', model: prisma.task },
      { name: 'Event', model: prisma.event }
    ];
    
    for (const table of tables) {
      try {
        const count = await table.model.count();
        console.log(`  ${colors.green}✓${colors.reset} ${table.name} table exists (${count} records)`);
      } catch (error) {
        console.log(`  ${colors.red}✗${colors.reset} ${table.name} table not found or inaccessible`);
      }
    }
    
    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.log(`${colors.red}✗ Failed to check tables: ${error.message}${colors.reset}`);
    return false;
  }
}

async function seedDemoData() {
  console.log(`\n${colors.cyan}Seeding demo data...${colors.reset}`);
  
  try {
    const { PrismaClient } = require(path.join(__dirname, '../backend/node_modules/@prisma/client'));
    const bcrypt = require(path.join(__dirname, '../backend/node_modules/bcryptjs'));
    const prisma = new PrismaClient();
    
    // Check if demo users already exist
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@legalestate.com' }
    });
    
    if (existingAdmin) {
      console.log(`${colors.yellow}Demo users already exist. Skipping seed.${colors.reset}`);
      await prisma.$disconnect();
      return true;
    }
    
    // Create demo users
    const users = [
      {
        email: 'admin@legalestate.com',
        password: await bcrypt.hash('admin123', 10),
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        isActive: true
      },
      {
        email: 'demo@legalestate.com',
        password: await bcrypt.hash('demo123', 10),
        firstName: 'Demo',
        lastName: 'Attorney',
        role: 'ATTORNEY',
        isActive: true
      },
      {
        email: 'paralegal@legalestate.com',
        password: await bcrypt.hash('paralegal123', 10),
        firstName: 'Demo',
        lastName: 'Paralegal',
        role: 'PARALEGAL',
        isActive: true
      }
    ];
    
    for (const userData of users) {
      await prisma.user.create({ data: userData });
      console.log(`  ${colors.green}✓${colors.reset} Created user: ${userData.email}`);
    }
    
    // Create sample cases
    const attorney = await prisma.user.findUnique({
      where: { email: 'demo@legalestate.com' }
    });
    
    const sampleCases = [
      {
        caseNumber: 'CASE-2024-001',
        title: 'Smith vs. Johnson',
        type: 'LITIGATION',
        status: 'ACTIVE',
        priority: 'HIGH',
        description: 'Contract dispute case',
        attorneyId: attorney.id
      },
      {
        caseNumber: 'CASE-2024-002',
        title: 'Estate of Williams',
        type: 'ESTATE_PLANNING',
        status: 'ACTIVE',
        priority: 'MEDIUM',
        description: 'Estate planning and will preparation',
        attorneyId: attorney.id
      }
    ];
    
    for (const caseData of sampleCases) {
      await prisma.case.create({ data: caseData });
      console.log(`  ${colors.green}✓${colors.reset} Created case: ${caseData.caseNumber}`);
    }
    
    console.log(`${colors.green}✓ Demo data seeded successfully${colors.reset}`);
    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.log(`${colors.red}✗ Failed to seed data: ${error.message}${colors.reset}`);
    return false;
  }
}

async function main() {
  console.log(`${colors.cyan}
╔══════════════════════════════════════════╗
║      Database Connection Testing         ║
╚══════════════════════════════════════════╝
${colors.reset}`);

  const connectionOk = await testPrismaConnection();
  
  if (connectionOk) {
    await checkDatabaseTables();
    
    // Offer to seed demo data if needed
    const { PrismaClient } = require(path.join(__dirname, '../backend/node_modules/@prisma/client'));
    const prisma = new PrismaClient();
    const userCount = await prisma.user.count();
    
    if (userCount === 0) {
      console.log(`\n${colors.yellow}Database is empty. Seeding demo data...${colors.reset}`);
      await seedDemoData();
    }
    
    await prisma.$disconnect();
    
    console.log(`\n${colors.cyan}═══════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.green}✓ Database is properly configured and accessible!${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`\n${colors.cyan}═══════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.red}✗ Database connection issues detected${colors.reset}`);
    console.log(`Please check:`);
    console.log(`  1. PostgreSQL is running`);
    console.log(`  2. DATABASE_URL in backend/.env is correct`);
    console.log(`  3. Database user has proper permissions`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}