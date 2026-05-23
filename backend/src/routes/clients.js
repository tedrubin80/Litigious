const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { authenticateToken } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(authenticateToken);

// Client routes (using BaseController methods)
router.get('/', clientController.getAll);
router.post('/', clientController.create);
router.get('/:id', clientController.getById);
router.put('/:id', clientController.update);
router.delete('/:id', clientController.delete);

// Custom client routes
router.get('/:id/stats', clientController.getClientStats);
router.get('/:id/timeline', clientController.getClientTimeline);
router.post('/merge', clientController.mergeClients);
router.get('/:id/emergency-contacts', clientController.getEmergencyContacts);
router.post('/:id/emergency-contacts', clientController.createEmergencyContact);
router.put('/:id/emergency-contacts/:contactId', clientController.updateEmergencyContact);
router.delete('/:id/emergency-contacts/:contactId', clientController.deleteEmergencyContact);

module.exports = router;