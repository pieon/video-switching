# 🚀 Video Switching Research - Deployment Summary

## Your Setup

- **Production URL**: http://codes.cs.vt.edu
- **Frontend Port**: 3000
- **Backend Port**: 5001
- **Database**: SQLite (file-based, portable)
- **Server**: Rocky Linux 10.1

## Quick Start - Deploy Now!

### Step 1: Deploy from Your Mac

```bash
cd /Users/jaehoonpyon/Documents/GitHub/video-switching
./deploy.sh sangwonlee
```

### Step 2: Configure & Start on Server

```bash
# SSH into server
ssh sangwonlee@codes.cs.vt.edu

# Generate a secure JWT secret
cd ~/video-switching/server
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Update .env with the generated secret
nano .env
# Change JWT_SECRET to the generated value above

# Install PM2 (process manager)
npm install -g pm2

# Start backend
pm2 start npm --name video-backend -- start

# Start frontend
cd ~/video-switching
pm2 start npm --name video-frontend -- start

# Save PM2 config and enable auto-start
pm2 save
pm2 startup
# Follow the command it gives you (copy/paste and run)
```

### Step 3: Access Your Site

- **Frontend**: http://codes.cs.vt.edu:3000
- **Backend API**: http://codes.cs.vt.edu:5001/api
- **Health Check**: http://codes.cs.vt.edu:5001/health

## Important Configuration

### Environment Variables

**Development** (your Mac):
- Frontend: `NEXT_PUBLIC_API_URL=http://localhost:3001/api`
- Backend: `CLIENT_URL=http://localhost:3000`
- Backend: `PORT=3001`

**Production** (codes.cs.vt.edu):
- Frontend: `NEXT_PUBLIC_API_URL=http://codes.cs.vt.edu:5001/api`
- Backend: `CLIENT_URL=http://codes.cs.vt.edu:3000`
- Backend: `PORT=5001`

All these are already configured in your `.env.development` and `.env.production` files!

## Database

Your SQLite database contains:
- ✅ 4 users (P001, P002, P003, P004)
- ✅ 67 video sessions
- ✅ 125 events

**Location on server**: `~/video-switching/server/prisma/video_switching.db`

### Backing Up Your Data

```bash
# On server
cd ~/video-switching/server
cp prisma/video_switching.db prisma/video_switching_backup_$(date +%Y%m%d).db

# Download to your Mac
scp sangwonlee@codes.cs.vt.edu:~/video-switching/server/prisma/video_switching.db \
  /Users/jaehoonpyon/Documents/GitHub/video-switching/server/prisma/
```

## Useful Commands

### On Server (via SSH)

```bash
# Check status of your apps
pm2 status

# View logs
pm2 logs
pm2 logs video-backend --lines 50

# Restart apps
pm2 restart video-backend
pm2 restart video-frontend
pm2 restart all

# Stop apps
pm2 stop all

# Check database
cd ~/video-switching/server
sqlite3 prisma/video_switching.db "SELECT COUNT(*) FROM users;"
```

### From Your Mac (Updates)

```bash
# Make changes to your code, then:
cd /Users/jaehoonpyon/Documents/GitHub/video-switching

# Build frontend
npm run build

# Deploy updates
./deploy.sh sangwonlee

# Then SSH and restart
ssh sangwonlee@codes.cs.vt.edu
pm2 restart all
```

## Port Access Notes

If you cannot access ports 3000 and 5001 from outside:

1. **Contact VT IT** to open these ports in the firewall
2. **Or set up a reverse proxy** (requires Apache/Nginx configuration)
3. **Or use SSH tunneling** for testing:
   ```bash
   ssh -L 3000:localhost:3000 -L 5001:localhost:5001 sangwonlee@codes.cs.vt.edu
   # Then access via http://localhost:3000 on your Mac
   ```

## Troubleshooting

### Backend won't start
```bash
# Check logs
pm2 logs video-backend

# Common issues:
# - Port 5001 already in use: lsof -i :5001 && kill -9 <PID>
# - Database permissions: chmod 644 server/prisma/video_switching.db
# - Missing .env: cp .env.production .env
```

### Frontend won't start
```bash
# Check logs
pm2 logs video-frontend

# Common issues:
# - Port 3000 in use: lsof -i :3000 && kill -9 <PID>
# - Build failed: npm run build
# - Missing dependencies: npm install
```

### CORS errors
Make sure `CLIENT_URL` in `server/.env` matches where your frontend is actually running:
- Direct access: `http://codes.cs.vt.edu:3000`
- With proxy: `http://codes.cs.vt.edu`

## Documentation

- **Full deployment guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Quick reference**: [QUICK_DEPLOY.md](./QUICK_DEPLOY.md)

## Need Help?

Common issues and solutions:

1. **"Cannot connect to backend"** → Check CORS settings and backend is running
2. **"Port already in use"** → Kill the process or use different port
3. **"Database error"** → Run `npx prisma migrate deploy`
4. **"PM2 not found"** → Install with `npm install -g pm2`

## Next Steps After Deployment

1. ✅ Test all functionality on the live site
2. ✅ Monitor PM2 logs for errors: `pm2 logs`
3. ✅ Set up regular database backups
4. ✅ Update JWT_SECRET (very important for security!)
5. ✅ Configure firewall rules if needed

---

**Your deployment is ready! Follow the Quick Start above to go live.** 🎉
