const { prisma } = require('../config/database');
const { Parser } = require('json2csv');

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
    const samples = await prisma.gazeSample.findMany({
      include: { user: { select: { participantId: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const rows = samples.map((s) => ({
      participantId: s.user.participantId,
      videoId: s.videoId,
      x: s.x,
      y: s.y,
      timestamp: s.timestamp,
      createdAt: s.createdAt.toISOString(),
    }));

    const parser = new Parser({
      fields: ['participantId', 'videoId', 'x', 'y', 'timestamp', 'createdAt'],
    });
    const csv = parser.parse(rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=gaze_samples_export.csv');
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
