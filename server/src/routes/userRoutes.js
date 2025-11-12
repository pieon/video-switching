const express = require('express');
const router = express.Router();
const {
  createParticipant,
  loginParticipant,
  getCurrentUser,
  getAllParticipants,
} = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

// Public routes
router.post('/login', loginParticipant);

// Protected routes (require authentication)
router.get('/me', authenticate, getCurrentUser);

// Admin/Researcher routes (you may want to add admin-only middleware later)
router.post('/create', createParticipant);
router.get('/all', getAllParticipants);

module.exports = router;
