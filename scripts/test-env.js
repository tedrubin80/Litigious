#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function validateEnvFile(envPath, envName) {
  console.log(`\n${colors.cyan}Validating ${envName}:${colors.reset}`);
  
  if (!fs.existsSync(envPath)) {
    console.log(`${colors.red}✗ File not found: ${envPath}${colors.reset}`);
    return false;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  const vars = {};

  lines.forEach(line => {
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        vars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  // Check required variables based on environment
  const requiredVars = envName.includes('backend') ? [
    'DATABASE_URL',
    'JWT_SECRET',
    'PORT',
    'NODE_ENV',
    'CLIENT_URL'
  ] : [
    'REACT_APP_API_URL',
    'NODE_ENV'
  ];

  let isValid = true;
  requiredVars.forEach(varName => {
    if (!vars[varName]) {
      console.log(`${colors.red}✗ Missing: ${varName}${colors.reset}`);
      isValid = false;
    } else {
      console.log(`${colors.green}✓ ${varName}: ${vars[varName].substring(0, 20)}...${colors.reset}`);
    }
  });

  // Check for sensitive values
  if (vars['JWT_SECRET'] && vars['JWT_SECRET'].length < 32) {
    console.log(`${colors.yellow}⚠ JWT_SECRET should be at least 32 characters long${colors.reset}`);
  }

  if (vars['DATABASE_URL'] && !vars['DATABASE_URL'].includes('postgresql://')) {
    console.log(`${colors.yellow}⚠ DATABASE_URL should be a valid PostgreSQL connection string${colors.reset}`);
  }

  return isValid;
}

function createSampleEnv(targetPath, isBackend = true) {
  const sampleContent = isBackend ? `
# Database
DATABASE_URL="postgresql://legalestate_admin:LegalTech2024!Secure@localhost:5432/legal_estate"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# Server Configuration
PORT=5000
NODE_ENV=development

# Client URL
CLIENT_URL="http://localhost:3000"

# Optional: Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Optional: File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
` : `
# API Configuration
REACT_APP_API_URL=http://localhost:5000/api
NODE_ENV=development

# Optional: Feature Flags
REACT_APP_ENABLE_ANALYTICS=false
REACT_APP_ENABLE_DEMO_MODE=true
`;

  fs.writeFileSync(targetPath, sampleContent.trim());
  console.log(`${colors.green}✓ Created sample .env at ${targetPath}${colors.reset}`);
}

function main() {
  console.log(`${colors.cyan}
╔══════════════════════════════════════════╗
║   Environment Variables Validation       ║
╚══════════════════════════════════════════╝
${colors.reset}`);

  const backendEnvPath = path.join(__dirname, '../backend/.env');
  const frontendEnvPath = path.join(__dirname, '../frontend/.env');
  
  let backendValid = validateEnvFile(backendEnvPath, 'Backend .env');
  let frontendValid = validateEnvFile(frontendEnvPath, 'Frontend .env');

  // Offer to create sample env files if missing
  if (!backendValid && !fs.existsSync(backendEnvPath)) {
    console.log(`\n${colors.yellow}Would you like to create a sample backend .env file?${colors.reset}`);
    createSampleEnv(backendEnvPath + '.sample', true);
  }

  if (!frontendValid && !fs.existsSync(frontendEnvPath)) {
    console.log(`\n${colors.yellow}Would you like to create a sample frontend .env file?${colors.reset}`);
    createSampleEnv(frontendEnvPath + '.sample', false);
  }

  console.log(`\n${colors.cyan}═══════════════════════════════════════════${colors.reset}`);
  
  if (backendValid && frontendValid) {
    console.log(`${colors.green}✓ All environment variables are properly configured!${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.red}✗ Please configure missing environment variables${colors.reset}`);
    if (fs.existsSync(backendEnvPath + '.sample')) {
      console.log(`${colors.yellow}Check ${backendEnvPath}.sample for reference${colors.reset}`);
    }
    if (fs.existsSync(frontendEnvPath + '.sample')) {
      console.log(`${colors.yellow}Check ${frontendEnvPath}.sample for reference${colors.reset}`);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}