const express = require('express');
const router = express.Router();
const { trackBatchEvents } = require('../controllers/eventController');
const { authenticate } = require('../middleware/auth');

// All event routes require authentication
router.use(authenticate);

router.post('/track-batch', trackBatchEvents);

module.exports = router;
