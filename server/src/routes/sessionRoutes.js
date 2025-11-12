const express = require('express');
const router = express.Router();
const {
  startSession,
  completeSession,
  getMySessions,
  getAllSessions,
} = require('../controllers/sessionController');
const { authenticate } = require('../middleware/auth');

// All session routes require authentication
router.use(authenticate);

// User routes
router.post('/start', startSession);
router.put('/:sessionId/complete', completeSession);
router.get('/my-sessions', getMySessions);

// Researcher routes
router.get('/all', getAllSessions);

module.exports = router;
