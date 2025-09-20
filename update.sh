#!/bin/bash

# -----------------------------
# Variables - Change if needed
# -----------------------------
APP_NAME="earnfrom-api"
EXPRESS_PORT=5000

echo "🚀 Starting application update process..."

# -----------------------------
# 1️⃣ Pull latest code from git
# -----------------------------
echo "📥 Pulling latest code from git..."
git pull origin main

if [ $? -ne 0 ]; then
    echo "❌ Git pull failed. Exiting..."
    exit 1
fi

# -----------------------------
# 2️⃣ Install/update dependencies
# -----------------------------
echo "📦 Installing/updating dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ npm install failed. Exiting..."
    exit 1
fi

# -----------------------------
# 3️⃣ Build the application
# -----------------------------
echo "🔨 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Exiting..."
    exit 1
fi

# -----------------------------
# 4️⃣ Stop old PM2 process
# -----------------------------
echo "🛑 Stopping old PM2 process..."
pm2 stop $APP_NAME 2>/dev/null || echo "No existing process found"
pm2 delete $APP_NAME 2>/dev/null || echo "No existing process to delete"

# -----------------------------
# 5️⃣ Start new PM2 process
# -----------------------------
echo "▶️ Starting new PM2 process..."
pm2 start dist/server.js --name $APP_NAME --env production

if [ $? -ne 0 ]; then
    echo "❌ Failed to start PM2 process. Exiting..."
    exit 1
fi

# -----------------------------
# 6️⃣ Save PM2 configuration
# -----------------------------
echo "💾 Saving PM2 configuration..."
pm2 save

# -----------------------------
# 7️⃣ Show PM2 status
# -----------------------------
echo "📊 Current PM2 status:"
pm2 status

echo "✅ Application update completed successfully!"
echo "🌐 Application is running on port $EXPRESS_PORT"
echo "📝 Check logs with: pm2 logs $APP_NAME"
echo "📊 Check status with: pm2 status"
