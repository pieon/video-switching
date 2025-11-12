# Video Switching Research Study - Complete Setup Guide

This guide will walk you through setting up the complete research study application.

## Overview

This application consists of two parts:
1. **Frontend**: React video player application
2. **Backend**: Node.js/Express API with PostgreSQL database

## Step 1: Install PostgreSQL

### macOS (Recommended: Homebrew)
```bash
# Install PostgreSQL
brew install postgresql@18

# Start PostgreSQL service
brew services start postgresql@18

# Create database
createdb video_switching
```

### macOS (Alternative: Postgres.app)
1. Download from https://postgresapp.com/
2. Open the app and click "Initialize"
3. Open the app and create a new database named `video_switching`

### Windows
1. Download from https://www.postgresql.org/download/windows/
2. Run installer and follow setup wizard
3. Remember your postgres password
4. Open SQL Shell (psql) and create database:
```sql
CREATE DATABASE video_switching;
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres createdb video_switching
```

## Step 2: Backend Setup

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### Edit `.env` file

Open `server/.env` and update with your settings:

```env
# Update with your PostgreSQL credentials
DATABASE_URL="postgresql://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/video_switching?schema=public"

PORT=3001
NODE_ENV=development
JWT_SECRET=your_super_secret_change_this_in_production
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

**For macOS Homebrew users:**
```env
DATABASE_URL="postgresql://YOUR_MAC_USERNAME@localhost:5432/video_switching?schema=public"
```

**For Postgres.app users:**
```env
DATABASE_URL="postgresql://postgres@localhost:5432/video_switching?schema=public"
```

### Run Database Migrations

```bash
# Generate Prisma Client
npm run prisma:generate

# Create database tables
npm run prisma:migrate
```

When prompted for migration name, enter: `init`

### (Optional) Seed Test Data

```bash
# Add test participants
npm run prisma:seed
```

This creates 4 test participants:
- P001 (switching mode)
- P002 (non-switching mode)
- P003 (switching mode)
- P004 (non-switching mode)

## Step 3: Frontend Setup

```bash
# Navigate to project root (from server directory)
cd ..

# Install frontend dependencies (if not already installed)
npm install

# Copy environment file
cp .env.example .env
```

### Edit `.env` file (frontend)

```env
VITE_API_URL=http://localhost:3001/api
```

## Step 4: Running the Application

### Terminal 1: Start Backend Server
```bash
cd server
npm run dev
```

You should see:
```
Database connected successfully
Server running on http://localhost:3001
```

### Terminal 2: Start Frontend
```bash
# From project root
npm run dev
```

You should see:
```
VITE ready at http://localhost:5173
```

## Step 5: Creating Participants (Researcher Workflow)

### Method 1: Using Prisma Studio (Recommended)
```bash
# In a new terminal, from server directory
npm run prisma:studio
```

1. Opens at http://localhost:5555
2. Click on "User" table
3. Click "Add record"
4. Fill in:
   - participantId: `P005` (or any unique ID)
   - condition: `switching` or `non_switching`
5. Click "Save 1 change"

### Method 2: Using API (cURL)
```bash
curl -X POST http://localhost:3001/api/users/create \
  -H "Content-Type: application/json" \
  -d '{
    "participantId": "P005",
    "condition": "switching"
  }'
```

### Method 3: Using API (Postman/Thunder Client)
- Method: POST
- URL: http://localhost:3001/api/users/create
- Body (JSON):
```json
{
  "participantId": "P005",
  "condition": "switching"
}
```

## Step 6: Participant Login

1. Open http://localhost:5173 in browser
2. You'll see a login screen
3. Enter a participant ID (e.g., `P001`)
4. Click "Start"
5. The video player will load with the assigned condition

## Step 7: Testing the Application

### Test Video Watching
1. Login with a participant ID
2. Select and watch a video
3. Pause the video (events are being tracked)
4. Switch between videos (if in switching mode)
5. Complete watching a video

### View Tracked Data

**Option 1: Prisma Studio**
```bash
cd server
npm run prisma:studio
```
Browse VideoSessions and VideoEvents tables

**Option 2: Get Statistics**
```bash
curl http://localhost:3001/api/analytics/stats
```

**Option 3: Export CSV**
```bash
# Export all events
curl "http://localhost:3001/api/analytics/export?type=events" > events.csv

