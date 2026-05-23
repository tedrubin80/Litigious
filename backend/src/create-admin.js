const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createCustomAdmin() {
  try {
    console.log('🔐 Creating custom admin user...');

    // Admin credentials
    const adminEmail = 'admin@yourfirm.com';
    const adminPassword = 'AdminSecure2024';
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (existingAdmin) {
      console.log('⚠️ Admin user already exists. Updating credentials...');
      
      const updatedAdmin = await prisma.user.update({
        where: { email: adminEmail },
        data: {
          password: hashedPassword,
          name: 'System Administrator',
          role: 'ADMIN',
          phone: '(555) 123-0000',
          address: 'Your Law Firm Address',
          barNumber: 'ADMIN001',
          hourlyRate: 500.00,
          isActive: true,
          lastLogin: null
        }
      });

      console.log('✅ Admin user updated successfully!');
    } else {
      const newAdmin = await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: 'System Administrator',
          role: 'ADMIN',
          phone: '(555) 123-0000',
          address: 'Your Law Firm Address',
          barNumber: 'ADMIN001',
          hourlyRate: 500.00,
          isActive: true
        }
      });

      console.log('✅ Custom admin user created successfully!');
    }

    console.log(`
📋 Your Custom Admin Credentials:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email: ${adminEmail}
🔑 Password: ${adminPassword}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔒 Security Note: Please change this password after first login!

🌐 Login at: http://localhost/

🏢 System Features Available:
• Complete Case Management
• Settlement Tracking & Forms
• AI Document Generation
• Time Tracking & Billing
• Client Management
• Task & Calendar Management
• Communication Logging
• Financial Reporting
    `);

    // Also remove the old demo admin
    try {
      await prisma.user.deleteMany({
        where: {
          email: 'admin@legalestate.com'
        }
      });
      console.log('🗑️ Removed old demo admin account');
    } catch (error) {
      console.log('ℹ️ No old demo admin to remove');
    }

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createCustomAdmin()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });