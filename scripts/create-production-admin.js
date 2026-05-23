#!/usr/bin/env node

/**
 * Create Production Admin User
 * This script creates a production admin user with proper password hashing
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createProductionAdmin() {
  console.log('=================================');
  console.log(' Create Production Admin User    ');
  console.log('=================================\n');

  try {
    // Get admin details
    const email = await question('Admin Email (default: admin@legalestate.tech): ') || 'admin@legalestate.tech';
    const name = await question('Admin Name (default: System Administrator): ') || 'System Administrator';
    const password = await question('Admin Password (default: admin123): ') || 'admin123';

    console.log('\nCreating admin user...');

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.log('User already exists. Updating password...');

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update existing user
      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          password: hashedPassword,
          name,
          role: 'SUPER_ADMIN'
        }
      });

      console.log('\n✅ Admin user updated successfully!');
      console.log('Email:', updatedUser.email);
      console.log('Name:', updatedUser.name);
      console.log('Role:', updatedUser.role);
    } else {
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user
      const newUser = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role: 'SUPER_ADMIN'
        }
      });

      console.log('\n✅ Admin user created successfully!');
      console.log('Email:', newUser.email);
      console.log('Name:', newUser.name);
      console.log('Role:', newUser.role);
    }

    console.log('\n📝 Login credentials:');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('\n⚠️  Please change the password after first login!');

  } catch (error) {
    console.error('\n❌ Error creating admin user:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

// Run the script
createProductionAdmin();