# Export sessions
curl "http://localhost:3001/api/analytics/export?type=sessions" > sessions.csv

# Export participants
curl "http://localhost:3001/api/analytics/export?type=participants" > participants.csv
```

## What Gets Tracked?

### Automatic Event Tracking:
- ✅ **Play events**: When video starts playing
- ✅ **Pause events**: When video pauses (with duration)
- ✅ **Switch events**: When user switches videos (switching mode only)
- ✅ **Complete events**: When video finishes
- ✅ **Playback position**: Video position for all events
- ✅ **Timestamps**: Exact time of each event

### Metrics Collected:
- Number of video switches per participant
- Number of pauses per video
- Duration of each pause
- Video completion status
- Total watch time
- Viewing patterns

## Troubleshooting

### Database Connection Failed
1. Check if PostgreSQL is running:
   ```bash
   # macOS
   brew services list

   # Linux
   sudo systemctl status postgresql
   ```

2. Verify database exists:
   ```bash
   psql -l | grep video_switching
   ```

3. Check DATABASE_URL in `server/.env`

### Port Already in Use
- Backend (3001): Change PORT in `server/.env`
- Frontend (5173): Change port in `vite.config.ts` or kill process using port

### Migration Errors
```bash
cd server
npx prisma migrate reset  # WARNING: Deletes all data
npm run prisma:migrate
```

### Frontend Not Connecting to Backend
1. Check VITE_API_URL in `.env`
2. Ensure backend is running on http://localhost:3001
3. Check browser console for CORS errors

## Data Export for Analysis

### Export all data as CSV files:
```bash
# Navigate to a directory where you want to save files
cd ~/Desktop

# Export events (main analysis file)
curl "http://localhost:3001/api/analytics/export?type=events" > events.csv

# Export sessions
curl "http://localhost:3001/api/analytics/export?type=sessions" > sessions.csv

# Export participants
curl "http://localhost:3001/api/analytics/export?type=participants" > participants.csv
```

### Statistical Analysis

The CSV files can be imported into:
- **R**: `read.csv("events.csv")`
- **Python/Pandas**: `pd.read_csv("events.csv")`
- **SPSS**: File → Open → Data
- **Excel**: File → Open

### Key Variables in events.csv:
- `participant_id`: Unique participant identifier
- `condition`: switching or non_switching
- `event_type`: play, pause, switch, complete
- `timestamp`: When event occurred
- `duration_seconds`: Pause duration (for pause events)
- `playback_position`: Position in video
- `from_video_id` / `to_video_id`: For switch events

## Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment instructions (coming soon).

## Security Notes for Research

- Participant IDs should not contain identifiable information
- Use secure participant ID generation
- Back up database regularly
- Keep JWT_SECRET secure
- Do not commit `.env` files to version control

## Support

For issues:
1. Check console logs (backend terminal)
2. Check browser console (frontend)
3. Review Prisma Studio for database state
4. Check server logs

## File Structure

```
video-switching/
├── server/                 # Backend API
│   ├── src/
│   │   ├── controllers/   # Business logic
│   │   ├── routes/        # API endpoints
│   │   ├── middleware/    # Auth, etc.
│   │   ├── config/        # Database config
│   │   └── utils/         # JWT utilities
│   ├── prisma/
│   │   ├── schema.prisma  # Database schema
│   │   └── seed.js        # Test data
│   └── package.json
│
├── src/                   # Frontend React app
│   ├── services/
│   │   └── trackingService.ts  # API client
│   └── App.tsx           # Main application
│
└── README.md
```

## Next Steps

After setup:
1. ✅ Create your participant IDs
2. ✅ Test with a few participants
3. ✅ Review exported data structure
4. ✅ Plan your statistical analysis
5. ✅ Begin data collection

Good luck with your research!
