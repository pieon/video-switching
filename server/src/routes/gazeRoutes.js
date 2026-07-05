const express = require('express');
const router = express.Router();
const { trackGazeBatch, exportGazeAsCSV } = require('../controllers/gazeController');
const { authenticate } = require('../middleware/auth');

// Participants upload gaze samples (requires their JWT).
router.post('/batch', authenticate, trackGazeBatch);

// Researcher export (unauthenticated, like /analytics/export).
router.get('/export', exportGazeAsCSV);

module.exports = router;
