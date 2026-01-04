# Deployment Guide for codes.cs.vt.edu

## Prerequisites
- SSH access to codes.cs.vt.edu
- Node.js installed on the server
- Your project files

## Deployment Steps

### 1. Upload Files to Server

```bash
# From your local machine, upload the project
# Replace 'sangwonlee' with your VT username
rsync -avz --exclude 'node_modules' \
  --exclude '.next' \
  --exclude 'server/prisma/video_switching.db' \
  /Users/jaehoonpyon/Documents/GitHub/video-switching/ \
  sangwonlee@codes.cs.vt.edu:~/video-switching/
```

### 2. SSH into Server

```bash
ssh sangwonlee@codes.cs.vt.edu
```

### 3. Set Up Backend

```bash
cd ~/video-switching/server

# Install dependencies
npm install

# Copy production environment
cp .env.production .env

# IMPORTANT: Generate a secure JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copy the output and update JWT_SECRET in .env

# Generate Prisma Client
npx prisma generate

# Create database with migrations
npx prisma migrate deploy
```

### 4. Set Up Frontend

```bash
cd ~/video-switching

# Install dependencies
npm install

# Build for production
npm run build
```

### 5. Install PM2 (Process Manager)

PM2 keeps your apps running even after you log out:

```bash
# Install PM2 globally
npm install -g pm2
```

### 6. Start Backend with PM2

```bash
cd ~/video-switching/server

# Start backend on port 5001
pm2 start npm --name "video-backend" -- start

# Save PM2 process list
pm2 save
```

### 7. Start Frontend with PM2

```bash
cd ~/video-switching

# Start frontend on port 3000 (Next.js default)
pm2 start npm --name "video-frontend" -- start

# Save PM2 process list
pm2 save
```

### 8. Verify Deployment

```bash
# Check PM2 status
pm2 status

# Check logs if needed
pm2 logs video-backend
pm2 logs video-frontend

# Test endpoints
curl http://localhost:5001/health
curl http://localhost:3000
```

## Access Your Website

- **Frontend**: http://codes.cs.vt.edu:3000
- **Backend API**: http://codes.cs.vt.edu:5001/api

**Note**: You may need to configure the server's firewall or web server (Apache/Nginx) to route http://codes.cs.vt.edu to port 3000.

## Useful PM2 Commands

```bash
# View all processes
pm2 status

# View logs
pm2 logs

# Restart a process
pm2 restart video-backend
pm2 restart video-frontend

# Stop a process
pm2 stop video-backend

# Delete a process
pm2 delete video-backend

# Restart all processes
pm2 restart all

# Stop all processes
pm2 stop all
```

## Updating Your Deployment

When you make changes:

```bash
# 1. Upload new files from local machine
rsync -avz --exclude 'node_modules' --exclude '.next' \
  /Users/jaehoonpyon/Documents/GitHub/video-switching/ \
  sangwonlee@codes.cs.vt.edu:~/video-switching/

# 2. SSH into server
ssh sangwonlee@codes.cs.vt.edu

# 3. Rebuild frontend (if frontend changed)
cd ~/video-switching
npm run build
pm2 restart video-frontend

# 4. Restart backend (if backend changed)
cd ~/video-switching/server
npm install  # if package.json changed
pm2 restart video-backend
```

## Troubleshooting

### Port Already in Use
If you get "port already in use" errors:

```bash
# Find what's using the port
lsof -i :5001  # for backend
lsof -i :3000  # for frontend

# Kill the process
kill -9 <PID>
```

### Database Issues
```bash
cd ~/video-switching/server

# Reset database (WARNING: deletes all data)
rm -f prisma/video_switching.db
npx prisma migrate deploy

# Check database
sqlite3 prisma/video_switching.db "SELECT COUNT(*) FROM users;"
```

### View Application Logs
```bash
pm2 logs video-backend --lines 100
pm2 logs video-frontend --lines 100
```

## Production Checklist

Before going live:
- [ ] Update JWT_SECRET in server/.env with a secure random key
- [ ] Set NODE_ENV=production in server/.env
- [ ] Test all API endpoints
- [ ] Test frontend on the server
- [ ] Set up PM2 to start on server reboot: `pm2 startup`
- [ ] Back up your database file regularly
