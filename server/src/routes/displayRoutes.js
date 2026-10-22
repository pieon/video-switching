const express = require('express');
const router = express.Router();
const { logDisplay } = require('../controllers/displayController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/', logDisplay);

module.exports = router;
