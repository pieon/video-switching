# Video Switching Research Study

A Next.js application for conducting video-watching behavior research with two experimental conditions.

## 🚀 Quick Start

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
