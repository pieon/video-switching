# Quick Deployment Guide

## Option 1: Automated Deployment (Recommended)

Run the deployment script from your local machine:

```bash
cd /Users/jaehoonpyon/Documents/GitHub/video-switching
./deploy.sh sangwonlee
```

Then SSH into the server and start the apps:

```bash
ssh sangwonlee@codes.cs.vt.edu
cd ~/video-switching

# Update JWT secret first!
cd server
nano .env  # Change JWT_SECRET to a random secure key

# Install PM2 if not installed
npm install -g pm2

# Start backend
pm2 start npm --name video-backend -- start

# Start frontend
cd ~/video-switching
pm2 start npm --name video-frontend -- start

# Save PM2 configuration
pm2 save
pm2 startup  # Follow the instructions to enable auto-start on reboot
```

## Option 2: Manual Deployment

### On Your Local Machine:

```bash
cd /Users/jaehoonpyon/Documents/GitHub/video-switching

# Build frontend
npm run build

# Upload to server (replace 'sangwonlee' with your username)
rsync -avz --exclude 'node_modules' --exclude '.git' \
  . sangwonlee@codes.cs.vt.edu:~/video-switching/
```

### On codes.cs.vt.edu Server:

```bash
# SSH into server
ssh sangwonlee@codes.cs.vt.edu

# Setup backend
cd ~/video-switching/server
npm install
cp .env.production .env
nano .env  # Update JWT_SECRET
npx prisma generate
npx prisma migrate deploy

# Setup frontend
cd ~/video-switching
npm install

# Install PM2
npm install -g pm2

# Start services
cd ~/video-switching/server
pm2 start npm --name video-backend -- start

cd ~/video-switching
pm2 start npm --name video-frontend -- start

# Save and enable auto-restart
pm2 save
pm2 startup
```

## Access Your Application

**If ports 3000 and 5001 are accessible:**
- Frontend: http://codes.cs.vt.edu:3000
- Backend: http://codes.cs.vt.edu:5001/api

**If you need to use port 80 (standard HTTP):**

You'll need to set up a reverse proxy with Apache or Nginx. Contact VT IT or see the section below.

## Setting Up Reverse Proxy (Optional)

If codes.cs.vt.edu has Apache installed, you can configure it to proxy to your app:

```bash
# Check if Apache is running
systemctl status httpd

# If you have access, edit Apache config
# This typically requires sudo access
```

Example Apache configuration:
```apache
<VirtualHost *:80>
    ServerName codes.cs.vt.edu

    # Proxy to Next.js frontend
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/

    # Proxy API to backend
    ProxyPass /api http://localhost:5001/api
    ProxyPassReverse /api http://localhost:5001/api
</VirtualHost>
```

## Updating Your Deployment

```bash
# From local machine
cd /Users/jaehoonpyon/Documents/GitHub/video-switching
npm run build
rsync -avz --exclude 'node_modules' --exclude '.git' \
  . sangwonlee@codes.cs.vt.edu:~/video-switching/

# On server
ssh sangwonlee@codes.cs.vt.edu
pm2 restart all
```

## Common PM2 Commands

```bash
pm2 status              # View all running processes
pm2 logs                # View logs for all processes
pm2 logs video-backend  # View backend logs
pm2 restart all         # Restart all processes
pm2 stop all           # Stop all processes
pm2 delete all         # Remove all processes
```

## Troubleshooting

### Check if ports are in use:
```bash
lsof -i :3000  # Frontend port
lsof -i :5001  # Backend port
```

### Check PM2 logs:
```bash
pm2 logs --lines 50
```

### Restart services:
```bash
pm2 restart video-backend
pm2 restart video-frontend
```

### Check if services are running:
```bash
pm2 status
curl http://localhost:3000
curl http://localhost:5001/health
```
