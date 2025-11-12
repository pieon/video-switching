# Quick Start Guide - Video Switching Research Study

## ✅ System is Ready!

Your complete research study application is now fully set up and running!

### What's Been Installed:
- ✅ PostgreSQL 18 database
- ✅ Backend API (Node.js/Express/Prisma)
- ✅ Frontend with authentication & tracking
- ✅ Test participants (P001-P004)

## Current Status

**Backend Server**: Running on http://localhost:3001
**Database**: PostgreSQL running with tables created
**Test Participants**: 4 participants pre-loaded

### Test Participants:
- **P001** - Switching mode
- **P002** - Non-switching mode
- **P003** - Switching mode
- **P004** - Non-switching mode

## How to Use the System

### Start the Application

**Terminal 1 - Backend** (Already running):
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend**:
```bash
npm run dev
```

Then open: http://localhost:5173

### Login Flow

1. Enter participant ID (e.g., **P001**)
2. Click "Start Study"
3. You'll be assigned to your pre-configured condition
4. Select videos and start watching!

### What Gets Tracked Automatically:

✅ **Play Events** - When video starts
✅ **Pause Events** - When video pauses (with duration)
✅ **Switch Events** - When switching videos (switching mode only)
✅ **Complete Events** - When video finishes
✅ **Playback Position** - Position in video for all events
✅ **Timestamps** - Exact time of each event

All data is automatically saved to PostgreSQL database!

## Managing Participants

### Create New Participant

**Option 1: Prisma Studio (Recommended)**
```bash
cd server
npm run prisma:studio
```
- Opens at http://localhost:5555
- Click "User" table → "Add record"
- Enter participantId and condition
- Click "Save 1 change"

**Option 2: API Call**
```bash
curl -X POST http://localhost:3001/api/users/create \
  -H "Content-Type: application/json" \
  -d '{
    "participantId": "P005",
    "condition": "switching"
  }'
```

### View Participant List
```bash
curl http://localhost:3001/api/users/all
```

## Exporting Data for Analysis

### Export as CSV

```bash
# Export all events (main analysis file)
curl "http://localhost:3001/api/analytics/export?type=events" > events.csv

# Export sessions
curl "http://localhost:3001/api/analytics/export?type=sessions" > sessions.csv

# Export participants
curl "http://localhost:3001/api/analytics/export?type=participants" > participants.csv
```

### View Statistics

```bash
curl http://localhost:3001/api/analytics/stats
```

### CSV Columns in events.csv:

- `participant_id` - Participant identifier
- `condition` - switching or non_switching
- `event_type` - play, pause, switch, complete
- `timestamp` - When event occurred
- `duration_seconds` - Pause duration (for pause events)
- `playback_position` - Position in video
- `from_video_id` - Source video (for switches)
- `to_video_id` - Target video (for switches)
- `video_id` - Current video
- `session_id` - Unique session identifier

## Testing the System

### Test the Login
1. Open http://localhost:5173
2. Enter **P001**
3. Should login successfully and show switching mode

### Test Event Tracking
1. Select a video
2. Watch for a few seconds
3. Pause the video
4. Resume playing
5. Complete the video

### Verify Data Was Saved
```bash
# Check events were recorded
curl "http://localhost:3001/api/analytics/stats"
```

Or use Prisma Studio:
```bash
cd server
npm run prisma:studio
```
- Open http://localhost:5555
- Click "VideoEvent" table
- You should see your tracked events!

## Database Management

### View Database
```bash
cd server
npm run prisma:studio
```

### Reset Database (WARNING: Deletes all data)
```bash
cd server
npx prisma migrate reset
npm run prisma:seed  # Re-add test participants
```

### Backup Database
```bash
pg_dump -U jaehoonpyon video_switching > backup.sql
```

### Restore Database
```bash
psql -U jaehoonpyon video_switching < backup.sql
```

## Troubleshooting

### Backend won't start
- Check PostgreSQL is running: `brew services list`
- Check .env file exists in server directory
- Check DATABASE_URL in server/.env

### Frontend can't connect to backend
- Ensure backend is running on port 3001
- Check VITE_API_URL in .env (root directory)
- Check browser console for errors

### Login fails
- Verify participant exists: `npm run prisma:studio`
- Check backend logs in terminal
- Try with test participants: P001, P002, P003, P004

### No events being tracked
- Check browser console for errors
- Verify backend is running
- Check network tab in browser dev tools

## File Structure

```
video-switching/
├── server/               # Backend API
│   ├── src/
│   │   ├── controllers/ # Business logic
│   │   ├── routes/      # API endpoints
│   │   ├── middleware/  # Authentication
│   │   └── server.js    # Entry point
│   ├── prisma/
│   │   └── schema.prisma # Database schema
│   └── .env             # Backend config
│
├── src/                 # Frontend
│   ├── services/
│   │   └── trackingService.ts # API client
│   └── App.tsx          # Main app
│
└── .env                 # Frontend config
```

## API Endpoints

### Public
- `POST /api/users/login` - Participant login

