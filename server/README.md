# Video Switching Research Study - Backend Server

Backend API for tracking video-watching behavior in a research study.

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

### 1. Install PostgreSQL

**macOS (using Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**macOS (using Postgres.app):**
- Download from: https://postgresapp.com/
- Open the app and click "Initialize"

**Windows:**
- Download from: https://www.postgresql.org/download/windows/
- Run the installer and follow the setup wizard

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Create Database

```bash
# Access PostgreSQL
psql postgres

# Create database
CREATE DATABASE video_switching;

# Create user (optional, or use existing postgres user)
CREATE USER your_username WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE video_switching TO your_username;

# Exit
\q
```

### 3. Install Dependencies

```bash
cd server
npm install
```

### 4. Configure Environment

```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your settings
nano .env
```

Update your `.env` file:
```env
DATABASE_URL="postgresql://your_username:your_password@localhost:5432/video_switching?schema=public"
PORT=3001
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

### 5. Run Database Migrations

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations to create tables
npm run prisma:migrate

# (Optional) Seed database with test participants
npm run prisma:seed
```

## Running the Server

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will run on `http://localhost:3001`

## API Endpoints

### Health Check
- `GET /health` - Check if server is running

### User Management
- `POST /api/users/create` - Create a new participant (researcher)
- `POST /api/users/login` - Login with participant ID
- `GET /api/users/me` - Get current user info (requires auth)
- `GET /api/users/all` - Get all participants (researcher)

### Session Management
- `POST /api/sessions/start` - Start a new video session (requires auth)
- `PUT /api/sessions/:sessionId/complete` - Mark session as complete (requires auth)
- `GET /api/sessions/my-sessions` - Get user's sessions (requires auth)
- `GET /api/sessions/all` - Get all sessions (researcher)

### Event Tracking
- `POST /api/events/track` - Track a single event (requires auth)
- `POST /api/events/track-batch` - Track multiple events (requires auth)
- `GET /api/events/session/:sessionId` - Get events for a session (requires auth)
- `GET /api/events/all` - Get all events (researcher)

### Analytics
- `GET /api/analytics/export?type=events` - Export data as CSV (types: events, sessions, participants)
- `GET /api/analytics/stats` - Get aggregated statistics
- `GET /api/analytics/participant/:participantId` - Get participant-specific stats

## Database Schema

### Users
- `id`: UUID (Primary Key)
- `participantId`: Unique participant identifier
- `condition`: "switching" or "non_switching"
- `createdAt`: Timestamp

### VideoSessions
- `id`: UUID (Primary Key)
- `userId`: Foreign Key to Users
- `videoId`: Video identifier
- `mode`: Session mode
- `startedAt`: Timestamp
- `completedAt`: Timestamp (nullable)

### VideoEvents
- `id`: UUID (Primary Key)
- `sessionId`: Foreign Key to VideoSessions
- `eventType`: "play", "pause", "switch", or "complete"
- `timestamp`: Timestamp
- `duration`: Duration in seconds (for pause events)
- `fromVideoId`: Source video (for switch events)
- `toVideoId`: Target video (for switch events)
- `playbackPosition`: Position in video when event occurred

## Usage Examples

### 1. Create a Participant (Researcher)
```bash
curl -X POST http://localhost:3001/api/users/create \
  -H "Content-Type: application/json" \
  -d '{"participantId": "P001", "condition": "switching"}'
```

### 2. Participant Login
```bash
curl -X POST http://localhost:3001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"participantId": "P001"}'
```

Response includes JWT token to use for authenticated requests.

### 3. Start Video Session
```bash
curl -X POST http://localhost:3001/api/sessions/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"videoId": "a"}'
```

### 4. Track Event
```bash
curl -X POST http://localhost:3001/api/events/track \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "sessionId": "SESSION_ID",
    "eventType": "pause",
    "duration": 5.2,
    "playbackPosition": 45.8
  }'
```

### 5. Export Data (CSV)
```bash
# Export all events
curl http://localhost:3001/api/analytics/export?type=events > events.csv

# Export sessions
curl http://localhost:3001/api/analytics/export?type=sessions > sessions.csv

# Export participants
curl http://localhost:3001/api/analytics/export?type=participants > participants.csv
```

## Prisma Studio (Database GUI)

View and edit your database visually:
```bash
npm run prisma:studio
```

Opens at `http://localhost:5555`

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running: `brew services list` (macOS) or `sudo systemctl status postgresql` (Linux)
- Check your DATABASE_URL in `.env`
- Verify database exists: `psql -l`

### Migration Issues
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Generate Prisma Client again
npm run prisma:generate
```

### Port Already in Use
Change PORT in `.env` file to a different port.

## Development Tools

- **Prisma Studio**: Visual database browser
- **Thunder Client / Postman**: API testing
- **PostgreSQL CLI**: Direct database access with `psql`

## Security Notes

- Change JWT_SECRET in production
- Use strong passwords for database
- Implement rate limiting for production
- Add admin authentication for researcher endpoints
- Use HTTPS in production

## License

Research use only.
