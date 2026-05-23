const express = require('express');
const path = require('path');
const router = express.Router();

// Serve the WebRTC meeting room page for direct access
router.get('/meeting/:meetingId', (req, res) => {
  // Serve the main frontend application
  // This allows direct URLs like /meeting/12345 to work
  const frontendPath = process.env.FRONTEND_BUILD_PATH || '/var/www/html/frontend/build';
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Also handle /m/:meetingId for shorter URLs
router.get('/m/:meetingId', (req, res) => {
  const frontendPath = process.env.FRONTEND_BUILD_PATH || '/var/www/html/frontend/build';
  res.sendFile(path.join(frontendPath, 'index.html'));
});

module.exports = router;