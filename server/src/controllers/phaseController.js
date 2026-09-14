const { prisma } = require('../config/database');

const VALID_PHASES = ['eeg_baseline', 'training', 'experiment'];

/**
 * Open a phase log. The row is written immediately so an abandoned phase still
 * leaves a record (with endedAt null) rather than vanishing.
 * @route POST /api/phases/start
 */
async function startPhase(req, res) {
  try {
    const { phase } = req.body;

    if (!VALID_PHASES.includes(phase)) {
      return res.status(400).json({
        success: false,
        error: `phase must be one of: ${VALID_PHASES.join(', ')}`,
      });
    }

    const log = await prisma.phaseLog.create({
      data: {
        userId: req.user.id,
        phase,
      },
    });

    res.status(201).json({ success: true, data: { id: log.id } });
  } catch (error) {
    console.error('Start phase error:', error);
    res.status(500).json({ success: false, error: 'Failed to start phase log' });
  }
}

/**
 * Close a phase log.
 * @route PUT /api/phases/:id/end
 */
async function endPhase(req, res) {
  try {
    const { id } = req.params;

    // Scope to the caller so one participant cannot close another's row.
    const existing = await prisma.phaseLog.findFirst({
      where: { id, userId: req.user.id },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Phase log not found' });
    }

    await prisma.phaseLog.update({
      where: { id },
      data: { endedAt: new Date() },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('End phase error:', error);
    res.status(500).json({ success: false, error: 'Failed to end phase log' });
  }
}

module.exports = { startPhase, endPhase };
