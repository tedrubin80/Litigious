#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function checkPackageInstalled(packageName, directory) {
  const nodeModulesPath = path.join(directory, 'node_modules', packageName);
  return fs.existsSync(nodeModulesPath);
}

function getInstalledVersion(packageName, directory) {
  try {
    const packageJsonPath = path.join(directory, 'node_modules', packageName, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageInfo = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      return packageInfo.version;
    }
  } catch (error) {
    return null;
  }
  return null;
}

function checkDependencies(directory, projectName) {
  console.log(`\n${colors.cyan}Checking ${projectName} dependencies:${colors.reset}`);
  
  const packageJsonPath = path.join(directory, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.log(`${colors.red}✗ package.json not found in ${directory}${colors.reset}`);
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };

  let missingDeps = [];
  let installedDeps = [];

  Object.keys(allDeps).forEach(dep => {
    if (checkPackageInstalled(dep, directory)) {
      const version = getInstalledVersion(dep, directory);
      installedDeps.push({ name: dep, version });
    } else {
      missingDeps.push(dep);
    }
  });

  // Display results
  if (installedDeps.length > 0) {
    console.log(`${colors.green}✓ Installed packages (${installedDeps.length}):${colors.reset}`);
    // Show only critical packages
    const criticalPackages = projectName === 'Backend' 
      ? ['express', 'prisma', '@prisma/client', 'jest', 'jsonwebtoken', 'bcryptjs']
      : ['react', 'react-dom', 'react-router-dom', 'axios', '@headlessui/react'];
    
    installedDeps.forEach(dep => {
      if (criticalPackages.includes(dep.name)) {
        console.log(`  ${colors.green}✓${colors.reset} ${dep.name}@${dep.version}`);
      }
    });
    console.log(`  ... and ${installedDeps.length - criticalPackages.filter(p => installedDeps.find(d => d.name === p)).length} more`);
  }

  if (missingDeps.length > 0) {
    console.log(`${colors.red}✗ Missing packages (${missingDeps.length}):${colors.reset}`);
    missingDeps.forEach(dep => {
      console.log(`  ${colors.red}✗${colors.reset} ${dep}`);
    });
    return false;
  }

  return true;
}

function checkTestingDependencies() {
  console.log(`\n${colors.cyan}Checking testing framework dependencies:${colors.reset}`);
  
  const testDeps = {
    backend: ['jest', 'supertest'],
    frontend: ['@testing-library/react', '@testing-library/jest-dom', '@testing-library/user-event']
  };

  let allTestDepsInstalled = true;

  // Check backend test dependencies
  testDeps.backend.forEach(dep => {
    if (checkPackageInstalled(dep, path.join(__dirname, '../backend'))) {
      console.log(`  ${colors.green}✓${colors.reset} Backend: ${dep}`);
    } else {
      console.log(`  ${colors.yellow}⚠${colors.reset} Backend: ${dep} not installed`);
      allTestDepsInstalled = false;
    }
  });

  // Check frontend test dependencies
  testDeps.frontend.forEach(dep => {
    if (checkPackageInstalled(dep, path.join(__dirname, '../frontend'))) {
      console.log(`  ${colors.green}✓${colors.reset} Frontend: ${dep}`);
    } else {
      console.log(`  ${colors.yellow}⚠${colors.reset} Frontend: ${dep} not installed`);
      allTestDepsInstalled = false;
    }
  });

  return allTestDepsInstalled;
}

function installMissingTestDependencies() {
  console.log(`\n${colors.cyan}Installing missing test dependencies...${colors.reset}`);
  
  // Install frontend testing dependencies if needed
  const frontendTestDeps = [
    '@testing-library/react',
    '@testing-library/jest-dom',
    '@testing-library/user-event',
    'jest-environment-jsdom'
  ];

  const frontendDir = path.join(__dirname, '../frontend');
  const missingFrontendDeps = frontendTestDeps.filter(dep => !checkPackageInstalled(dep, frontendDir));
  
  if (missingFrontendDeps.length > 0) {
    console.log(`Installing frontend test dependencies: ${missingFrontendDeps.join(', ')}`);
    try {
      execSync(`cd ${frontendDir} && npm install --save-dev ${missingFrontendDeps.join(' ')}`, { stdio: 'inherit' });
      console.log(`${colors.green}✓ Frontend test dependencies installed${colors.reset}`);
    } catch (error) {
      console.log(`${colors.red}✗ Failed to install frontend test dependencies${colors.reset}`);
    }
  }

  // Backend test dependencies are already in package.json
  const backendDir = path.join(__dirname, '../backend');
  if (!checkPackageInstalled('supertest', backendDir)) {
    try {
      execSync(`cd ${backendDir} && npm install --save-dev supertest`, { stdio: 'inherit' });
      console.log(`${colors.green}✓ Backend test dependencies installed${colors.reset}`);
    } catch (error) {
      console.log(`${colors.red}✗ Failed to install backend test dependencies${colors.reset}`);
    }
  }
}

function main() {
  console.log(`${colors.cyan}
╔══════════════════════════════════════════╗
║      Dependency Verification Check       ║
╚══════════════════════════════════════════╝
${colors.reset}`);

  const backendDir = path.join(__dirname, '../backend');
  const frontendDir = path.join(__dirname, '../frontend');

  const backendDepsOk = checkDependencies(backendDir, 'Backend');
  const frontendDepsOk = checkDependencies(frontendDir, 'Frontend');
  const testDepsOk = checkTestingDependencies();

  console.log(`\n${colors.cyan}═══════════════════════════════════════════${colors.reset}`);
  
  if (backendDepsOk && frontendDepsOk && testDepsOk) {
    console.log(`${colors.green}✓ All dependencies are properly installed!${colors.reset}`);
    process.exit(0);
  } else {
    if (!testDepsOk) {
      console.log(`${colors.yellow}Some test dependencies are missing.${colors.reset}`);
      installMissingTestDependencies();
    }
    
    if (!backendDepsOk || !frontendDepsOk) {
      console.log(`${colors.red}✗ Some dependencies are missing${colors.reset}`);
      console.log(`Run the following commands to install missing dependencies:`);
      if (!backendDepsOk) {
        console.log(`  ${colors.yellow}cd backend && npm install${colors.reset}`);
      }
      if (!frontendDepsOk) {
        console.log(`  ${colors.yellow}cd frontend && npm install${colors.reset}`);
      }
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkPackageInstalled, checkDependencies };