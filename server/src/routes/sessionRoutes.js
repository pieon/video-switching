const express = require('express');
const router = express.Router();
const { startSession, completeSession } = require('../controllers/sessionController');
const { authenticate } = require('../middleware/auth');

// All session routes require authentication
router.use(authenticate);

router.post('/start', startSession);
router.put('/:sessionId/complete', completeSession);

module.exports = router;
