const express = require('express');
const multer = require('multer');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const importController = require('../controllers/importController');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 5 }
});

router.use(authenticateToken, requireAdmin);

router.get('/sources', importController.listSources);
router.get('/jobs', importController.listJobs);
router.post('/jobs', importController.createJob);
router.get('/jobs/:id', importController.getJob);
router.post('/jobs/:id/run', upload.any(), importController.runJob);
router.post('/jobs/:id/commit', importController.commitJob);
router.delete('/jobs/:id', importController.deleteJob);

module.exports = router;
