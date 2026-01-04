# Railway.app Deployment Guide

This guide will help you deploy your video-switching application to Railway.app.

## Prerequisites

1. Create a free account at [Railway.app](https://railway.app)
2. Install Railway CLI (optional but recommended):
   ```bash
   npm install -g @railway/cli
   ```
3. Have your GitHub repository ready (or use Railway CLI)

## Deployment Strategy

Railway will host **both** your frontend and backend as separate services:
- **Backend Service**: Express API + SQLite database
- **Frontend Service**: Next.js application

## Method 1: Deploy via GitHub (Recommended)

### Step 1: Push Your Code to GitHub

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Prepare for Railway deployment"

# Create a new repository on GitHub and push
git remote add origin https://github.com/YOUR_USERNAME/video-switching.git
git branch -M main
git push -u origin main
```

### Step 2: Create Railway Project

1. Go to [Railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Connect your GitHub account and select your repository
5. Railway will detect your project

### Step 3: Deploy Backend Service

1. In your Railway project, click **"+ New"** → **"Empty Service"**
2. Name it **"backend"**
3. Go to **Settings** → **Root Directory** → Set to `server`
4. Go to **Variables** and add these environment variables:

```
PORT=5001
NODE_ENV=production
DATABASE_URL=file:./prisma/video_switching.db
JWT_SECRET=<generate-a-secure-random-string>
JWT_EXPIRES_IN=7d
CLIENT_URL=${{RAILWAY_PUBLIC_DOMAIN}}
```

To generate a secure JWT_SECRET, run locally:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

5. Go to **Settings** → **Deploy** → **Custom Start Command**:
   ```
   npx prisma generate && npx prisma migrate deploy && npm start
   ```

6. Click **Deploy**

7. Once deployed, go to **Settings** → **Networking** → **Generate Domain**
   - Copy this URL (e.g., `https://backend-production-xxxx.up.railway.app`)

### Step 4: Deploy Frontend Service

1. In your Railway project, click **"+ New"** → **"GitHub Repo"**
2. Select your repository again
3. Name this service **"frontend"**
4. Go to **Variables** and add:

```
NEXT_PUBLIC_API_URL=<YOUR_BACKEND_URL>/api
```

Replace `<YOUR_BACKEND_URL>` with the backend domain from Step 3 (e.g., `https://backend-production-xxxx.up.railway.app`)

5. Go to **Settings** → **Networking** → **Generate Domain**
   - This will be your public website URL

6. **Update Backend CORS**: Go back to your **backend service** → **Variables** → Edit `CLIENT_URL`:
   ```
   CLIENT_URL=<YOUR_FRONTEND_URL>
   ```
   Replace with your frontend domain (e.g., `https://frontend-production-xxxx.up.railway.app`)

7. Redeploy both services

### Step 5: Verify Deployment

Visit your frontend URL. The application should be live!

Test the backend API:
```bash
curl https://your-backend-url.up.railway.app/health
```

---

## Method 2: Deploy via Railway CLI

### Step 1: Login to Railway

```bash
railway login
```

### Step 2: Initialize Project

```bash
cd /Users/jaehoonpyon/Documents/GitHub/video-switching
railway init
```

### Step 3: Deploy Backend

```bash
cd server
railway up

# Set environment variables
railway variables set PORT=5001
railway variables set NODE_ENV=production
railway variables set DATABASE_URL="file:./prisma/video_switching.db"
railway variables set JWT_SECRET="<your-generated-secret>"
railway variables set JWT_EXPIRES_IN="7d"
```

### Step 4: Deploy Frontend

```bash
cd ..
railway up

# Set environment variable
railway variables set NEXT_PUBLIC_API_URL="<your-backend-url>/api"
```

---

## Configuration Files for Railway

Railway auto-detects your setup, but you can add these files for more control:

### Backend: railway.json (Optional)

Create `server/railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npx prisma generate && npx prisma migrate deploy && npm start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Frontend: railway.json (Optional)

Create `railway.json` in the root:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/",
    "healthcheckTimeout": 100
  }
}
```

---

## Important Notes

### Database Persistence

⚠️ **SQLite on Railway**: Railway's ephemeral filesystem means your SQLite database will reset on redeploys. For production, consider:

**Option A: Use Railway's PostgreSQL (Recommended)**
1. In Railway project, click **"+ New"** → **"Database"** → **"PostgreSQL"**
2. Update your `server/prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Railway will automatically set the `DATABASE_URL` environment variable

**Option B: Use Railway Volumes (Keep SQLite)**
1. In backend service → **Settings** → **Volumes**
2. Add mount path: `/app/server/prisma`
3. This persists your database across deploys

### Environment Variables Summary

**Backend Service:**
- `PORT` = 5001
- `NODE_ENV` = production
- `DATABASE_URL` = (from Railway PostgreSQL or file path)
- `JWT_SECRET` = (generate secure random string)
- `JWT_EXPIRES_IN` = 7d
- `CLIENT_URL` = (your frontend Railway URL)

**Frontend Service:**
- `NEXT_PUBLIC_API_URL` = (your backend Railway URL)/api

### Custom Domains

You can add custom domains in Railway:
1. Go to service **Settings** → **Domains**
2. Click **"Custom Domain"**
3. Add your domain and configure DNS records

---

## Troubleshooting

### Check Logs
```bash
railway logs
```

Or in Railway dashboard: Service → **Deployments** → Click on deployment → **View Logs**

### Common Issues

**Build Fails:**
- Check that `package.json` has correct scripts
- Ensure all dependencies are listed in `package.json`

**Database Connection Issues:**
- Verify `DATABASE_URL` is set correctly
- Check Prisma migrations ran successfully

**CORS Errors:**
- Verify `CLIENT_URL` matches your frontend domain
- Check frontend `NEXT_PUBLIC_API_URL` is correct

**Frontend Can't Reach Backend:**
- Ensure backend service has a public domain generated
- Check `NEXT_PUBLIC_API_URL` includes `/api` at the end

---

## Updating Your Deployment

Railway auto-deploys when you push to GitHub:

```bash
git add .
git commit -m "Update application"
git push
```

Railway will automatically redeploy both services.

---

## Costs

Railway offers:
- **Free Tier**: $5 worth of usage per month (usually sufficient for small projects)
- **Pro Plan**: $20/month for more resources

Monitor usage in Railway dashboard.

---

## Next Steps After Deployment

1. ✅ Test all functionality on your Railway URLs
2. ✅ Update any hardcoded URLs in your code
3. ✅ Set up PostgreSQL if you need persistent data
4. ✅ Configure custom domain (optional)
5. ✅ Monitor logs and usage

---

Your application will be available at:
- **Frontend**: `https://your-frontend.up.railway.app`
- **Backend API**: `https://your-backend.up.railway.app/api`

Enjoy your deployment! 🚀
