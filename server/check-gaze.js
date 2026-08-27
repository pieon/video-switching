// Quick DB health check — run from server/:  node check-gaze.js
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const tables = await p.$queryRawUnsafe(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  );
  console.log('Tables:', tables.map((t) => t.name).join(', '));

  if (!tables.some((t) => t.name === 'gaze_samples')) {
    console.log('\n>>> gaze_samples table is MISSING — run: npx prisma migrate deploy');
    return;
  }

  const users = Object.fromEntries(
    (await p.user.findMany()).map((u) => [u.id, u.participantId])
  );
  const rows = await p.gazeSample.groupBy({
    by: ['userId'],
    _count: { _all: true },
    _max: { createdAt: true },
  });

  console.log('\nTotal gaze samples:', await p.gazeSample.count());
  console.table(
    rows.map((r) => ({
      participant: users[r.userId] ?? '(deleted user)',
      samples: r._count._all,
      last: r._max.createdAt.toISOString().slice(0, 16),
    }))
  );
})()
  .catch((e) => console.error('ERROR:', e.message))
  .finally(() => p.$disconnect());
