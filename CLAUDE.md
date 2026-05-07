# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Project

A Next.js + Express research study app that records how participants watch short videos under two conditions ("switching" vs. "non_switching"). Behavior, gaze, and screen/webcam recordings are captured and exported as CSV/WebM for offline analysis.

## Repo layout

This is a two-package monorepo, not a single app:

- **Frontend** (root) — Next.js 16 + React 18 + TypeScript. Pages live in `pages/`, shared code in `src/`.
- **Backend** (`server/`) — Node + Express + Prisma. Its own `package.json`, `node_modules`, and `.env`.

Each package has independent install/run commands. `npm install` at the root does NOT install server deps.

## Commands

### Frontend (run from repo root)
```bash
npm run dev      # Next dev server on http://localhost:3000
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint
```

### Backend (run from `server/`)
```bash
npm run dev              # nodemon on http://localhost:3001
npm start                # Production server
npm run prisma:generate  # Regenerate Prisma client after schema edits
npm run prisma:migrate   # Create + apply a new dev migration
npm run prisma:studio    # GUI at http://localhost:5555
npm run prisma:seed      # Seed test participants (prisma/seed.js)
npx prisma migrate reset # Wipe DB, re-apply all migrations (destructive)
```

To run the full stack locally, start both in separate terminals. The frontend talks to the backend via `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3001/api` — see [src/utils/constants.ts](src/utils/constants.ts)).

There is no test runner configured. "Testing" means manually walking the participant flow in a browser.

## Database (SQLite via Prisma)

The backend uses SQLite even though `server/README.md` still describes a Postgres setup — that doc is stale. The current schema is in [server/prisma/schema.prisma](server/prisma/schema.prisma) and the live DB is at `server/prisma/video_switching.db`.

**Gotcha:** Prisma 5 resolves `file:` URLs **relative to the schema file's directory** (`server/prisma/`), not CWD. The correct value in `server/.env` is `DATABASE_URL="file:./video_switching.db"`. A leading `./prisma/` would resolve to a non-existent nested folder.

Schema models: `User` → `VideoSession` → `VideoEvent` (cascade delete). User carries the experimental assignment: `condition` ("switching" | "non_switching"), `videoSet` ("A" | "B"), `trainingGroup` ("1" | "2"). SQLite has no enums — these are validated as plain strings.

## Participant flow (architectural)

The pages in `pages/` are intended to be visited in this order, and each one assumes prior state set by the previous:

1. **`index.tsx`** — login by participant ID. Hits `POST /api/users/login`, stores JWT.
2. **`admin.tsx`** — researcher picks the mode for this run. Writes to AuthContext.
3. **`calibrate.tsx`** — WebGazer eye-tracking calibration. Saves selected camera deviceId to localStorage (`selected_camera_device_id`).
4. **`training.tsx`** — two back-to-back training phases (`playing1` → `playing2` → `complete`). Group 1 sees `TRAINING_VIDEOS_1` then `TRAINING_VIDEOS_2`; Group 2 sees `TRAINING_VIDEOS_1` then their assigned experimental set. Includes a "Skip to next step" button — finishing the videos is not required to advance.
5. **`player.tsx`** — the experiment. Starts screen + webcam recording on mount, runs WebGazer, tracks all play/pause/switch/complete events. The participant goes through Session 1, then is bounced back to `/admin` for Session 2 (tracked via `localStorage.session_number_<participantId>`).
6. **`researcher.tsx`** — dashboard for researchers to list participants and export CSVs.

`AuthContext` ([src/context/](src/context/)) is the single source of truth for `user`, `mode`, and `videoSet` across pages.

## Video & thumbnail layout

All assets live under `public/` and are referenced from [src/utils/constants.ts](src/utils/constants.ts):

- Experiment videos: `public/videos/stimulant/1_SET A/` and `2_SET B/`
- Training videos:
  - `public/videos/training/Training 1/` — 5-min set 1 (Daniel Tiger / Lyla / Ready Jet Go / Sid)
  - `public/videos/training/test_training/` — 5-sec versions of set 1 (same content, shorter)
  - `public/videos/training/Training 2/` — 5-min set 2 (House Ants / Search String / Slot / Snout Wash)
- Thumbnails: `public/thumbs/stimulant_thumb/Set_A|Set_B/` and `public/thumbs/training_thumb/training_1|training_2/`

Folder-index and content match for training: `training_1/` thumbs go with `Training 1/` and `test_training/` videos; `training_2/` thumbs go with `Training 2/` videos. (An earlier inversion was reorganized; constants in [src/utils/constants.ts](src/utils/constants.ts) reflect the current layout.)

## Recording behavior

`useMediaRecorder` ([src/hooks/useMediaRecorder.ts](src/hooks/useMediaRecorder.ts)) is only invoked from `player.tsx` (not training). It captures screen + webcam to in-memory chunks and only writes them to disk when `stopRecording()` runs — triggered by (a) all videos completed, (b) the manual stop button, or (c) the user ending the browser screen-share. **If the tab crashes or closes before stop, all footage is lost** — there's no incremental persistence.

Output files go to the browser's Downloads folder as `screen_<participantId>_<timestamp>.webm` and `webcam_<participantId>_<timestamp>.webm`. WebGazer gaze data and section-transition data are saved to localStorage by `useWebGazer` and `useGazeSectionTracker`.

## Theming

The `experiment-theme` body class (defined in [src/styles/globals.css](src/styles/globals.css)) flips the page background to black. The `useExperimentTheme()` hook adds/removes this class while a page is mounted; it's currently used by `training.tsx` and `player.tsx` so only those screens go dark while other pages stay white.

## Backend structure

Standard Express layout under `server/src/`:
- `routes/` — thin Express routers per resource
- `controllers/` — request handlers (validation + Prisma calls)
- `middleware/` — JWT auth
- `config/` — Prisma client singleton
- `utils/` — helpers (e.g. CSV export via json2csv)

Auth is JWT bearer tokens issued at login. Researcher-only endpoints (`/users/all`, `/sessions/all`, `/events/all`, `/analytics/*`) currently have no admin gate — see `server/README.md` security notes.

## Deployment notes (from README)

The app is deployed at http://codes.cs.vt.edu fronted by nginx on a VM. The "Full Startup Procedure" in [README.md](README.md) (screen sessions for backend on 5001 + frontend on 3000 + nginx) describes the production setup. Local dev uses port **3001** for the backend, not 5001 — don't confuse the two.
