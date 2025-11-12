const { prisma } = require('../config/database');

/**
 * Start a new video session
 * @route POST /api/sessions/start
 */
async function startSession(req, res) {
  try {
    const { videoId } = req.body;
    const userId = req.user.id;
    const mode = req.user.condition;

    if (!videoId) {
      return res.status(400).json({
        success: false,
        error: 'videoId is required',
      });
    }

    // Create new session
    const session = await prisma.videoSession.create({
      data: {
        userId,
        videoId,
        mode,
      },
      include: {
        user: {
          select: {
            participantId: true,
            condition: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: {
        session,
      },
    });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start session',
    });
  }
}

/**
 * Complete a video session
 * @route PUT /api/sessions/:sessionId/complete
 */
async function completeSession(req, res) {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    // Verify session belongs to user
    const session = await prisma.videoSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    if (session.completedAt) {
      return res.status(400).json({
        success: false,
        error: 'Session already completed',
      });
    }

    // Mark session as completed
    const updatedSession = await prisma.videoSession.update({
      where: { id: sessionId },
      data: {
        completedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        session: updatedSession,
      },
    });
  } catch (error) {
    console.error('Complete session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete session',
    });
  }
}

/**
 * Get user's sessions
 * @route GET /api/sessions/my-sessions
 */
async function getMySessions(req, res) {
  try {
    const userId = req.user.id;

    const sessions = await prisma.videoSession.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            events: true,
          },
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: {
        sessions,
        count: sessions.length,
      },
    });
  } catch (error) {
    console.error('Get my sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sessions',
    });
  }
}

/**
 * Get all sessions (researcher-facing)
 * @route GET /api/sessions/all
 */
async function getAllSessions(req, res) {
  try {
    const sessions = await prisma.videoSession.findMany({
      include: {
        user: {
          select: {
            participantId: true,
            condition: true,
          },
        },
        _count: {
          select: {
            events: true,
          },
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: {
        sessions,
        count: sessions.length,
      },
    });
  } catch (error) {
    console.error('Get all sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sessions',
    });
  }
}

module.exports = {
  startSession,
  completeSession,
  getMySessions,
  getAllSessions,
};
