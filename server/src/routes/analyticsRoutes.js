const express = require('express');
const router = express.Router();
const {
  exportDataAsCSV,
  getStatistics,
  getParticipantStats,
} = require('../controllers/analyticsController');

// Researcher routes (you may want to add admin-only middleware later)
router.get('/export', exportDataAsCSV);
router.get('/stats', getStatistics);
router.get('/participant/:participantId', getParticipantStats);

module.exports = router;
