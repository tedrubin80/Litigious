const express = require('express');
const router = express.Router();
const { 
  uploadDocument,
  uploadMultipleDocuments,
  getDocuments,
  getDocument,
  downloadDocument,
  updateDocument,
  deleteDocument,
  getDocumentStatistics
} = require('../controllers/documentController');
const { handleUploadErrors } = require('../middleware/uploadMiddleware');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// Document CRUD routes
router.get('/', getDocuments);
router.get('/statistics', getDocumentStatistics);
router.get('/:id', getDocument);
router.get('/:id/download', downloadDocument);

// Upload routes (with error handling)
router.post('/upload', uploadDocument, handleUploadErrors);
router.post('/upload-multiple', uploadMultipleDocuments, handleUploadErrors);

// Update and delete routes
router.put('/:id', updateDocument);
router.delete('/:id', deleteDocument);

module.exports = router;