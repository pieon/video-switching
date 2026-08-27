// Data health check — run from server/:  node check-gaze.js
// Prints what each logging stream has actually stored, newest activity first.
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const ago = (d) => {
  if (!d) return 'never';
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
};

(async () => {
  const tables = (
    await p.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table'")
  ).map((t) => t.name);

  const missing = ['users', 'video_sessions', 'video_events', 'gaze_samples'].filter(
    (t) => !tables.includes(t)
  );
  if (missing.length) {
    console.log('MISSING TABLES:', missing.join(', '));
    console.log('>>> run: npx prisma migrate deploy');
    return;
  }

  const [users, sessions, events, gaze] = await Promise.all([
    p.user.count(),
    p.videoSession.count(),
    p.videoEvent.count(),
    p.gazeSample.count(),
  ]);
  const [lastSession, lastEvent, lastGaze] = await Promise.all([
    p.videoSession.findFirst({ orderBy: { startedAt: 'desc' } }),
    p.videoEvent.findFirst({ orderBy: { timestamp: 'desc' } }),
    p.gazeSample.findFirst({ orderBy: { createdAt: 'desc' } }),
  ]);

  console.log('\n=== Totals ===');
  console.table([
    { stream: 'users', rows: users, last: '—' },
    { stream: 'sessions', rows: sessions, last: ago(lastSession?.startedAt) },
    { stream: 'events', rows: events, last: ago(lastEvent?.timestamp) },
    { stream: 'gaze samples', rows: gaze, last: ago(lastGaze?.createdAt) },
  ]);

  console.log('=== Per participant ===');
  const all = await p.user.findMany({
    include: { _count: { select: { sessions: true, gazeSamples: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const rows = [];
  for (const u of all) {
    const evts = await p.videoEvent.count({ where: { session: { userId: u.id } } });
    rows.push({
      participant: u.participantId,
      condition: u.condition,
      set: u.videoSet,
      sessions: u._count.sessions,
      events: evts,
      gaze: u._count.gazeSamples,
    });
  }
  console.table(rows);

  const noGaze = rows.filter((r) => r.sessions > 0 && r.gaze === 0);
  if (noGaze.length) {
    console.log(
      'WARNING — sessions recorded but zero gaze samples:',
      noGaze.map((r) => r.participant).join(', ')
    );
  }
})()
  .catch((e) => console.error('ERROR:', e.message))
  .finally(() => p.$disconnect());