### Authenticated (require login)
- `POST /api/sessions/start` - Start video session
- `PUT /api/sessions/:id/complete` - Complete session
- `POST /api/events/track` - Track event
- `POST /api/events/track-batch` - Batch track events

### Researcher
- `POST /api/users/create` - Create participant
- `GET /api/users/all` - List participants
- `GET /api/analytics/export` - Export CSV
- `GET /api/analytics/stats` - Get statistics

## Next Steps

1. ✅ Test with a few participants
2. ✅ Review exported CSV structure
3. ✅ Plan statistical analysis
4. ✅ Create more participants as needed
5. ✅ Begin data collection!

## Support

- **Backend logs**: Check terminal running `npm run dev` in server/
- **Frontend logs**: Check browser console (F12)
- **Database**: Use `npm run prisma:studio` in server/
- **Full guide**: See SETUP.md

# New Features Added - Video Switching Research Study

## Summary

All researcher features have been integrated into the frontend with a complete UI. No more terminal commands needed!

---

## ✅ Feature 1: Create New Participant (Login Page)

**Location**: Login Page (http://localhost:5173)

### How to Use:
1. On the login page, you'll see a section labeled **"Researcher: Create Participant"**
2. Click the **"Create New"** button
3. Enter the new Participant ID (e.g., P005)
4. Select the condition: **Switching Mode** or **Non-Switching Mode**
5. Click **"Create Participant"**
6. Success message will appear and the form will reset

### Features:
- Real-time validation
- Duplicate participant ID detection
- Success/error messages
- Auto-closes after successful creation

**What Replaced:**
```bash
# OLD WAY (Terminal):
curl -X POST http://localhost:3001/api/users/create \
  -H "Content-Type: application/json" \
  -d '{"participantId": "P005", "condition": "switching"}'

# NEW WAY: Use the UI form on the login page ✨
```

---

## ✅ Feature 2: Researcher Dashboard (View Participants)

**Location**: Accessible from Login Page

### How to Access:
1. On the login page, click the **"Researcher Dashboard"** button at the bottom
2. Opens the full Researcher Dashboard

### Participant List Features:
- View all participants in a table format
- See participant IDs, conditions, session counts, and creation dates
- Color-coded condition badges:
  - **Blue badge**: Switching mode
  - **Yellow badge**: Non-Switching mode
- **Refresh button** to reload data
- Shows total participant count

### Information Displayed:
- **Participant ID**: Unique identifier
- **Condition**: Switching or Non-Switching
- **Sessions**: Number of video sessions completed
- **Created**: Date participant was added

**What Replaced:**
```bash
# OLD WAY (Terminal):
curl http://localhost:3001/api/users/all

# NEW WAY: Click "Researcher Dashboard" button ✨
```

---

## ✅ Feature 3: CSV Data Export (Researcher Dashboard)

**Location**: Researcher Dashboard

### Export Options:

#### 1. Export Events
- **Button**: Blue "Export Events" button
- **File**: `events_export.csv`
- **Contains**: All tracked events (play, pause, switch, complete) with timestamps
- **Best for**: Detailed event-level analysis

#### 2. Export Sessions
- **Button**: Green "Export Sessions" button
- **File**: `sessions_export.csv`
- **Contains**: Video viewing sessions with start/end times
- **Best for**: Session-level analysis, completion rates

#### 3. Export Participants
- **Button**: Yellow "Export Participants" button
- **File**: `participants_export.csv`
- **Contains**: Participant list with conditions and session counts
- **Best for**: Demographic overview, participant summary

### How to Use:
1. Go to Researcher Dashboard
2. Click any of the three export buttons
3. CSV file will automatically download to your Downloads folder
4. Open in Excel, R, Python, SPSS, or any statistical software

**What Replaced:**
```bash
# OLD WAY (Terminal):
curl "http://localhost:3001/api/analytics/export?type=events" > events.csv
curl "http://localhost:3001/api/analytics/export?type=sessions" > sessions.csv
curl "http://localhost:3001/api/analytics/export?type=participants" > participants.csv

# NEW WAY: Click the export buttons in the UI ✨
```

---

## ✅ Bonus Feature: Logout Functionality

**Available On**: All pages after login

### Logout Locations:

#### 1. Admin/Settings Page
- **Top-right corner**: Red "Logout" button
- Also shows current participant info

#### 2. Player Page (Video Watching)
- **Top-right corner**: Red "Logout" button next to Settings
- Shows participant ID below the header

### What Happens on Logout:
- Clears authentication token
- Returns to login page
- Clears session data
- Allows switching to different participant

---

## Complete User Flow

### For Researchers:

```
Login Page
    ↓
    ├─→ [Create Participant] → Fill form → Participant created
    │
    └─→ [Researcher Dashboard]
            ↓
            ├─→ View Participants Table
            │     • See all participants
            │     • Check session counts
            │     • Refresh data
            │
            └─→ Export Data
                  • Export Events CSV
                  • Export Sessions CSV
                  • Export Participants CSV
```

### For Participants:

```
Login Page
    ↓
    Enter Participant ID → Login
    ↓
Settings Page
    • See assigned condition
    • Choose mode (auto-filled)
    • [Logout] button available
    ↓
    Start Video Player
    ↓
Player Page
    • Watch videos
    • All events tracked automatically
    • [Settings] and [Logout] buttons available
```

---

## Page Navigation Map

```
┌─────────────────────┐
│    Login Page       │
│ ─────────────────   │
│ • Participant Login │
│ • Create Participant│
│ • Researcher Button │
└──────────┬──────────┘
           │
           ├────────────────┐
           │                │
           ▼                ▼
┌──────────────────┐  ┌─────────────────────┐
│  Settings Page   │  │ Researcher Dashboard│
│ ──────────────   │  │ ──────────────────  │
│ • User Info      │  │ • Participant List  │
│ • Mode Selection │  │ • Export Buttons    │
│ • [Logout]       │  │ • [Back to Login]   │
└────────┬─────────┘  └─────────────────────┘
         │
         ▼
┌──────────────────┐
│   Player Page    │
│ ──────────────── │
│ • Video Player   │
│ • Event Tracking │
│ • [Settings]     │
│ • [Logout]       │
└──────────────────┘
```

---

## Key Benefits

### ✅ No More Terminal Commands
All researcher tasks now have UI buttons and forms

### ✅ User-Friendly
Intuitive interface with clear labels and feedback

### ✅ Error Handling
Validation, error messages, and success confirmations

### ✅ Real-Time Data
Participant list refreshes, session counts update

### ✅ Easy Data Export
One-click CSV downloads for analysis

### ✅ Secure Logout
Participants can easily switch users

---

## Quick Reference

| Task | Old Way (Terminal) | New Way (UI) |
|------|-------------------|--------------|
| Create Participant | `curl` command | Form on Login Page |
| View Participants | `curl` command | Researcher Dashboard |
| Export Events | `curl` to file | Blue Export Button |
| Export Sessions | `curl` to file | Green Export Button |
| Export Participants | `curl` to file | Yellow Export Button |
| Switch Users | Clear localStorage | Logout Button |

---

## Testing the New Features

### Test Checklist:

**Login Page:**
- [ ] Can create new participant
- [ ] Form validates duplicate IDs
- [ ] Success message appears
- [ ] Can access Researcher Dashboard

**Researcher Dashboard:**
- [ ] Participant table loads
- [ ] Shows correct participant data
- [ ] Export Events button downloads CSV
- [ ] Export Sessions button downloads CSV
- [ ] Export Participants button downloads CSV
- [ ] Back button returns to login

**Settings Page:**
- [ ] Shows current participant ID
- [ ] Logout button works
- [ ] Returns to login after logout

**Player Page:**
- [ ] Shows participant ID
- [ ] Logout button works
- [ ] Settings button works

---

## Technical Details

### New Components Added:
1. **LoginPage enhancements**:
   - Create Participant form
   - Researcher Dashboard button

2. **ResearcherPage** (new):
   - Participant list table
   - CSV export functionality

3. **Logout buttons**:
   - AdminPage header
   - PlayerPage header

### API Endpoints Used:
- `POST /api/users/create` - Create participant
- `GET /api/users/all` - Fetch participant list
- `GET /api/analytics/export?type=events` - Export events
- `GET /api/analytics/export?type=sessions` - Export sessions
- `GET /api/analytics/export?type=participants` - Export participants

### State Management:
- Added "researcher" page type
- Logout clears all authentication state
- CSV downloads use blob URL technique

---

## Screenshots Guide

### 1. Login Page
- Participant login form at top
- Create Participant section in middle
- Researcher Dashboard button at bottom

### 2. Researcher Dashboard
- Export buttons at top (3 colorful buttons)
- Participant table below
- Refresh button on table

### 3. Settings Page
- Logout button in top-right
- User info box (blue) below header
- Mode selection radios

### 4. Player Page
- Participant ID shown in header
- Settings and Logout buttons in top-right
- Video player and controls below

---

## What's Next?

Your research study app is now **fully functional** with a complete UI!

You can:
1. ✅ Create participants through the UI
2. ✅ View all participants in a dashboard
3. ✅ Export data with one click
4. ✅ Log out and switch between users
5. ✅ Track all video interactions automatically

**All researcher tasks are now just clicks away!** 🎉

How to kill all

Here are the commands to manually kill the server and frontend: Option 1: Kill by port number
# Kill backend (port 3001)
lsof -ti:3001 | xargs kill -9

# Kill frontend (port 5173)
lsof -ti:5173 | xargs kill -9
Option 2: Kill all node processes (use with caution)
killall -9 node
Option 3: If running in terminals (easiest)
Press Ctrl+C in the terminal window where each server is running
To check what's running on a port:
# Check backend port
lsof -ti:3001

# Check frontend port
lsof -ti:5173
To see detailed info about what's running:
lsof -i:3001
lsof -i:5173
The first option is the safest - it only kills processes on specific ports. The killall command will terminate ALL node processes on your system, so only use it if you're sure you want to stop everything Node-related.