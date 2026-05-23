#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const prisma = require('../src/lib/prisma');
const AuthUtils = require('../src/lib/authUtils');

/**
 * Super Admin Setup Script
 * Creates the initial super admin user for the Legal Estate Management System
 */

async function setupSuperAdmin() {
  try {
    console.log('🔧 Legal Estate Management System - Super Admin Setup');
    console.log('====================================================\n');

    // Check if super admin already exists
    const existingSuperAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    });

    if (existingSuperAdmin) {
      console.log('⚠️  Super admin already exists!');
      console.log(`   Name: ${existingSuperAdmin.name}`);
      console.log(`   Email: ${existingSuperAdmin.email}`);
      console.log(`   Created: ${existingSuperAdmin.createdAt.toLocaleDateString()}`);
      
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise((resolve) => {
        readline.question('Do you want to create another super admin? (y/N): ', resolve);
      });
      
      readline.close();
      
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('✅ Setup cancelled. Existing super admin remains active.');
        return;
      }
    }

    // Get super admin details
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('Enter super admin details:\n');
    
    const name = await new Promise((resolve) => {
      readline.question('Full Name: ', resolve);
    });

    if (!name || name.trim().length === 0) {
      throw new Error('Name is required');
    }

    const email = await new Promise((resolve) => {
      readline.question('Email: ', resolve);
    });

    if (!email || !email.includes('@')) {
      throw new Error('Valid email is required');
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      throw new Error(`User with email ${email} already exists`);
    }

    const password = await new Promise((resolve) => {
      const stdin = process.stdin;
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding('utf8');

      let password = '';
      console.log('Password (minimum 8 characters): ');
      
      stdin.on('data', function(key) {
        if (key === '\u0003') { // Ctrl+C
          process.exit();
        }
        if (key === '\r' || key === '\n') { // Enter
          stdin.setRawMode(false);
          stdin.pause();
          console.log('\n');
          resolve(password);
        } else if (key === '\u007f') { // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else {
          password += key;
          process.stdout.write('*');
        }
      });
    });

    readline.close();

    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Create super admin user
    console.log('Creating super admin user...');
    
    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = AuthUtils.generateToken(16);

    const superAdmin = await prisma.user.create({
      data: {
        id: userId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        isActive: true,
        emailVerified: true,
        profileComplete: true,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Log the creation activity
    await prisma.activity.create({
      data: {
        id: AuthUtils.generateToken(16),
        action: 'SUPER_ADMIN_CREATED',
        description: `Super admin account created: ${superAdmin.name} (${superAdmin.email})`,
        entityType: 'USER',
        entityId: superAdmin.id,
        userId: superAdmin.id,
        ipAddress: '127.0.0.1',
        userAgent: 'Super Admin Setup Script'
      }
    });

    console.log('\n✅ Super Admin Created Successfully!');
    console.log('=====================================');
    console.log(`👤 Name: ${superAdmin.name}`);
    console.log(`📧 Email: ${superAdmin.email}`);
    console.log(`🆔 User ID: ${superAdmin.id}`);
    console.log(`📅 Created: ${superAdmin.createdAt.toLocaleString()}`);
    console.log('\n🔐 You can now log in with these credentials.');
    console.log('💡 For security, consider changing the password after first login.');

  } catch (error) {
    console.error('\n❌ Error creating super admin:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run setup if called directly
if (require.main === module) {
  setupSuperAdmin().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
}

module.exports = setupSuperAdmin;