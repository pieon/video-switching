const { prisma } = require('../config/database');
const { Parser } = require('json2csv');

/**
 * Export all data as CSV
 * @route GET /api/analytics/export
 */
async function exportDataAsCSV(req, res) {
  try {
    const { type = 'events' } = req.query;

    if (type === 'events') {
      // Export all events with session and user data
      const events = await prisma.videoEvent.findMany({
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
          timestamp: 'asc',
        },
      });

      // Flatten data for CSV
      const flattenedData = events.map(event => ({
        event_id: event.id,
        participant_id: event.session.user.participantId,
        condition: event.session.user.condition,
        session_id: event.sessionId,
        video_id: event.session.videoId,
        event_type: event.eventType,
        timestamp: event.timestamp.toISOString(),
        duration_seconds: event.duration,
        from_video_id: event.fromVideoId,
        to_video_id: event.toVideoId,
        playback_position: event.playbackPosition,
        session_started_at: event.session.startedAt.toISOString(),
        session_completed_at: event.session.completedAt
          ? event.session.completedAt.toISOString()
          : null,
      }));

      const parser = new Parser();
      const csv = parser.parse(flattenedData);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=events_export.csv');
      res.send(csv);

    } else if (type === 'sessions') {
      // Export all sessions
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
          startedAt: 'asc',
        },
      });

      const flattenedData = sessions.map(session => ({
        session_id: session.id,
        participant_id: session.user.participantId,
        condition: session.user.condition,
        video_id: session.videoId,
        mode: session.mode,
        started_at: session.startedAt.toISOString(),
        completed_at: session.completedAt
          ? session.completedAt.toISOString()
          : null,
        event_count: session._count.events,
      }));

      const parser = new Parser();
      const csv = parser.parse(flattenedData);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=sessions_export.csv');
      res.send(csv);

    } else if (type === 'participants') {
      // Export participant summary
      const users = await prisma.user.findMany({
        include: {
          _count: {
            select: {
              sessions: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      const flattenedData = users.map(user => ({
        user_id: user.id,
        participant_id: user.participantId,
        condition: user.condition,
        created_at: user.createdAt.toISOString(),
        session_count: user._count.sessions,
      }));

      const parser = new Parser();
      const csv = parser.parse(flattenedData);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=participants_export.csv');
      res.send(csv);

    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid type. Must be one of: events, sessions, participants',
      });
    }

  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export data',
    });
  }
}

module.exports = {
  exportDataAsCSV,
};
