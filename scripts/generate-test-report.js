#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function generateTestReport() {
  console.log(`${colors.bright}${colors.blue}
╔═══════════════════════════════════════════════╗
║      Legal Estate Test Suite Report           ║
╚═══════════════════════════════════════════════╝
${colors.reset}`);

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      coverage: {}
    },
    backend: {
      tests: {},
      coverage: null
    },
    frontend: {
      tests: {},
      coverage: null
    },
    performance: {},
    errors: []
  };

  // Run environment checks first
  console.log(`${colors.cyan}Running Environment Checks...${colors.reset}`);
  try {
    execSync('npm run test:setup', { stdio: 'inherit' });
    console.log(`${colors.green}✓ Environment setup verified${colors.reset}`);
  } catch (error) {
    console.log(`${colors.red}✗ Environment setup failed${colors.reset}`);
    report.errors.push('Environment setup failed');
  }

  // Backend Tests
  console.log(`\n${colors.cyan}Running Backend Tests...${colors.reset}`);
  try {
    const backendResult = execSync('cd backend && npm run test:coverage', { encoding: 'utf8' });
    
    // Parse Jest output
    const testResults = parseJestOutput(backendResult);
    report.backend.tests = testResults;
    report.summary.total += testResults.total;
    report.summary.passed += testResults.passed;
    report.summary.failed += testResults.failed;
    
    console.log(`${colors.green}Backend Tests: ${testResults.passed}/${testResults.total} passed${colors.reset}`);
    
    // Read coverage report
    const coveragePath = path.join(__dirname, '../backend/coverage/coverage-summary.json');
    if (fs.existsSync(coveragePath)) {
      report.backend.coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    }
    
  } catch (error) {
    console.log(`${colors.red}✗ Backend tests failed${colors.reset}`);
    report.errors.push('Backend tests failed: ' + error.message);
  }

  // Frontend Tests
  console.log(`\n${colors.cyan}Running Frontend Tests...${colors.reset}`);
  try {
    const frontendResult = execSync('cd frontend && npm run test:coverage', { encoding: 'utf8' });
    
    const testResults = parseJestOutput(frontendResult);
    report.frontend.tests = testResults;
    report.summary.total += testResults.total;
    report.summary.passed += testResults.passed;
    report.summary.failed += testResults.failed;
    
    console.log(`${colors.green}Frontend Tests: ${testResults.passed}/${testResults.total} passed${colors.reset}`);
    
    // Read coverage report
    const coveragePath = path.join(__dirname, '../frontend/coverage/coverage-summary.json');
    if (fs.existsSync(coveragePath)) {
      report.frontend.coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    }
    
  } catch (error) {
    console.log(`${colors.red}✗ Frontend tests failed${colors.reset}`);
    report.errors.push('Frontend tests failed: ' + error.message);
  }

  // Performance Tests
  console.log(`\n${colors.cyan}Running Performance Tests...${colors.reset}`);
  try {
    const perfResult = execSync('cd backend && npm run test:performance', { encoding: 'utf8' });
    console.log(`${colors.green}✓ Performance tests completed${colors.reset}`);
    
    // Extract performance metrics
    report.performance = extractPerformanceMetrics(perfResult);
    
  } catch (error) {
    console.log(`${colors.yellow}⚠ Performance tests failed or skipped${colors.reset}`);
    report.errors.push('Performance tests failed: ' + error.message);
  }

  // Generate HTML Report
  const htmlReport = generateHtmlReport(report);
  const reportPath = path.join(__dirname, '../test-results');
  
  if (!fs.existsSync(reportPath)) {
    fs.mkdirSync(reportPath, { recursive: true });
  }
  
  fs.writeFileSync(path.join(reportPath, 'test-report.html'), htmlReport);
  fs.writeFileSync(path.join(reportPath, 'test-report.json'), JSON.stringify(report, null, 2));
  
  // Print Summary
  printSummary(report);
  
  return report;
}

function parseJestOutput(output) {
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    suites: []
  };

  // Extract test results from Jest output
  const testSuiteRegex = /Test Suites: (\d+) failed, (\d+) passed, (\d+) total/;
  const testCaseRegex = /Tests:\s+(\d+) failed, (\d+) passed, (\d+) total/;
  
  const suiteMatch = output.match(testSuiteRegex);
  const caseMatch = output.match(testCaseRegex);
  
  if (caseMatch) {
    results.failed = parseInt(caseMatch[1]) || 0;
    results.passed = parseInt(caseMatch[2]) || 0;
    results.total = parseInt(caseMatch[3]) || 0;
  }
  
  return results;
}

function extractPerformanceMetrics(output) {
  const metrics = {
    responseTime: {},
    throughput: {},
    errors: []
  };

  // Extract performance data from output
  const responseTimeRegex = /response time: (\d+)ms/gi;
  const throughputRegex = /(\d+) concurrent .* completed in (\d+)ms/gi;
  
  let match;
  while ((match = responseTimeRegex.exec(output)) !== null) {
    const time = parseInt(match[1]);
    if (!metrics.responseTime.average) {
      metrics.responseTime.average = time;
    } else {
      metrics.responseTime.average = (metrics.responseTime.average + time) / 2;
    }
  }

  while ((match = throughputRegex.exec(output)) !== null) {
    const requests = parseInt(match[1]);
    const time = parseInt(match[2]);
    metrics.throughput[`${requests}_requests`] = {
      requests,
      time,
      requestsPerSecond: (requests / time) * 1000
    };
  }

  return metrics;
}

