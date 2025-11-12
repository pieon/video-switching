# Technical Documentation - Video Switching Research Study

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Authentication Flow](#authentication-flow)
3. [Data Flow](#data-flow)
4. [Database Schema](#database-schema)
5. [Frontend Architecture](#frontend-architecture)
6. [Backend Architecture](#backend-architecture)
7. [Event Tracking System](#event-tracking-system)
8. [Session Management](#session-management)
9. [Data Export](#data-export)
10. [API Reference](#api-reference)

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              React Frontend (Port 5173)                    │ │
│  │  - Login Component                                         │ │
│  │  - Admin Page (Mode Selection)                             │ │
│  │  - Player Page (Video Player + Event Tracking)             │ │
│  │  - Tracking Service (API Client + Event Queue)             │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST API
                              │ (JWT Authentication)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Express Backend (Port 3001)                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Routes Layer                                              │ │
│  │  - /api/users      - Authentication & User Management      │ │
│  │  - /api/sessions   - Video Session Lifecycle               │ │
│  │  - /api/events     - Event Tracking                        │ │
│  │  - /api/analytics  - Data Export & Statistics              │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Middleware Layer                                          │ │
│  │  - Authentication (JWT Verification)                       │ │
│  │  - CORS (Cross-Origin Resource Sharing)                    │ │
│  │  - Body Parsing (JSON)                                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Controllers Layer                                         │ │
│  │  - userController.js    - User business logic              │ │
│  │  - sessionController.js - Session management               │ │
│  │  - eventController.js   - Event processing                 │ │
│  │  - analyticsController.js - Data export & stats            │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Prisma ORM Layer                                          │ │
│  │  - Database abstraction                                    │ │
│  │  - Query builder                                           │ │
│  │  - Type safety                                             │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ SQL Queries
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PostgreSQL Database (Port 5432)               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Tables:                                                   │ │
│  │  - users            (Participants & their conditions)      │ │
│  │  - video_sessions   (Video viewing sessions)               │ │
│  │  - video_events     (All tracked events with timestamps)   │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- React 18 (TypeScript)
- Vite (Build tool)
- Native HTML5 Video Player
- Custom event tracking service

**Backend:**
- Node.js
- Express.js (Web framework)
- Prisma ORM (Database interface)
- JWT (Authentication)
- json2csv (CSV export)

**Database:**
- PostgreSQL 18
- Prisma schema for migrations

---

## Authentication Flow

### 1. Participant Login Process

```
┌──────────┐                    ┌──────────┐                    ┌──────────┐
│  User    │                    │ Frontend │                    │ Backend  │
│ Browser  │                    │  React   │                    │   API    │
└────┬─────┘                    └────┬─────┘                    └────┬─────┘
     │                               │                               │
     │ 1. Enter Participant ID       │                               │
     │ (e.g., "P001")                │                               │
     ├──────────────────────────────>│                               │
     │                               │                               │
     │                               │ 2. POST /api/users/login      │
     │                               │    { participantId: "P001" }  │
     │                               ├──────────────────────────────>│
     │                               │                               │
     │                               │                               │ 3. Query Database
     │                               │                               │    SELECT * FROM users
     │                               │                               │    WHERE participantId='P001'
     │                               │                               │
     │                               │                               │ 4. Generate JWT Token
     │                               │                               │    Payload: { userId: "uuid" }
     │                               │                               │    Secret: JWT_SECRET
     │                               │                               │
     │                               │ 5. Return token + user data   │
     │                               │ {                             │
     │                               │   token: "eyJhbGc...",        │
     │                               │   user: {                     │
     │                               │     id: "uuid",               │
     │                               │     participantId: "P001",    │
     │                               │     condition: "switching"    │
     │                               │   }                           │
     │                               │ }                             │
     │                               │<──────────────────────────────┤
     │                               │                               │
     │                               │ 6. Store token in:            │
     │                               │    - localStorage             │
     │                               │    - trackingService state    │
     │                               │                               │
     │ 7. Redirect to Admin Page     │                               │
     │    (with user's condition)    │                               │
     │<──────────────────────────────┤                               │
     │                               │                               │
```

### 2. Subsequent Authenticated Requests

All subsequent API requests include the JWT token:

```javascript
// Request Header
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// Backend Middleware Flow:
1. Extract token from Authorization header
2. Verify token signature using JWT_SECRET
3. Decode token to get userId
4. Query database to get full user object
5. Attach user to req.user
6. Allow request to proceed
```

**Example Authenticated Request:**
```
GET /api/users/me
Headers:
  Authorization: Bearer eyJhbGc...

Backend Process:
1. authenticate() middleware runs
2. Token verified → userId extracted
3. User fetched from database
4. req.user = { id, participantId, condition, createdAt }
5. Controller accesses req.user
```

---

## Data Flow

### Complete User Journey Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 1: LOGIN                                                           │
└─────────────────────────────────────────────────────────────────────────┘

User enters "P001" → Frontend → POST /api/users/login → Backend queries DB
→ Returns JWT + user data → Frontend stores token → Redirects to Admin Page

┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 2: START PLAYER                                                    │
└─────────────────────────────────────────────────────────────────────────┘

User clicks "Start Video Player" → Frontend changes page state to "player"
→ PlayerPage component mounts → Displays video thumbnails

┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 3: SELECT VIDEO                                                    │
└─────────────────────────────────────────────────────────────────────────┘

User clicks video thumbnail (e.g., "Lamp")
↓
Frontend: handleSelectVideo("a") called
↓
trackingService.startSession("a") called
↓
POST /api/sessions/start with { videoId: "a" }
↓
Backend:
  - Verifies JWT token
  - Gets user from req.user
  - Creates VideoSession record in database:
    {
      userId: "user-uuid",
      videoId: "a",
      mode: "switching",
      startedAt: "2024-11-11T21:00:00Z"
    }
  - Returns sessionId
↓
Frontend:
  - Stores currentSessionId in state
  - Sets current video to "a"
  - Player component receives video data
  - Video loads and auto-plays

┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 4: VIDEO PLAYS (Play Event)                                        │
└─────────────────────────────────────────────────────────────────────────┘

Video element fires onPlay event
↓
Frontend: onPlay callback triggered
↓
trackingService.trackPlay(sessionId, currentTime) called
↓
Event added to internal queue:
{
  sessionId: "session-uuid",
  eventType: "play",
  playbackPosition: 0.0,
  timestamp: "2024-11-11T21:00:05Z"
}
↓
Queue auto-flushes every 5 seconds OR when queue reaches 50 events
↓
POST /api/events/track-batch with array of queued events
↓
Backend:
  - Verifies JWT token
  - Validates sessionId belongs to user
  - Creates VideoEvent records in database
  - Returns success

┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 5: USER PAUSES VIDEO                                               │
└─────────────────────────────────────────────────────────────────────────┘

User clicks pause (at 15.3 seconds)
↓
Video element fires onPause event
↓
Frontend: onPause callback triggered
  - Records pauseStartTime = Date.now()
  - Sets wasPaused = true
↓
[Time passes while video is paused - 8 seconds]
↓
User clicks play again
↓
Video element fires onPlay event
↓
Frontend: onPlay callback triggered
  - Detects wasPaused = true
  - Calculates: pauseDuration = (Date.now() - pauseStartTime) / 1000 = 8.0
  - Calls onPauseEnd(currentTime)
↓
trackingService.trackPause(sessionId, 8.0, 15.3) called
↓
Event queued:
{
  sessionId: "session-uuid",
  eventType: "pause",
  duration: 8.0,
  playbackPosition: 15.3,
  timestamp: "2024-11-11T21:00:23Z"
}
↓
[Batched to backend later]

┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 6: USER SWITCHES VIDEO (Switching Mode Only)                       │
└─────────────────────────────────────────────────────────────────────────┘

User clicks different video thumbnail (e.g., "Bowl") at 30.5 seconds
↓
Frontend: handleSelectVideo("b") called
↓
trackingService.startSession("b") called
↓
POST /api/sessions/start with { videoId: "b" }
↓
Backend creates new session, returns new sessionId
↓
Frontend: Detects switch (previousVideo="a", newVideo="b")
↓
trackingService.trackSwitch(newSessionId, "a", "b", 30.5) called
↓
Event queued:
{
  sessionId: "new-session-uuid",
  eventType: "switch",
  fromVideoId: "a",
  toVideoId: "b",
  playbackPosition: 30.5,
  timestamp: "2024-11-11T21:01:00Z"
}
↓
Frontend:
  - Updates currentSessionId to new session
  - Changes current video to "b"
  - Player loads and plays new video

┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 7: VIDEO COMPLETES                                                 │
└─────────────────────────────────────────────────────────────────────────┘

Video plays to the end
↓
Video element fires onEnded event
↓
Frontend: onEnded callback triggered
↓
trackingService.trackComplete(sessionId, videoDuration) called
↓
Event queued:
{
  sessionId: "session-uuid",
  eventType: "complete",
  playbackPosition: 120.0,  // video duration
  timestamp: "2024-11-11T21:03:00Z"
}
↓
trackingService.completeSession(sessionId) called
↓
PUT /api/sessions/:sessionId/complete
↓
Backend:
  - Updates VideoSession record:
    {
      completedAt: "2024-11-11T21:03:00Z"
    }
↓
Frontend:
  - Marks video as completed in local state
  - Clears current session
  - Disables video thumbnail (can't rewatch)
  - Prompts user to select next video

┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 8: BACKGROUND - Event Queue Flush                                  │
└─────────────────────────────────────────────────────────────────────────┘

Every 5 seconds OR when 50 events in queue:
↓
trackingService.flush() called automatically
↓
POST /api/events/track-batch
Body: {
  events: [
    { sessionId, eventType: "play", playbackPosition, timestamp },
    { sessionId, eventType: "pause", duration, playbackPosition, timestamp },
    { sessionId, eventType: "switch", fromVideoId, toVideoId, playbackPosition, timestamp },
    { sessionId, eventType: "complete", playbackPosition, timestamp }
  ]
}
↓
Backend:
  - Validates all sessionIds belong to authenticated user
  - Creates multiple VideoEvent records in single transaction
  - Returns { count: 4, message: "4 events tracked successfully" }
↓
Frontend queue cleared
```

---

## Database Schema

### Tables and Relationships

```sql
-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id VARCHAR(255) UNIQUE NOT NULL,
  condition VARCHAR(50) NOT NULL,  -- 'switching' or 'non_switching'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Video Sessions Table
CREATE TABLE video_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id VARCHAR(255) NOT NULL,
  mode VARCHAR(50) NOT NULL,  -- 'switching' or 'non_switching'
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP NULL
);

-- Video Events Table
CREATE TABLE video_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES video_sessions(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,  -- 'play', 'pause', 'switch', 'complete'
  timestamp TIMESTAMP DEFAULT NOW(),
  duration FLOAT NULL,  -- For pause events (in seconds)
  from_video_id VARCHAR(255) NULL,  -- For switch events
  to_video_id VARCHAR(255) NULL,    -- For switch events
  playback_position FLOAT NULL      -- Position in video (in seconds)
);
```

### Relationship Diagram

```
┌──────────────────┐
│     users        │
│ ────────────     │
│ • id (PK)        │
│ • participantId  │◄──────────┐
│ • condition      │           │
│ • createdAt      │           │
└──────────────────┘           │
                               │ Foreign Key
                               │ (userId)
┌──────────────────┐           │
│ video_sessions   │           │
│ ────────────     │           │
│ • id (PK)        │           │
│ • userId (FK) ───┼───────────┘
│ • videoId        │◄──────────┐
│ • mode           │           │
│ • startedAt      │           │
│ • completedAt    │           │
└──────────────────┘           │ Foreign Key
                               │ (sessionId)
┌──────────────────┐           │
│  video_events    │           │
│ ────────────     │           │
│ • id (PK)        │           │
│ • sessionId (FK) ┼───────────┘
│ • eventType      │
│ • timestamp      │
│ • duration       │
│ • fromVideoId    │
│ • toVideoId      │
│ • playbackPosition│
└──────────────────┘
```

### Example Data

**users table:**
```
id                                   | participant_id | condition      | created_at
-------------------------------------|----------------|----------------|------------------------
550e8400-e29b-41d4-a716-446655440000 | P001          | switching      | 2024-11-11 10:00:00
660e8400-e29b-41d4-a716-446655440001 | P002          | non_switching  | 2024-11-11 10:05:00
```

**video_sessions table:**
```
id                                   | user_id                              | video_id | mode           | started_at           | completed_at
-------------------------------------|--------------------------------------|----------|----------------|----------------------|---------------------
770e8400-e29b-41d4-a716-446655440002 | 550e8400-e29b-41d4-a716-446655440000 | a        | switching      | 2024-11-11 14:00:00  | 2024-11-11 14:02:30
880e8400-e29b-41d4-a716-446655440003 | 550e8400-e29b-41d4-a716-446655440000 | b        | switching      | 2024-11-11 14:02:35  | NULL
```

**video_events table:**
```
id                                   | session_id                           | event_type | timestamp            | duration | from_video_id | to_video_id | playback_position
-------------------------------------|--------------------------------------|------------|----------------------|----------|---------------|-------------|------------------
990e8400-e29b-41d4-a716-446655440004 | 770e8400-e29b-41d4-a716-446655440002 | play       | 2024-11-11 14:00:05  | NULL     | NULL          | NULL        | 0.0
aa0e8400-e29b-41d4-a716-446655440005 | 770e8400-e29b-41d4-a716-446655440002 | pause      | 2024-11-11 14:00:45  | 12.5     | NULL          | NULL        | 30.2
bb0e8400-e29b-41d4-a716-446655440006 | 880e8400-e29b-41d4-a716-446655440003 | switch     | 2024-11-11 14:02:35  | NULL     | a             | b           | 150.0
cc0e8400-e29b-41d4-a716-446655440007 | 770e8400-e29b-41d4-a716-446655440002 | complete   | 2024-11-11 14:02:30  | NULL     | NULL          | NULL        | 150.0
```

---

## Frontend Architecture

### Component Hierarchy

```
App (Root Component)
├─ State Management:
│  ├─ page: "login" | "admin" | "player"
│  ├─ mode: "switching" | "non-switching"
│  └─ user: User | null
│
├─ LoginPage (page === "login")
│  ├─ Input for participant ID
│  ├─ Submit → calls trackingService.login()
│  └─ On success → triggers handleLogin(user)
│
├─ AdminPage (page === "admin")
│  ├─ Props: { user, onStart }
│  ├─ Displays user's assigned condition
│  ├─ Mode selection (pre-filled with user.condition)
│  └─ "Start Video Player" → triggers onStart(mode)
│
└─ PlayerPage (page === "player")
   ├─ Props: { mode, user, onBackToAdmin }
   ├─ State:
   │  ├─ currentSessionId: string | null
   │  ├─ pauseStartTime: number | null
   │  ├─ completed: string[] (video IDs)
   │  └─ current: string | null (current video ID)
   │
   ├─ useSession Hook:
   │  ├─ Manages video completion state
   │  ├─ Persists to localStorage
   │  └─ Provides: completed, current, setCurrent, markCompleted
   │
   ├─ Event Handlers:
   │  ├─ handleSelectVideo(id):
   │  │  ├─ Calls trackingService.startSession(id)
   │  │  ├─ Stores returned sessionId
   │  │  └─ Tracks switch event if applicable
   │  │
   │  ├─ onEnded():
   │  │  ├─ Tracks complete event
   │  │  ├─ Calls completeSession()
   │  │  └─ Marks video as completed
   │  │
   │  ├─ onPlay(position):
   │  │  ├─ Tracks play event
   │  │  └─ If resuming from pause, tracks pause end
   │  │
   │  └─ onPause(position):
   │     ├─ Records pauseStartTime
   │     └─ Sets wasPaused flag
   │
   └─ Player Component:
      ├─ Props: { mode, video, sessionId, onPlay, onPause, onPauseEnd, onEnded }
      ├─ Video element with event listeners
      ├─ Custom controls (non-switching mode):
      │  ├─ Play/Pause button
      │  └─ Fullscreen button
      └─ Native controls (switching mode)
```

### State Flow in Frontend

```javascript
// Global App State
const [page, setPage] = useState<Page>("login");
const [mode, setMode] = useState<Mode>("non-switching");
const [user, setUser] = useState<User | null>(null);

// PlayerPage Local State
const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
const [pauseStartTime, setPauseStartTime] = useState<number | null>(null);

// useSession Hook State
const [completed, setCompleted] = useState<string[]>([]);
const [current, setCurrent] = useState<string | null>(null);
const [playbackPositions, setPlaybackPositions] = useState<Record<string, number>>({});
```

### Tracking Service Architecture

```typescript
// src/services/trackingService.ts

class TrackingService {
  private token: string | null = null;
  private eventQueue: TrackingEvent[] = [];
  private flushInterval: number | null = null;
  private readonly FLUSH_INTERVAL_MS = 5000;
  private readonly MAX_QUEUE_SIZE = 50;

  // Authentication
  async login(participantId: string): Promise<{ token: string; user: User }>;
  setToken(token: string): void;
  getToken(): string | null;
  clearToken(): void;

  // Session Management
  async startSession(videoId: string): Promise<string>; // Returns sessionId
  async completeSession(sessionId: string): Promise<void>;

  // Event Tracking (adds to queue)
  trackEvent(event: TrackingEvent): void;
  trackPlay(sessionId: string, position: number): void;
  trackPause(sessionId: string, duration: number, position: number): void;
  trackSwitch(sessionId: string, from: string, to: string, position: number): void;
  trackComplete(sessionId: string, position: number): void;

  // Queue Management
  async flush(): Promise<void>; // Sends queued events to backend
  private startAutoFlush(): void; // Runs every 5 seconds
}
```

**Event Queue Mechanism:**

1. Events are added to in-memory queue when they occur
2. Queue auto-flushes every 5 seconds
3. Queue also flushes when it reaches 50 events
4. On page unload, remaining events are flushed
5. If flush fails (network error), events remain in queue for retry

---

## Backend Architecture

### Folder Structure

```
server/
├── src/
│   ├── controllers/          # Business logic
│   │   ├── userController.js
│   │   ├── sessionController.js
│   │   ├── eventController.js
│   │   └── analyticsController.js
│   │
│   ├── routes/               # Route definitions
│   │   ├── userRoutes.js
│   │   ├── sessionRoutes.js
│   │   ├── eventRoutes.js
│   │   └── analyticsRoutes.js
│   │
│   ├── middleware/           # Request processing
│   │   └── auth.js           # JWT verification
│   │
│   ├── config/               # Configuration
│   │   └── database.js       # Prisma setup
│   │
│   ├── utils/                # Utilities
│   │   └── jwt.js            # Token generation/verification
│   │
│   └── server.js             # Entry point
│
├── prisma/
│   ├── schema.prisma         # Database schema
│   ├── seed.js               # Test data
│   └── migrations/           # Migration files
│
├── .env                      # Environment variables
└── package.json              # Dependencies
```

### Request Processing Flow

```
Incoming Request
    │
    ├─> CORS Middleware
    │   └─> Checks origin, sets headers
    │
    ├─> Body Parser Middleware
    │   └─> Parses JSON body
    │
    ├─> Logging Middleware
    │   └─> Logs request method and path
    │
    ├─> Route Matching
    │   └─> Finds matching route handler
    │
    ├─> Authentication Middleware (if required)
    │   ├─> Extracts JWT from Authorization header
    │   ├─> Verifies token signature
    │   ├─> Decodes userId from token
    │   ├─> Queries database for user
    │   └─> Attaches user to req.user
    │
    ├─> Controller
    │   ├─> Validates request data
    │   ├─> Executes business logic
    │   ├─> Queries database via Prisma
    │   └─> Formats response
    │
    └─> Response Sent
```

### Controller Examples

**userController.js - Login**
```javascript
async function loginParticipant(req, res) {
  // 1. Extract participantId from request body
  const { participantId } = req.body;

  // 2. Validate input
  if (!participantId) {
    return res.status(400).json({ error: 'participantId required' });
  }

  // 3. Query database for user
  const user = await prisma.user.findUnique({
    where: { participantId }
  });

  // 4. Check if user exists
  if (!user) {
    return res.status(404).json({ error: 'Participant not found' });
  }

  // 5. Generate JWT token
  const token = generateToken({ userId: user.id });

  // 6. Return token and user data
  res.json({ token, user });
}
```

**sessionController.js - Start Session**
```javascript
async function startSession(req, res) {
  // 1. User already authenticated (req.user exists from middleware)
  const { videoId } = req.body;
  const userId = req.user.id;
  const mode = req.user.condition;

  // 2. Create session in database
  const session = await prisma.videoSession.create({
    data: {
      userId,
      videoId,
      mode
    }
  });

  // 3. Return session ID
  res.status(201).json({ session });
}
```

**eventController.js - Track Batch Events**
```javascript
async function trackBatchEvents(req, res) {
  const { events } = req.body;
  const userId = req.user.id;

  // 1. Validate all sessions belong to user
  const sessionIds = [...new Set(events.map(e => e.sessionId))];
  const sessions = await prisma.videoSession.findMany({
    where: {
      id: { in: sessionIds },
      userId
    }
  });

  if (sessions.length !== sessionIds.length) {
    return res.status(404).json({ error: 'Invalid sessions' });
  }

  // 2. Create all events in single transaction
  await prisma.videoEvent.createMany({
    data: events.map(event => ({
      sessionId: event.sessionId,
      eventType: event.eventType,
      duration: event.duration || null,
      fromVideoId: event.fromVideoId || null,
      toVideoId: event.toVideoId || null,
      playbackPosition: event.playbackPosition || null,
      timestamp: new Date(event.timestamp)
    }))
  });

  res.status(201).json({ count: events.length });
}
```

---

## Event Tracking System

### Event Types and Their Purposes

| Event Type | When Triggered | Data Collected | Research Value |
|------------|----------------|----------------|----------------|
| **play** | Video starts or resumes playing | • playbackPosition<br>• timestamp | • Engagement patterns<br>• Resume behavior |
| **pause** | User pauses video (measured on resume) | • duration (seconds paused)<br>• playbackPosition<br>• timestamp | • Attention span<br>• Content difficulty<br>• Engagement drops |
| **switch** | User switches to different video (switching mode only) | • fromVideoId<br>• toVideoId<br>• playbackPosition (where they stopped)<br>• timestamp | • Video preferences<br>• Switching patterns<br>• Content comparison |
| **complete** | Video plays to end | • playbackPosition (video duration)<br>• timestamp | • Completion rates<br>• Content effectiveness |

### Event Tracking Timeline Example

```
User watches "Lamp" video (120 seconds long) in switching mode:

Time    Action                  Event Tracked
────────────────────────────────────────────────────────────────────
0:00    Select "Lamp"          → Session started (sessionId: ABC)
0:01    Video starts playing   → play { position: 0.0 }
0:15    User pauses            → (pauseStartTime recorded)
0:23    User resumes (8s later)→ play { position: 15.0 }
                               → pause { duration: 8.0, position: 15.0 }
0:45    User switches to "Bowl"→ switch { from: "a", to: "b", position: 45.0 }
                               → New session started (sessionId: DEF)
1:00    "Bowl" starts playing  → play { position: 0.0 }
2:00    "Bowl" finishes        → complete { position: 60.0 }
                               → Session DEF completed

Database Result:
- 2 sessions (ABC incomplete, DEF completed)
- 5 events (2 play, 1 pause, 1 switch, 1 complete)
```

### Event Batching Strategy

**Why Batching?**
- Reduces network requests (better performance)
- Prevents overwhelming backend with individual requests
- Resilient to temporary network issues

**How It Works:**
```javascript
// In trackingService.ts
private eventQueue: TrackingEvent[] = [];

// When event occurs
trackPlay(sessionId, position) {
  this.eventQueue.push({
    sessionId,
    eventType: 'play',
    playbackPosition: position,
    timestamp: new Date().toISOString()
  });

  // Auto-flush if queue is full
  if (this.eventQueue.length >= 50) {
    this.flush();
  }
}

// Auto-flush every 5 seconds
setInterval(() => this.flush(), 5000);

// Flush sends all queued events
async flush() {
  if (this.eventQueue.length === 0) return;

  const eventsToSend = [...this.eventQueue];
  this.eventQueue = [];

  try {
    await fetch('/api/events/track-batch', {
      method: 'POST',
      body: JSON.stringify({ events: eventsToSend })
    });
  } catch (error) {
    // Re-add to queue if failed
    this.eventQueue.unshift(...eventsToSend);
  }
}
```

---

## Session Management

### Session Lifecycle

```
1. SESSION CREATED
   ├─> User selects video
   ├─> Frontend calls startSession(videoId)
   ├─> Backend creates VideoSession record
   │   • userId (from authenticated user)
   │   • videoId
   │   • mode (user's condition)
   │   • startedAt (timestamp)
   │   • completedAt (NULL)
   └─> Returns sessionId

2. SESSION ACTIVE
   ├─> Events tracked and associated with sessionId
   ├─> All play/pause/switch events reference this session
   └─> Session remains active until completed or abandoned

3. SESSION COMPLETED
   ├─> Video plays to end
   ├─> Frontend calls completeSession(sessionId)
   ├─> Backend updates VideoSession:
   │   • completedAt = current timestamp
   └─> Session closed

4. SESSION ABANDONED (Optional)
   └─> User switches video before completion
       └─> Previous session remains in database with completedAt = NULL
           (indicates user didn't finish this video)
```

### Session States

**Active Session:**
```json
{
  "id": "abc-123",
  "userId": "user-456",
  "videoId": "a",
  "mode": "switching",
  "startedAt": "2024-11-11T14:00:00Z",
  "completedAt": null
}
```

**Completed Session:**
```json
{
  "id": "abc-123",
  "userId": "user-456",
  "videoId": "a",
  "mode": "switching",
  "startedAt": "2024-11-11T14:00:00Z",
  "completedAt": "2024-11-11T14:02:30Z"
}
```

### Why Sessions Matter for Research

- **Track video engagement**: How long users spend per video
- **Completion analysis**: Which videos are completed vs abandoned
- **Temporal patterns**: Time of day effects, viewing duration
- **Switching behavior**: Frequency and patterns of video switching

---

## Data Export

### CSV Export Process

```
Researcher Requests CSV Export
    │
    ▼
GET /api/analytics/export?type=events
    │
    ▼
analyticsController.exportDataAsCSV()
    │
    ├─> Query database for all events
    │   SELECT e.*, s.*, u.*
    │   FROM video_events e
    │   JOIN video_sessions s ON e.session_id = s.id
    │   JOIN users u ON s.user_id = u.id
    │   ORDER BY e.timestamp
    │
    ├─> Flatten nested data structure
    │   Transform: event.session.user.participantId
    │   To: participant_id (single column)
    │
    ├─> Convert to CSV format using json2csv
    │   Headers: participant_id, condition, event_type, ...
    │
    └─> Stream CSV to response
        Content-Type: text/csv
        Content-Disposition: attachment; filename=events.csv
```

### CSV File Formats

**events.csv:**
```csv
event_id,participant_id,condition,session_id,video_id,event_type,timestamp,duration_seconds,from_video_id,to_video_id,playback_position,session_started_at,session_completed_at
990e8400...,P001,switching,770e8400...,a,play,2024-11-11T14:00:05Z,,,,,0.0,2024-11-11T14:00:00Z,2024-11-11T14:02:30Z
aa0e8400...,P001,switching,770e8400...,a,pause,2024-11-11T14:00:45Z,12.5,,,30.2,2024-11-11T14:00:00Z,2024-11-11T14:02:30Z
bb0e8400...,P001,switching,880e8400...,b,switch,2024-11-11T14:02:35Z,,a,b,150.0,2024-11-11T14:02:35Z,
```

**sessions.csv:**
```csv
session_id,participant_id,condition,video_id,mode,started_at,completed_at,event_count
770e8400...,P001,switching,a,switching,2024-11-11T14:00:00Z,2024-11-11T14:02:30Z,15
880e8400...,P001,switching,b,switching,2024-11-11T14:02:35Z,,8
```

**participants.csv:**
```csv
user_id,participant_id,condition,created_at,session_count
550e8400...,P001,switching,2024-11-11T10:00:00Z,23
660e8400...,P002,non_switching,2024-11-11T10:05:00Z,18
```

### Statistical Analysis Ready

**Loading into R:**
```r
# Load data
events <- read.csv("events.csv")
sessions <- read.csv("sessions.csv")
participants <- read.csv("participants.csv")

# Example analyses
# 1. Average pause duration by condition
aggregate(duration_seconds ~ condition, data=events[events$event_type=="pause",], mean)

# 2. Completion rate by condition
completion_rate <- aggregate(completed_at ~ condition, data=sessions,
                             function(x) sum(!is.na(x))/length(x))

# 3. Number of switches by participant
switches <- table(events$participant_id[events$event_type=="switch"])
```

**Loading into Python:**
```python
import pandas as pd

# Load data
events = pd.read_csv("events.csv")
sessions = pd.read_csv("sessions.csv")
participants = pd.read_csv("participants.csv")

# Example analyses
# 1. Average pause duration by condition
events[events['event_type']=='pause'].groupby('condition')['duration_seconds'].mean()

# 2. Completion rate by condition
sessions.groupby('condition')['completed_at'].apply(lambda x: x.notna().sum()/len(x))

# 3. Number of switches by participant
events[events['event_type']=='switch'].groupby('participant_id').size()
```

---

## API Reference

### Authentication Endpoints

#### POST /api/users/login
**Purpose:** Authenticate participant and receive JWT token

**Request:**
```json
{
  "participantId": "P001"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "participantId": "P001",
      "condition": "switching",
      "createdAt": "2024-11-11T10:00:00.000Z"
    }
  }
}
```

**Errors:**
- 400: Missing participantId
- 404: Participant not found

---

### User Management Endpoints

#### POST /api/users/create (Researcher)
**Purpose:** Create new participant

**Request:**
```json
{
  "participantId": "P005",
  "condition": "switching"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "participantId": "P005",
      "condition": "switching",
      "createdAt": "2024-11-11T..."
    }
  }
}
```

#### GET /api/users/me (Authenticated)
**Purpose:** Get current user information

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "participantId": "P001",
      "condition": "switching",
      "createdAt": "..."
    }
  }
}
```

---

### Session Endpoints

#### POST /api/sessions/start (Authenticated)
**Purpose:** Start new video session

**Request:**
```json
{
  "videoId": "a"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "session": {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "userId": "...",
      "videoId": "a",
      "mode": "switching",
      "startedAt": "2024-11-11T14:00:00.000Z",
      "completedAt": null
    }
  }
}
```

#### PUT /api/sessions/:sessionId/complete (Authenticated)
**Purpose:** Mark session as completed

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "session": {
      "id": "...",
      "completedAt": "2024-11-11T14:02:30.000Z"
    }
  }
}
```

---

### Event Tracking Endpoints

#### POST /api/events/track-batch (Authenticated)
**Purpose:** Track multiple events in single request

**Request:**
```json
{
  "events": [
    {
      "sessionId": "abc-123",
      "eventType": "play",
      "playbackPosition": 0.0,
      "timestamp": "2024-11-11T14:00:05Z"
    },
    {
      "sessionId": "abc-123",
      "eventType": "pause",
      "duration": 8.5,
      "playbackPosition": 30.2,
      "timestamp": "2024-11-11T14:00:45Z"
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "count": 2,
    "message": "2 events tracked successfully"
  }
}
```

---

### Analytics Endpoints

#### GET /api/analytics/export?type=events
**Purpose:** Export data as CSV

**Query Parameters:**
- `type`: "events" | "sessions" | "participants"

**Response:**
- Content-Type: text/csv
- Content-Disposition: attachment; filename=events.csv
- Body: CSV data

#### GET /api/analytics/stats
**Purpose:** Get aggregated statistics

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalUsers": 4,
      "totalSessions": 45,
      "totalEvents": 320,
      "switchingUsers": 2,
      "nonSwitchingUsers": 2
    },
    "events": {
      "byType": {
        "play": 120,
        "pause": 95,
        "switch": 80,
        "complete": 25
      },
      "totalSwitches": 80
    },
    "pauses": {
      "totalCount": 95,
      "totalDuration": 456.7,
      "averageDuration": 4.8
    },
    "sessions": {
      "total": 45,
      "completed": 25,
      "completionRate": "55.56"
    }
  }
}
```

---

## Security Considerations

### JWT Token Security
- Tokens expire after 7 days (configurable via JWT_EXPIRES_IN)
- Secret key stored in environment variable
- Tokens are stateless (no server-side session storage)

### API Security
- CORS restricted to frontend URL
- All sensitive endpoints require authentication
- SQL injection prevented by Prisma ORM (parameterized queries)
- Input validation on all endpoints

### Database Security
- Foreign key constraints prevent orphaned records
- ON DELETE CASCADE ensures data consistency
- UUIDs prevent ID enumeration attacks

---

## Performance Optimizations

### Frontend
- Event batching reduces API calls
- LocalStorage caching for session state
- Lazy loading of video thumbnails

### Backend
- Batch event insertion (single transaction)
- Database indexes on frequently queried columns
- Connection pooling via Prisma

### Database
- Indexes on:
  - users.participant_id (unique)
  - video_sessions.user_id (foreign key)
  - video_events.session_id (foreign key)
  - video_events.timestamp (for sorting)

---

## Error Handling

### Frontend Error Handling
```typescript
// Graceful degradation
try {
  await trackingService.trackPlay(sessionId, position);
} catch (error) {
  console.error("Failed to track event:", error);
  // Event queued for retry, app continues working
}
```

### Backend Error Handling
```javascript
// Consistent error responses
res.status(500).json({
  success: false,
  error: "Failed to track events"
});
```

### Network Failure Recovery
- Events remain in queue if network fails
- Auto-retry on next flush
- Page unload triggers final flush attempt

---

## Development Workflow

### Adding New Event Types

**1. Update Database Schema:**
```prisma
// prisma/schema.prisma
enum EventType {
  play
  pause
  switch
  complete
  seek  // NEW
}
```

**2. Run Migration:**
```bash
npm run prisma:migrate
```

**3. Update Frontend Tracking Service:**
```typescript
// trackingService.ts
trackSeek(sessionId: string, fromPosition: number, toPosition: number) {
  this.trackEvent({
    sessionId,
    eventType: 'seek',
    fromVideoId: fromPosition.toString(),
    toVideoId: toPosition.toString(),
    timestamp: new Date().toISOString()
  });
}
```

**4. Add Event Handler in Player:**
```typescript
onSeeking={() => {
  if (ref.current && currentSessionId) {
    trackingService.trackSeek(
      currentSessionId,
      previousPosition,
      ref.current.currentTime
    );
  }
}}
```

---

## Testing

### Manual Testing Checklist

**Authentication:**
- [ ] Login with valid participant ID
- [ ] Login with invalid participant ID (should fail)
- [ ] Token persists across page refresh

**Video Playback:**
- [ ] Video loads and plays
- [ ] Pause and resume works
- [ ] Video completion triggers events

**Event Tracking:**
- [ ] Play events recorded
- [ ] Pause events with correct duration
- [ ] Switch events (switching mode)
- [ ] Complete events

**Data Persistence:**
- [ ] Events visible in Prisma Studio
- [ ] Sessions created correctly
- [ ] CSV export contains all data

### Verification Queries

```sql
-- Check events for specific participant
SELECT * FROM video_events e
JOIN video_sessions s ON e.session_id = s.id
JOIN users u ON s.user_id = u.id
WHERE u.participant_id = 'P001'
ORDER BY e.timestamp;

-- Check completion rate
SELECT
  u.condition,
  COUNT(*) as total_sessions,
  SUM(CASE WHEN s.completed_at IS NOT NULL THEN 1 ELSE 0 END) as completed,
  ROUND(100.0 * SUM(CASE WHEN s.completed_at IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 2) as completion_rate
FROM video_sessions s
JOIN users u ON s.user_id = u.id
GROUP BY u.condition;
```

---

## Deployment Considerations

### Production Checklist
- [ ] Change JWT_SECRET to strong random value
- [ ] Use production PostgreSQL database
- [ ] Enable HTTPS
- [ ] Set NODE_ENV=production
- [ ] Configure proper CORS origins
- [ ] Set up database backups
- [ ] Monitor error logs
- [ ] Rate limiting on API endpoints

### Environment Variables

**Production .env:**
```env
DATABASE_URL="postgresql://user:pass@production-db:5432/video_switching?schema=public"
PORT=3001
NODE_ENV=production
JWT_SECRET=<strong-random-secret>
JWT_EXPIRES_IN=7d
CLIENT_URL=https://your-domain.com
```

---

This documentation provides a complete technical understanding of how the video switching research study application works, from user login to data export for statistical analysis.
