const { prisma } = require('../config/database');
const { Parser } = require('json2csv');
const { toEastern } = require('../utils/datetime');

/**
 * Export all data as CSV
 * @route GET /api/analytics/export
 */
async function exportDataAsCSV(req, res) {
  try {
    const { type = 'events', participantId } = req.query;

    // Optional per-participant export. Same columns as the full export, just
    // filtered, so downstream analysis scripts work on either file.
    if (participantId) {
      const exists = await prisma.user.findUnique({ where: { participantId } });
      if (!exists) {
        return res.status(404).json({
          success: false,
          error: `No participant with id "${participantId}"`,
        });
      }
    }
    const filePrefix = participantId ? `${participantId}_` : '';

    if (type === 'events') {
      // Export all events with session and user data
      const events = await prisma.videoEvent.findMany({
        where: participantId ? { session: { user: { participantId } } } : {},
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
        timestamp: toEastern(event.timestamp),
        duration_seconds: event.duration,
        from_video_id: event.fromVideoId,
        to_video_id: event.toVideoId,
        playback_position: event.playbackPosition,
        session_started_at: toEastern(event.session.startedAt),
        session_completed_at: toEastern(event.session.completedAt),
      }));

      const parser = new Parser();
      const csv = parser.parse(flattenedData);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filePrefix}events_export.csv`);
      res.send(csv);

    } else if (type === 'sessions') {
      // One row per stage, plus one row per video watched. Rows are ordered by
      // start time within each participant, so a participant's video rows fall
      // between their "experiment" row and its end — the experiment stage opens
      // before any video is selected.
      const [phaseLogs, sessions] = await Promise.all([
        prisma.phaseLog.findMany({
          where: participantId ? { user: { participantId } } : {},
          include: {
            user: { select: { participantId: true, condition: true } },
          },
        }),
        prisma.videoSession.findMany({
          where: participantId ? { user: { participantId } } : {},
          include: {
            user: { select: { participantId: true, condition: true } },
            _count: { select: { events: true } },
          },
        }),
      ]);

      const seconds = (from, to) =>
        from && to ? Math.round((to.getTime() - from.getTime()) / 1000) : null;

      // [sortable start time, row] so stages and videos can be interleaved.
      const rows = [
        ...phaseLogs.map((log) => [
          log.startedAt,
          {
            participant_id: log.user.participantId,
            condition: log.user.condition,
            phase: log.phase,
            video_id: '',
            started_at: toEastern(log.startedAt),
            ended_at: toEastern(log.endedAt),
            duration_seconds: seconds(log.startedAt, log.endedAt),
            event_count: '',
            session_id: log.phase === 'eeg_baseline' ? log.id : '',
          },
        ]),
        ...sessions.map((session) => [
          session.startedAt,
          {
            participant_id: session.user.participantId,
            condition: session.user.condition,
            phase: 'video',
            video_id: session.videoId,
            started_at: toEastern(session.startedAt),
            ended_at: toEastern(session.completedAt),
            duration_seconds: seconds(session.startedAt, session.completedAt),
            event_count: session._count.events,
            session_id: '',
          },
        ]),
      ];

      rows.sort(([aTime, a], [bTime, b]) =>
        a.participant_id === b.participant_id
          ? aTime - bTime
          : a.participant_id.localeCompare(b.participant_id)
      );

      const flattenedData = rows.map(([, row]) => row);

      const parser = new Parser({
        fields: [
          'participant_id',
          'condition',
          'phase',
          'video_id',
          'started_at',
          'ended_at',
          'duration_seconds',
          'event_count',
          'session_id',
        ],
      });
      const csv = parser.parse(flattenedData);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filePrefix}sessions_export.csv`);
      res.send(csv);

    } else if (type === 'participants') {
      // Export participant summary
      const users = await prisma.user.findMany({
        where: participantId ? { participantId } : {},
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
        participant_id: user.participantId,
        condition: user.condition,
        created_at: toEastern(user.createdAt),
        session_count: user._count.sessions,
      }));

      const parser = new Parser();
      const csv = parser.parse(flattenedData);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filePrefix}participants_export.csv`);
      res.send(csv);

    } else if (type === 'phases') {
      // Export stage timings: EEG baseline, training, experiment
      const logs = await prisma.phaseLog.findMany({
        where: participantId ? { user: { participantId } } : {},
        include: {
          user: {
            select: {
              participantId: true,
              condition: true,
            },
          },
        },
        orderBy: {
          startedAt: 'asc',
        },
      });

      const flattenedData = logs.map(log => ({
        phase_log_id: log.id,
        participant_id: log.user.participantId,
        condition: log.user.condition,
        phase: log.phase,
        started_at: toEastern(log.startedAt),
        ended_at: toEastern(log.endedAt),
        duration_seconds: log.endedAt
          ? Math.round((log.endedAt.getTime() - log.startedAt.getTime()) / 1000)
          : null,
      }));

      const parser = new Parser();
      const csv = parser.parse(flattenedData);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filePrefix}phases_export.csv`);
      res.send(csv);

    } else if (type === 'display') {
      // Display geometry snapshots. matches_calibration compares each row to the
      // participant's most recent calibration snapshot taken before it — a "no"
      // means the viewport changed after calibration, so gaze coordinates from
      // that point on may be offset.
      const snapshots = await prisma.displaySnapshot.findMany({
        where: participantId ? { user: { participantId } } : {},
        include: { user: { select: { participantId: true } } },
        orderBy: { capturedAt: 'asc' },
      });

      const sameDisplay = (a, b) =>
        a.innerWidth === b.innerWidth &&
        a.innerHeight === b.innerHeight &&
        a.devicePixelRatio === b.devicePixelRatio &&
        a.screenX === b.screenX &&
        a.screenY === b.screenY;

      const lastCalibration = new Map(); // userId -> latest calibration snapshot so far
      const flattenedData = snapshots.map((snap) => {
        if (snap.stage === 'calibration') lastCalibration.set(snap.userId, snap);
        const calibration = lastCalibration.get(snap.userId);
        return {
          participant_id: snap.user.participantId,
          stage: snap.stage,
          captured_at: toEastern(snap.capturedAt),
          inner_width: snap.innerWidth,
          inner_height: snap.innerHeight,
          device_pixel_ratio: snap.devicePixelRatio,
          screen_width: snap.screenWidth,
          screen_height: snap.screenHeight,
          screen_x: snap.screenX,
          screen_y: snap.screenY,
          recorded_width: snap.recordedWidth,
          recorded_height: snap.recordedHeight,
          // blank when there is no earlier calibration to compare against
          matches_calibration: calibration ? (sameDisplay(snap, calibration) ? 'yes' : 'no') : '',
        };
      });

      const parser = new Parser({
        fields: [
          'participant_id',
          'stage',
          'captured_at',
          'inner_width',
          'inner_height',
          'device_pixel_ratio',
          'screen_width',
          'screen_height',
          'screen_x',
          'screen_y',
          'recorded_width',
          'recorded_height',
          'matches_calibration',
        ],
      });
      const csv = parser.parse(flattenedData);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filePrefix}display_export.csv`);
      res.send(csv);

    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid type. Must be one of: events, sessions, participants, phases, display',
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
