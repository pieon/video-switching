const express = require('express');
const router = express.Router();
const { exportDataAsCSV } = require('../controllers/analyticsController');

// Researcher routes (you may want to add admin-only middleware later)
router.get('/export', exportDataAsCSV);

module.exports = router;
