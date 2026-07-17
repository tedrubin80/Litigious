const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { purgeUserUploads } = require('../lib/demoCleanup');

const execFileAsync = promisify(execFile);

const isDemoMode = () => process.env.DEMO_MODE === 'true';
const isAutoResetEnabled = () => process.env.DEMO_AUTO_RESET === 'true';

const runDemoReset = async ({ reseed = true } = {}) => {
  const uploadResult = purgeUserUploads();
  console.log(
    `🧹 Demo cleanup: removed ${uploadResult.totalRemoved} user upload item(s) (demo samples kept)`
  );

  if (!reseed || process.env.DEMO_AUTO_RESET_RESEED === 'false') {
    return { uploadResult, reseeded: false };
  }

  const seedScript = path.join(__dirname, '../../scripts/seed-demo-data.js');
  await execFileAsync(process.execPath, [seedScript], {
    cwd: path.join(__dirname, '../..'),
    env: process.env
  });

  console.log('🌱 Demo auto-reset: database re-seeded');
  return { uploadResult, reseeded: true };
};

let intervalHandle = null;

const startDemoResetScheduler = () => {
  if (!isDemoMode() || !isAutoResetEnabled()) {
    return null;
  }

  const hours = Math.max(1, parseInt(process.env.DEMO_RESET_INTERVAL_HOURS || '24', 10));
  const ms = hours * 60 * 60 * 1000;

  console.log(`⏱️  Demo auto-reset enabled — every ${hours} hour(s)`);

  intervalHandle = setInterval(() => {
    runDemoReset().catch((error) => {
      console.error('Demo auto-reset failed:', error.message);
    });
  }, ms);

  if (typeof intervalHandle.unref === 'function') {
    intervalHandle.unref();
  }

  return intervalHandle;
};

const stopDemoResetScheduler = () => {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
};

module.exports = {
  isDemoMode,
  isAutoResetEnabled,
  runDemoReset,
  startDemoResetScheduler,
  stopDemoResetScheduler
};
