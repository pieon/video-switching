# Video Switching Research Study

A Next.js application for conducting video-watching behavior research with two experimental conditions.

## Start Deployed Website

To Access Your Website
Open a web browser (on any computer) and go to:

http://codes.cs.vt.edu
That's it! If the SELinux fix worked, your website should load.
If It's Still Not Working
Make sure you've applied the SELinux fix first:

### Run this on your VM
sudo setsebool -P httpd_can_network_connect 1
sudo systemctl restart nginx
Then try accessing http://codes.cs.vt.edu again.
Full Startup Procedure (For Future Reference)
If you need to start everything from scratch (after a reboot, for example):

### 1. Start Backend Server
screen
cd /path/to/video-switching/server
npm start
#### Wait for "Server running on http://localhost:5001"
ctrl+a ctrl+d  # Detach from screen

### 2. Start Frontend Server
screen
cd /path/to/video-switching
npm start
#### Wait for "Ready on http://localhost:3000"
ctrl+a ctrl+d  # Detach from screen

### 3. Ensure Nginx is Running
sudo systemctl start nginx
sudo systemctl status nginx

### 4. Access in Browser
http://codes.cs.vt.edu
Current Status Check
Run this to see what's currently running:

#### Check services
sudo netstat -tlnp | grep -E '3000|5001'

#### Check nginx
sudo systemctl status nginx

#### Check screens
screen -ls
Everything looks good based on your previous output, so just open your browser and navigate to http://codes.cs.vt.edu - it should work now! Does the website load when you visit that URL?

## 🚀 Quick Test Start

### 1. Start Backend
```bash
cd server
npm run dev
```
Backend runs on **port 3001**

### 2. Start Frontend
```bash
npm run dev
```
Frontend runs on **http://localhost:3000**

### 3. Environment Setup
Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## 📦 Component Structure

### Pages (`pages/`)
- **index.tsx** - Login page where participants enter their ID
- **admin.tsx** - Settings page to select viewing mode (switching/non-switching)
- **player.tsx** - Video player page with event tracking
- **researcher.tsx** - Dashboard to view participants and export data as CSV

### UI Components (`src/components/ui/`)
- **Button** - Reusable button with variants (primary, secondary, danger, warning)
- **Input** - Form input field with validation
- **Card** - Container component for consistent styling
- **Alert** - Message display for errors/success/info

### Layout Components (`src/components/layout/`)
- **Header** - Page header with navigation, user info, and logout
- **PageLayout** - Wrapper for consistent page structure

### Form Components (`src/components/forms/`)
- **LoginForm** - Handles participant login with ID validation

### Video Components (`src/components/video/`)
- **VideoPlayer** - Main video player with custom controls and event tracking
- **VideoThumbnail** - Individual video thumbnail for selection
- **VideoGrid** - Grid layout displaying all available videos

### Hooks (`src/hooks/`)
- **useSession** - Manages video session state (completed videos, playback positions)

### Context (`src/context/`)
- **AuthContext** - Global authentication and user state management

### Services (`src/services/`)
- **trackingService** - API client for authentication and event tracking

## 📊 Database

PostgreSQL database with three tables:
- **users** - Participant information and assigned condition
- **video_sessions** - Video viewing sessions
- **video_events** - Detailed event tracking (play, pause, switch, complete)

## 🔧 Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run export       # Export as static site
```

## 📝 Creating a Participant

### Option 1: Via Researcher Dashboard
1. Go to http://localhost:3000/researcher
2. Create participant with ID and condition
3. Participant can now login

### Option 2: Via API
```bash
curl -X POST http://localhost:3001/api/users/create \
  -H "Content-Type: application/json" \
  -d '{"participantId":"P001","condition":"switching"}'
```

## 🎥 Video Modes

### Switching Mode
- Full video controls available
- Can switch between videos freely
- Can seek forward/backward
- Playback speed control enabled

### Non-Switching Mode
- Limited controls (play/pause only)
- Cannot switch to another video until current one is completed
- Cannot seek forward (prevents skipping)
- No playback speed control

## 📊 Data Export

Researcher dashboard provides three CSV export options:
1. **Events CSV** - All tracked events (play, pause, switch, complete)
2. **Sessions CSV** - Video session data with start/end times
3. **Participants CSV** - Participant list with conditions and session counts

## 🏗️ Tech Stack

- **Frontend**: Next.js 16, React 18, TypeScript
- **Backend**: Node.js, Express
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT tokens
