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
