const { prisma } = require('../config/database');

/**
 * Track a video event
 * @route POST /api/events/track
 */
async function trackEvent(req, res) {
  try {
    const {
      sessionId,
      eventType,
      duration,
      fromVideoId,
      toVideoId,
      playbackPosition,
    } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!sessionId || !eventType) {
      return res.status(400).json({
        success: false,
        error: 'sessionId and eventType are required',
      });
    }

    // Validate event type
    const validEventTypes = ['play', 'pause', 'switch', 'complete'];
    if (!validEventTypes.includes(eventType)) {
      return res.status(400).json({
        success: false,
        error: `eventType must be one of: ${validEventTypes.join(', ')}`,
      });
    }

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
        error: 'Session not found or does not belong to user',
      });
    }

    // Create event
    const event = await prisma.videoEvent.create({
      data: {
        sessionId,
        eventType,
        duration: duration || null,
        fromVideoId: fromVideoId || null,
        toVideoId: toVideoId || null,
        playbackPosition: playbackPosition || null,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        event,
      },
    });
  } catch (error) {
    console.error('Track event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track event',
    });
  }
}

/**
 * Track multiple events in batch
 * @route POST /api/events/track-batch
 */
async function trackBatchEvents(req, res) {
  try {
    const { events } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'events array is required and must not be empty',
      });
    }

    // Verify all sessions belong to user
    const sessionIds = [...new Set(events.map(e => e.sessionId))];
    const sessions = await prisma.videoSession.findMany({
      where: {
        id: { in: sessionIds },
        userId,
      },
    });

    if (sessions.length !== sessionIds.length) {
      return res.status(404).json({
        success: false,
        error: 'One or more sessions not found or do not belong to user',
      });
    }

    // Create all events
    const createdEvents = await prisma.videoEvent.createMany({
      data: events.map(event => ({
        sessionId: event.sessionId,
        eventType: event.eventType,
        duration: event.duration || null,
        fromVideoId: event.fromVideoId || null,
        toVideoId: event.toVideoId || null,
        playbackPosition: event.playbackPosition || null,
        timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
      })),
    });

    res.status(201).json({
      success: true,
      data: {
        count: createdEvents.count,
        message: `${createdEvents.count} events tracked successfully`,
      },
    });
  } catch (error) {
    console.error('Track batch events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track batch events',
    });
  }
}

/**
 * Get events for a session
 * @route GET /api/events/session/:sessionId
 */
async function getSessionEvents(req, res) {
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

    const events = await prisma.videoEvent.findMany({
      where: { sessionId },
      orderBy: {
        timestamp: 'asc',
      },
    });

    res.json({
      success: true,
      data: {
        events,
        count: events.length,
      },
    });
  } catch (error) {
    console.error('Get session events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events',
    });
  }
}

/**
 * Get all events (researcher-facing)
 * @route GET /api/events/all
 */
async function getAllEvents(req, res) {
  try {
    const { participantId, eventType, startDate, endDate } = req.query;

    // Build filter
    const where = {};

    if (participantId) {
      const user = await prisma.user.findUnique({
        where: { participantId },
      });
      if (user) {
        where.session = {
          userId: user.id,
        };
      }
    }

    if (eventType) {
      where.eventType = eventType;
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        where.timestamp.lte = new Date(endDate);
      }
    }

    const events = await prisma.videoEvent.findMany({
      where,
      include: {
        session: {
          include: {
            user: {
              select: {
                participantId: true,
                condition: true,
              },
            },
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    res.json({
      success: true,
      data: {
        events,
        count: events.length,
      },
    });
  } catch (error) {
    console.error('Get all events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events',
    });
  }
}

module.exports = {
  trackEvent,
  trackBatchEvents,
  getSessionEvents,
  getAllEvents,
};
