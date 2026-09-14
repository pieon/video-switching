const express = require('express');
const router = express.Router();
const { startPhase, endPhase } = require('../controllers/phaseController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/start', startPhase);
router.put('/:id/end', endPhase);

module.exports = router;
