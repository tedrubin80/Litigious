const fs = require('fs');
const path = require('path');

const BACKEND_ROOT = path.join(__dirname, '../..');

/** Directories where users upload files during demos — never delete uploads/demo/ */
const USER_UPLOAD_DIRS = [
  'uploads/documents',
  'uploads/medical',
  'uploads/images',
  'uploads/temp'
];

const DEMO_SAMPLE_DIR = path.join(BACKEND_ROOT, 'uploads/demo');

const removeDirContents = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    return { dir: dirPath, removed: 0 };
  }

  let removed = 0;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (entry.name === '.gitkeep') continue;

    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
      removed += 1;
    } else {
      fs.unlinkSync(fullPath);
      removed += 1;
    }
  }

  return { dir: dirPath, removed };
};

/**
 * Delete user-uploaded files from disk. Preserves backend/uploads/demo/ samples.
 */
const purgeUserUploads = () => {
  const results = USER_UPLOAD_DIRS.map((rel) =>
    removeDirContents(path.join(BACKEND_ROOT, rel))
  );

  const totalRemoved = results.reduce((sum, row) => sum + row.removed, 0);
  return { totalRemoved, results, demoSampleDir: DEMO_SAMPLE_DIR };
};

module.exports = {
  purgeUserUploads,
  USER_UPLOAD_DIRS,
  DEMO_SAMPLE_DIR
};
