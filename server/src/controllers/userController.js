const { prisma } = require('../config/database');
const { generateToken } = require('../utils/jwt');

/**
 * Create a new participant (researcher-facing endpoint)
 * @route POST /api/users/create
 */
async function createParticipant(req, res) {
  try {
    const { participantId, condition, videoSet = 'A', trainingGroup = '1' } = req.body;

    // Validate input
    if (!participantId || !condition) {
      return res.status(400).json({
        success: false,
        error: 'participantId and condition are required',
      });
    }

    if (!['switching', 'non_switching'].includes(condition)) {
      return res.status(400).json({
        success: false,
        error: 'condition must be either "switching" or "non_switching"',
      });
    }

    if (!['A', 'B'].includes(videoSet)) {
      return res.status(400).json({
        success: false,
        error: 'videoSet must be either "A" or "B"',
      });
    }

    if (!['1', '2'].includes(trainingGroup)) {
      return res.status(400).json({
        success: false,
        error: 'trainingGroup must be either "1" or "2"',
      });
    }

    // Check if participant already exists
    const existing = await prisma.user.findUnique({
      where: { participantId },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Participant ID already exists',
      });
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        participantId,
        condition,
        videoSet,
        trainingGroup,
      },
      select: {
        id: true,
        participantId: true,
        condition: true,
        videoSet: true,
        trainingGroup: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        user,
        message: 'Participant created successfully',
      },
    });
  } catch (error) {
    console.error('Create participant error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create participant',
    });
  }
}

/**
 * Login participant (participant-facing endpoint)
 * @route POST /api/users/login
 */
async function loginParticipant(req, res) {
  try {
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({
        success: false,
        error: 'participantId is required',
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { participantId },
      select: {
        id: true,
        participantId: true,
        condition: true,
        videoSet: true,
        trainingGroup: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Participant ID not found. Please check with your researcher.',
      });
    }

    // Generate JWT token
    const token = generateToken({ userId: user.id });

    res.json({
      success: true,
      data: {
        token,
        user,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
    });
  }
}

/**
 * Get current user info
 * @route GET /api/users/me
 */
async function getCurrentUser(req, res) {
  try {
    res.json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user info',
    });
  }
}

/**
 * Get all participants (researcher-facing endpoint)
 * @route GET /api/users/all
 */
async function getAllParticipants(req, res) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        participantId: true,
        condition: true,
        videoSet: true,
        trainingGroup: true,
        createdAt: true,
        _count: {
          select: {
            sessions: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: {
        users,
        count: users.length,
      },
    });
  } catch (error) {
    console.error('Get all participants error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch participants',
    });
  }
}

/**
 * Delete a participant and all their data
 * @route DELETE /api/users/:id
 */
async function deleteParticipant(req, res) {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'Participant not found' });
    }

    // Sessions and events cascade-delete automatically via Prisma schema
    await prisma.user.delete({ where: { id } });

    res.json({ success: true, data: { message: 'Participant deleted successfully' } });
  } catch (error) {
    console.error('Delete participant error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete participant' });
  }
}

module.exports = {
  createParticipant,
  loginParticipant,
  getCurrentUser,
  getAllParticipants,
  deleteParticipant,
};
