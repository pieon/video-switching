const { prisma } = require('../config/database');
const { Parser } = require('json2csv');
const { toEastern } = require('../utils/datetime');

/**
 * Store a batch of raw gaze samples for the authenticated user.
 * @route POST /api/gaze/batch
 */
async function trackGazeBatch(req, res) {
  try {
    const { samples } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(samples) || samples.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'samples array is required and must not be empty',
      });
    }

    const created = await prisma.gazeSample.createMany({
      data: samples.map((s) => ({
        userId,
        videoId: s.videoId || '',
        x: s.x,
        y: s.y,
        timestamp: s.timestamp,
        // Epoch ms from the browser; older clients may not send it.
        clientTime: s.clientTime ? new Date(s.clientTime) : null,
      })),
    });

    res.status(201).json({
      success: true,
      data: {
        count: created.count,
        message: `${created.count} gaze samples stored`,
      },
    });
  } catch (error) {
    console.error('Track gaze batch error:', error);
    res.status(500).json({ success: false, error: 'Failed to store gaze samples' });
  }
}

/**
 * Export all gaze samples as CSV (researcher).
 * @route GET /api/gaze/export
 */
async function exportGazeAsCSV(req, res) {
  try {
    const { participantId } = req.query;

    if (participantId) {
      const exists = await prisma.user.findUnique({ where: { participantId } });
      if (!exists) {
        return res.status(404).json({
          success: false,
          error: `No participant with id "${participantId}"`,
        });
      }
    }

    const samples = await prisma.gazeSample.findMany({
      where: participantId ? { user: { participantId } } : {},
      include: { user: { select: { participantId: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const rows = samples.map((s) => ({
      participantId: s.user.participantId,
      videoId: s.videoId,
      x: s.x,
      y: s.y,
      timestamp: s.timestamp,
      client_time: toEastern(s.clientTime),
      client_time_epoch_ms: s.clientTime ? s.clientTime.getTime() : null,
      createdAt: toEastern(s.createdAt),
    }));

    const parser = new Parser({
      fields: [
        'participantId',
        'videoId',
        'x',
        'y',
        'timestamp',
        'client_time',
        'client_time_epoch_ms',
        'createdAt',
      ],
    });
    const csv = parser.parse(rows);

    res.setHeader('Content-Type', 'text/csv');
    const filePrefix = participantId ? `${participantId}_` : '';
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${filePrefix}gaze_samples_export.csv`
    );
    res.send(csv);
  } catch (error) {
    console.error('Export gaze error:', error);
    res.status(500).json({ success: false, error: 'Failed to export gaze samples' });
  }
}

module.exports = {
  trackGazeBatch,
  exportGazeAsCSV,
};
