#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, type = 'info') {
  const prefix = {
    info: `${colors.blue}[INFO]${colors.reset}`,
    success: `${colors.green}[SUCCESS]${colors.reset}`,
    error: `${colors.red}[ERROR]${colors.reset}`,
    warning: `${colors.yellow}[WARNING]${colors.reset}`
  };
  console.log(`${prefix[type]} ${message}`);
}

function checkFile(filepath, required = false) {
  const exists = fs.existsSync(filepath);
  if (exists) {
    log(`Found: ${filepath}`, 'success');
    return true;
  } else if (required) {
    log(`Missing required file: ${filepath}`, 'error');
    return false;
  } else {
    log(`Optional file not found: ${filepath}`, 'warning');
    return true;
  }
}

function checkEnvironmentVariables(envPath) {
  if (!fs.existsSync(envPath)) {
    log(`Environment file not found: ${envPath}`, 'error');
    return false;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'PORT',
    'NODE_ENV'
  ];

  const missingVars = [];
  requiredVars.forEach(varName => {
    if (!envContent.includes(`${varName}=`)) {
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    log(`Missing environment variables: ${missingVars.join(', ')}`, 'error');
    return false;
  }

  log('All required environment variables are set', 'success');
  return true;
}

function checkDatabaseConnection() {
  try {
    log('Checking database connection...', 'info');
    execSync('cd backend && npx prisma db push --skip-generate', { stdio: 'ignore' });
    log('Database connection successful', 'success');
    return true;
  } catch (error) {
    log('Database connection failed', 'error');
    return false;
  }
}

function checkNodeModules(dir) {
  const nodeModulesPath = path.join(dir, 'node_modules');
  const packageJsonPath = path.join(dir, 'package.json');

  if (!fs.existsSync(nodeModulesPath)) {
    log(`Node modules not found in ${dir}`, 'error');
    return false;
  }

  if (!fs.existsSync(packageJsonPath)) {
    log(`package.json not found in ${dir}`, 'error');
    return false;
  }

  log(`Dependencies installed in ${dir}`, 'success');
  return true;
}

function checkTestFramework() {
  try {
    // Check Jest in backend
    execSync('cd backend && npx jest --version', { stdio: 'ignore' });
    log('Jest is installed in backend', 'success');

    // Check for testing library in frontend
    const frontendPackageJson = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../frontend/package.json'), 'utf8')
    );
    
    if (frontendPackageJson.dependencies['@testing-library/react'] || 
        frontendPackageJson.devDependencies?.['@testing-library/react']) {
      log('React Testing Library is installed', 'success');
    } else {
      log('React Testing Library not found in frontend', 'warning');
    }

    return true;
  } catch (error) {
    log('Test framework check failed', 'error');
    return false;
  }
}

function main() {
  console.log(`${colors.bright}${colors.blue}
╔══════════════════════════════════════════╗
║   Legal Estate Test Environment Setup    ║
╚══════════════════════════════════════════╝
${colors.reset}`);

  let allChecksPass = true;

  // Check project structure
  log('Checking project structure...', 'info');
  allChecksPass = checkFile(path.join(__dirname, '../backend')) && allChecksPass;
  allChecksPass = checkFile(path.join(__dirname, '../frontend')) && allChecksPass;

  // Check environment files
  log('\nChecking environment configuration...', 'info');
  allChecksPass = checkEnvironmentVariables(path.join(__dirname, '../backend/.env')) && allChecksPass;
  allChecksPass = checkEnvironmentVariables(path.join(__dirname, '../frontend/.env')) && allChecksPass;

  // Check dependencies
  log('\nChecking dependencies...', 'info');
  allChecksPass = checkNodeModules(path.join(__dirname, '../backend')) && allChecksPass;
  allChecksPass = checkNodeModules(path.join(__dirname, '../frontend')) && allChecksPass;

  // Check database connection
  log('\nChecking database...', 'info');
  allChecksPass = checkDatabaseConnection() && allChecksPass;

  // Check test framework
  log('\nChecking test frameworks...', 'info');
  allChecksPass = checkTestFramework() && allChecksPass;

  // Summary
  console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════════${colors.reset}`);
  if (allChecksPass) {
    console.log(`${colors.green}${colors.bright}✓ All checks passed! Environment is ready for testing.${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.red}${colors.bright}✗ Some checks failed. Please fix the issues above.${colors.reset}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkFile, checkEnvironmentVariables, checkDatabaseConnection };