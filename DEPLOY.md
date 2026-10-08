# Deploying changes to the VM

The app runs at http://codes.cs.vt.edu on a VT VM: nginx in front, **PM2** running the backend
on port 5001 and the Next.js frontend on port 3000. (The `screen`-based instructions in
[README.md](README.md) predate PM2 — use `pm2` commands.)

Local dev uses port **3001** for the backend; production uses **5001**. Don't mix them up when
testing with curl.

---

## Quick reference

```bash
cd ~/video-switching
git pull
npm install                     # only if package.json changed
cd server && npm install        # only if server/package.json changed
npx prisma migrate deploy       # only if prisma/migrations/ gained a folder
npx prisma generate
cd ..
npm run build                   # ALWAYS, for any frontend change
pm2 restart all
```

Then verify — see [Verifying the deploy](#verifying-the-deploy).

---

## Full procedure

### 1. Back up the database

The DB is not in git, so `git pull` can never overwrite it. The backup protects against a bad
**migration**. `VACUUM INTO` takes a crash-consistent snapshot while the server keeps running —
plain `cp` on a live SQLite file can capture a torn copy if a participant's session is writing.

```bash
cd ~/video-switching/server
echo "VACUUM INTO '$PWD/prisma/video_switching.backup.$(date +%Y%m%d_%H%M%S).db';" \
  | npx prisma db execute --stdin --schema prisma/schema.prisma
```

`sqlite3` is **not installed** on the VM — use the Prisma commands here rather than the
`sqlite3` CLI.

### 2. Pull

```bash
cd ~/video-switching
git status --short     # should be clean
git pull
```

If git reports **divergent branches**, the VM has local commits. Discard them and match the
remote exactly:

```bash
git fetch origin
git reset --hard origin/main
```

> **Never run `git clean -fdx` on the VM.** The `-x` flag deletes ignored files, which includes
> `server/prisma/video_switching.db` (the production database) and `server/.env` (secrets).
> Plain `git clean -fd` is safe — it skips ignored files — but `reset --hard` is usually enough.

Optional, to make future pulls fail loudly instead of prompting about merge strategy:

```bash
git config pull.ff only
```

### 3. Install dependencies

Only needed when the relevant `package.json` changed. The two packages are independent — a root
`npm install` does **not** install server deps.

```bash
cd ~/video-switching && npm install
cd server && npm install
```

### 4. Apply database migrations

Required whenever `server/prisma/migrations/` has a new folder. **Skipping this is the most
damaging mistake possible here** — see [Why migrations matter](#why-migrations-matter).

```bash
cd ~/video-switching/server
npx prisma migrate status     # lists anything pending
npx prisma migrate deploy     # applies it
npx prisma generate           # regenerate the client against the new schema
```

`migrate status` should end with `Database schema is up to date!`

Never run `prisma migrate dev` or `prisma migrate reset` on the VM — both can wipe data.
`migrate deploy` is the production-safe command.

### 5. Build the frontend

**Required for every frontend change.** `next start` serves the prebuilt `.next/` output, so
pulling new source without rebuilding leaves the old site running — the most common reason a
deploy appears to do nothing.

```bash
cd ~/video-switching
npm run build
```

`NEXT_PUBLIC_API_URL` is baked in **at build time** from [.env.production](.env.production)
(`http://codes.cs.vt.edu:5001/api`), which is tracked in git and picked up automatically. Don't
run the build with `NODE_ENV=development` or the frontend will call `localhost:3001`.

A backend-only change can skip this step — `pm2 restart backend` is enough, since Node runs the
source directly.

### 6. Restart

```bash
pm2 restart all
pm2 status                      # both online, restart count not climbing
pm2 logs --lines 30 --nostream  # no crash loop
```

---

## Verifying the deploy

### Schema and stored data

```bash
cd ~/video-switching/server
npx prisma migrate status    # "Database schema is up to date!"
node check-gaze.js           # per-stream row counts; warns on missing tables
```

### Endpoints

```bash
for t in events sessions participants phases; do
  printf "%-14s %s\n" "$t" "$(curl -s -o /dev/null -w '%{http_code}' \
    "http://localhost:5001/api/analytics/export?type=$t")"
done
curl -s -o /dev/null -w 'gaze %{http_code}\n' http://localhost:5001/api/gaze/export
```

All should return `200`.

### One full participant walkthrough

Create a throwaway participant on `/researcher`, then run the whole flow with DevTools open
(Network **and** Console):

| Stage | Expect |
|---|---|
| login | `POST /users/login` 200 |
| EEG page | on video play `POST /phases/start` **201** |
| player | `POST /gaze/batch` **201** every 5 s — a 500 here means a missing migration |
| player | `POST /events/track-batch` **201** |
| after logout | files named `<participantId>_webcam.webm` / `_screen.webm` |

Console must be free of `[GazeLogger] upload failed` and `[trackingService] startPhase failed`.

Then re-run `node check-gaze.js` — counts should have moved and "last" should read minutes ago.
Delete the test participant on `/researcher` afterwards (it cascade-deletes their sessions,
events, gaze samples, and phase logs).

---

## Why migrations matter

Two data streams fail **silently** in the browser when their table is missing, because both are
written to never interrupt a running study:

- **Gaze samples** — `POST /api/gaze/batch` returns 500, and `useGazeLogger` only logs to the
  console before re-buffering. A session looks completely normal and stores nothing. This
  happened for six weeks after `add_gaze_sample` shipped without `migrate deploy`.
- **Phase logs** (EEG baseline / training / experiment timings) — `usePhaseLog` swallows its own
  errors by design, so there is no symptom at all; the stage rows are simply empty in the export.

Neither shows a participant-visible error. Always run `migrate status` after a deploy, and
always run one test session before a real participant.

---

## Reading logs

```bash
pm2 logs backend                          # live tail
pm2 logs backend --lines 200 --nostream   # last 200 lines, then exit (use this for grep)
pm2 logs backend --lines 500 --nostream | grep -A10 "error"
sudo tail -f /var/log/nginx/error.log     # 502s and anything not reaching Node
```

Every request is logged on **arrival** (`2026-09-14T18:23:11.044Z - POST /api/gaze/batch`) with
no status code, so a log line proves the request was received, **not** that it succeeded. Row
counts from `check-gaze.js` are the only proof that data landed.

---

## Rollback

```bash
cd ~/video-switching
git log --oneline               # find the previous good sha
git checkout <sha>
npm run build
pm2 restart all
```

If a migration caused the problem, also restore the backup:

```bash
cp server/prisma/video_switching.backup.<stamp>.db server/prisma/video_switching.db
pm2 restart backend
```

---

## Gotchas

- **Nothing changed after deploying** → you skipped `npm run build`.
- **Gaze export 500s** → migration not applied. `npx prisma migrate deploy`.
- **`sqlite3: command not found`** → it isn't installed; use `node check-gaze.js` or
  `npx prisma db execute`.
- **`EADDRINUSE` on restart** → a stale process holds the port. `pm2 delete all && pm2 start
  ecosystem.config.js`, or `pkill -f "node src/server.js"`.
- **`.webm` shows a short duration** → Chromium omits the duration header; the footage is
  complete. Fix losslessly with `ffmpeg -i in.webm -c copy out.webm`.
- **Deploy between participants** — a deploy logs everyone out (the auth token lives in
  `sessionStorage`) and restarting mid-session interrupts data upload.
