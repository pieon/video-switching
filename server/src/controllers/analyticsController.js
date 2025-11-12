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

/**
 * Get aggregated statistics
 * @route GET /api/analytics/stats
 */
async function getStatistics(req, res) {
  try {
    // Get overall stats
    const [
      totalUsers,
      totalSessions,
      totalEvents,
      switchingUsers,
      nonSwitchingUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.videoSession.count(),
      prisma.videoEvent.count(),
      prisma.user.count({ where: { condition: 'switching' } }),
      prisma.user.count({ where: { condition: 'non_switching' } }),
    ]);

    // Get event type breakdown
    const eventsByType = await prisma.videoEvent.groupBy({
      by: ['eventType'],
      _count: {
        eventType: true,
      },
    });

    // Get pause statistics
    const pauseEvents = await prisma.videoEvent.findMany({
      where: {
        eventType: 'pause',
        duration: { not: null },
      },
      select: {
        duration: true,
      },
    });

    const totalPauseDuration = pauseEvents.reduce(
      (sum, event) => sum + (event.duration || 0),
      0
    );
    const avgPauseDuration = pauseEvents.length > 0
      ? totalPauseDuration / pauseEvents.length
      : 0;

    // Get switch statistics (switching mode only)
    const switchEvents = await prisma.videoEvent.count({
      where: {
        eventType: 'switch',
      },
    });

    // Get completion rate
    const completedSessions = await prisma.videoSession.count({
      where: {
        completedAt: { not: null },
      },
    });

    const completionRate = totalSessions > 0
      ? (completedSessions / totalSessions) * 100
      : 0;

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalSessions,
          totalEvents,
          switchingUsers,
          nonSwitchingUsers,
        },
        events: {
          byType: eventsByType.reduce((acc, item) => {
            acc[item.eventType] = item._count.eventType;
            return acc;
          }, {}),
          totalSwitches: switchEvents,
        },
        pauses: {
          totalCount: pauseEvents.length,
          totalDuration: totalPauseDuration,
          averageDuration: avgPauseDuration,
        },
        sessions: {
          total: totalSessions,
          completed: completedSessions,
          completionRate: completionRate.toFixed(2),
        },
      },
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
    });
  }
}

/**
 * Get participant-specific statistics
 * @route GET /api/analytics/participant/:participantId
 */
async function getParticipantStats(req, res) {
  try {
    const { participantId } = req.params;

    const user = await prisma.user.findUnique({
      where: { participantId },
      include: {
        sessions: {
          include: {
            events: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Participant not found',
      });
    }

    // Calculate statistics
    const totalSessions = user.sessions.length;
    const completedSessions = user.sessions.filter(s => s.completedAt).length;
    const totalEvents = user.sessions.reduce((sum, s) => sum + s.events.length, 0);

    const pauseEvents = user.sessions.flatMap(s =>
      s.events.filter(e => e.eventType === 'pause' && e.duration)
    );
    const totalPauses = pauseEvents.length;
    const totalPauseDuration = pauseEvents.reduce(
      (sum, e) => sum + (e.duration || 0),
      0
    );

    const switchEvents = user.sessions.flatMap(s =>
      s.events.filter(e => e.eventType === 'switch')
    );
    const totalSwitches = switchEvents.length;

    res.json({
      success: true,
      data: {
        participant: {
          participantId: user.participantId,
          condition: user.condition,
          createdAt: user.createdAt,
        },
        sessions: {
          total: totalSessions,
          completed: completedSessions,
          completionRate: totalSessions > 0
            ? ((completedSessions / totalSessions) * 100).toFixed(2)
            : 0,
        },
        events: {
          total: totalEvents,
          pauses: {
            count: totalPauses,
            totalDuration: totalPauseDuration,
            averageDuration: totalPauses > 0
              ? (totalPauseDuration / totalPauses).toFixed(2)
              : 0,
          },
          switches: {
            count: totalSwitches,
          },
        },
      },
    });
  } catch (error) {
    console.error('Get participant stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch participant statistics',
    });
  }
}

module.exports = {
  exportDataAsCSV,
  getStatistics,
  getParticipantStats,
};
