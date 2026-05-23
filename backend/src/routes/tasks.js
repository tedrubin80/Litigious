const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(authenticateToken);

// Task routes
router.get('/', taskController.getTasks);
router.post('/', taskController.createTask);

// Statistics endpoint (must be before /:id to avoid conflict)
router.get('/statistics', dashboardController.getTaskStatistics);

router.get('/:id', taskController.getTaskById);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

// User and case specific task routes
router.get('/user/:id', taskController.getUserTasks);
router.get('/case/:id', taskController.getCaseTasks);

module.exports = router;