const { prisma } = require('../config/database');

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

module.exports = {
  trackBatchEvents,
};
