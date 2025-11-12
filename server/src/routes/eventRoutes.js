const express = require('express');
const router = express.Router();
const {
  trackEvent,
  trackBatchEvents,
  getSessionEvents,
  getAllEvents,
} = require('../controllers/eventController');
const { authenticate } = require('../middleware/auth');

// All event routes require authentication
router.use(authenticate);

// User routes
router.post('/track', trackEvent);
router.post('/track-batch', trackBatchEvents);
router.get('/session/:sessionId', getSessionEvents);

// Researcher routes
router.get('/all', getAllEvents);

module.exports = router;
