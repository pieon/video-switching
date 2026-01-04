#!/bin/bash

# Deployment script for codes.cs.vt.edu
# Usage: ./deploy.sh [username]

# Configuration
VT_USERNAME="${1:-sangwonlee}"
SERVER="codes.cs.vt.edu"
REMOTE_DIR="~/video-switching"
LOCAL_DIR="/Users/jaehoonpyon/Documents/GitHub/video-switching"

echo "=========================================="
echo "Deploying to $SERVER"
echo "=========================================="

# Step 1: Build frontend locally
echo ""
echo "📦 Building frontend..."
cd "$LOCAL_DIR"
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed!"
    exit 1
fi

echo "✅ Frontend built successfully"

# Step 2: Upload files
echo ""
echo "📤 Uploading files to server..."
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.git' \
    --exclude 'server/prisma/video_switching.db' \
    --exclude '*.log' \
    "$LOCAL_DIR/" \
    "$VT_USERNAME@$SERVER:$REMOTE_DIR/"

if [ $? -ne 0 ]; then
    echo "❌ Upload failed!"
    exit 1
fi

echo "✅ Files uploaded successfully"

# Step 3: Setup on server
echo ""
echo "🔧 Setting up on server..."
ssh "$VT_USERNAME@$SERVER" << 'ENDSSH'
    cd ~/video-switching

    echo "Installing frontend dependencies..."
    npm install --production

    echo "Setting up backend..."
    cd server
    npm install --production

    # Copy production env if doesn't exist
    if [ ! -f .env ]; then
        cp .env.production .env
        echo "⚠️  Created .env from .env.production"
        echo "⚠️  IMPORTANT: Update JWT_SECRET in server/.env!"
    fi

    # Generate Prisma Client
    npx prisma generate

    # Run migrations
    npx prisma migrate deploy

    echo "✅ Server setup complete"
ENDSSH

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. SSH into server: ssh $VT_USERNAME@$SERVER"
echo "2. Update JWT_SECRET in ~/video-switching/server/.env"
echo "3. Start applications with PM2:"
echo "   cd ~/video-switching/server && pm2 start npm --name video-backend -- start"
echo "   cd ~/video-switching && pm2 start npm --name video-frontend -- start"
echo ""
echo "Your site will be available at:"
echo "  Frontend: http://codes.cs.vt.edu:3000"
echo "  Backend:  http://codes.cs.vt.edu:5001"
echo ""
