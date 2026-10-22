const { prisma } = require('../config/database');

const VALID_STAGES = ['calibration', 'experiment', 'recording', 'change'];
const INT_FIELDS = [
  'innerWidth',
  'innerHeight',
  'screenWidth',
  'screenHeight',
  'screenX',
  'screenY',
  'outerWidth',
  'outerHeight',
];

/**
 * Store one snapshot of the participant's browser display geometry.
 * @route POST /api/display
 */
async function logDisplay(req, res) {
  try {
    const { stage, clientTime, devicePixelRatio, recordedWidth, recordedHeight } = req.body;

    if (!VALID_STAGES.includes(stage)) {
      return res.status(400).json({
        success: false,
        error: `stage must be one of: ${VALID_STAGES.join(', ')}`,
      });
    }

    const ints = {};
    for (const field of INT_FIELDS) {
      const value = Number(req.body[field]);
      if (!Number.isFinite(value)) {
        return res.status(400).json({ success: false, error: `${field} must be a number` });
      }
      ints[field] = Math.round(value);
    }
    const dpr = Number(devicePixelRatio);
    if (!Number.isFinite(dpr) || dpr <= 0) {
      return res.status(400).json({ success: false, error: 'devicePixelRatio must be a positive number' });
    }

    const optionalInt = (v) => (Number.isFinite(Number(v)) && v !== null ? Math.round(Number(v)) : null);

    await prisma.displaySnapshot.create({
      data: {
        userId: req.user.id,
        stage,
        clientTime: clientTime ? new Date(clientTime) : null,
        devicePixelRatio: dpr,
        ...ints,
        recordedWidth: optionalInt(recordedWidth),
        recordedHeight: optionalInt(recordedHeight),
      },
    });

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Log display error:', error);
    res.status(500).json({ success: false, error: 'Failed to log display snapshot' });
  }
}

module.exports = { logDisplay };