function generateHtmlReport(report) {
  const successRate = report.summary.total > 0 
    ? ((report.summary.passed / report.summary.total) * 100).toFixed(2)
    : 0;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Legal Estate Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1, h2 { color: #333; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .stat-card.passed { border-left: 4px solid #28a745; }
        .stat-card.failed { border-left: 4px solid #dc3545; }
        .stat-card.total { border-left: 4px solid #007bff; }
        .stat-number { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .progress-bar { width: 100%; height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; margin: 10px 0; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #28a745, #20c997); transition: width 0.3s ease; }
        .section { margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; }
        .coverage-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .coverage-table th, .coverage-table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        .coverage-table th { background: #e9ecef; }
        .error-list { background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; padding: 15px; }
        .error-item { color: #721c24; margin: 5px 0; }
        .timestamp { color: #6c757d; font-size: 0.9em; }
        .performance-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
        .metric-card { background: white; padding: 15px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏛️ Legal Estate Test Suite Report</h1>
        <p class="timestamp">Generated: ${new Date(report.timestamp).toLocaleString()}</p>
        
        <div class="summary">
            <div class="stat-card total">
                <div class="stat-number">${report.summary.total}</div>
                <div>Total Tests</div>
            </div>
            <div class="stat-card passed">
                <div class="stat-number">${report.summary.passed}</div>
                <div>Passed</div>
            </div>
            <div class="stat-card failed">
                <div class="stat-number">${report.summary.failed}</div>
                <div>Failed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${successRate}%</div>
                <div>Success Rate</div>
            </div>
        </div>
        
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${successRate}%"></div>
        </div>
        
        <div class="section">
            <h2>🔧 Backend Tests</h2>
            <p>Total: ${report.backend.tests.total || 0} | 
               Passed: ${report.backend.tests.passed || 0} | 
               Failed: ${report.backend.tests.failed || 0}</p>
            ${report.backend.coverage ? `
            <h3>Coverage</h3>
            <table class="coverage-table">
                <tr><th>Metric</th><th>Coverage</th></tr>
                <tr><td>Lines</td><td>${report.backend.coverage.total?.lines?.pct || 0}%</td></tr>
                <tr><td>Functions</td><td>${report.backend.coverage.total?.functions?.pct || 0}%</td></tr>
                <tr><td>Branches</td><td>${report.backend.coverage.total?.branches?.pct || 0}%</td></tr>
                <tr><td>Statements</td><td>${report.backend.coverage.total?.statements?.pct || 0}%</td></tr>
            </table>
            ` : '<p>No coverage data available</p>'}
        </div>
        
        <div class="section">
            <h2>🎨 Frontend Tests</h2>
            <p>Total: ${report.frontend.tests.total || 0} | 
               Passed: ${report.frontend.tests.passed || 0} | 
               Failed: ${report.frontend.tests.failed || 0}</p>
            ${report.frontend.coverage ? `
            <h3>Coverage</h3>
            <table class="coverage-table">
                <tr><th>Metric</th><th>Coverage</th></tr>
                <tr><td>Lines</td><td>${report.frontend.coverage.total?.lines?.pct || 0}%</td></tr>
                <tr><td>Functions</td><td>${report.frontend.coverage.total?.functions?.pct || 0}%</td></tr>
                <tr><td>Branches</td><td>${report.frontend.coverage.total?.branches?.pct || 0}%</td></tr>
                <tr><td>Statements</td><td>${report.frontend.coverage.total?.statements?.pct || 0}%</td></tr>
            </table>
            ` : '<p>No coverage data available</p>'}
        </div>
        
        <div class="section">
            <h2>⚡ Performance Metrics</h2>
            <div class="performance-metrics">
                ${Object.keys(report.performance).length > 0 ? `
                    <div class="metric-card">
                        <h4>Response Time</h4>
                        <p>Average: ${report.performance.responseTime?.average || 'N/A'}ms</p>
                    </div>
                    ${Object.entries(report.performance.throughput || {}).map(([key, data]) => `
                        <div class="metric-card">
                            <h4>Throughput - ${key.replace('_', ' ')}</h4>
                            <p>${data.requestsPerSecond?.toFixed(2) || 0} req/sec</p>
                        </div>
                    `).join('')}
                ` : '<p>No performance data available</p>'}
            </div>
        </div>
        
        ${report.errors.length > 0 ? `
        <div class="section">
            <h2>❌ Errors</h2>
            <div class="error-list">
                ${report.errors.map(error => `<div class="error-item">• ${error}</div>`).join('')}
            </div>
        </div>
        ` : ''}
    </div>
</body>
</html>`;
}

function printSummary(report) {
  console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}               TEST SUITE SUMMARY               ${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════════════${colors.reset}`);
  
  console.log(`${colors.cyan}Total Tests:    ${colors.bright}${report.summary.total}${colors.reset}`);
  console.log(`${colors.green}Passed:         ${colors.bright}${report.summary.passed}${colors.reset}`);
  console.log(`${colors.red}Failed:         ${colors.bright}${report.summary.failed}${colors.reset}`);
  
  const successRate = report.summary.total > 0 
    ? ((report.summary.passed / report.summary.total) * 100).toFixed(2)
    : 0;
  console.log(`${colors.yellow}Success Rate:   ${colors.bright}${successRate}%${colors.reset}`);
  
  if (report.errors.length > 0) {
    console.log(`\n${colors.red}Errors Encountered:${colors.reset}`);
    report.errors.forEach(error => {
      console.log(`${colors.red}  • ${error}${colors.reset}`);
    });
  }
  
  console.log(`\n${colors.cyan}Reports saved to: test-results/test-report.html${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════${colors.reset}\n`);
  
  // Exit with appropriate code
  if (report.summary.failed > 0 || report.errors.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

if (require.main === module) {
  try {
    generateTestReport();
  } catch (error) {
    console.error(`${colors.red}Failed to generate test report: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

module.exports = { generateTestReport };