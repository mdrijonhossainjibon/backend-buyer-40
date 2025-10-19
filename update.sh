#!/bin/bash

APP_NAME="earnfrom-api"
EXPRESS_PORT=5000

echo "🚀 Starting application update process..."

# Go to project folder
cd ~/backend-buyer-40 || { echo "❌ Failed to cd into project"; exit 1; }

# 1️⃣ Pull latest code
echo "📥 Pulling latest code from git..."
git pull  || { echo "❌ Git pull failed"; exit 1; }

# 2️⃣ Install dependencies
echo "📦 Installing/updating dependencies..."
yarn install || { echo "❌ Yarn install failed"; exit 1; }

# 3️⃣ Build app
echo "🔨 Building application..."
yarn build || { echo "❌ Build failed"; exit 1; }

# 4️⃣ Stop old PM2 process
echo "🛑 Stopping old PM2 process..."
pm2 stop $APP_NAME 2>/dev/null || echo "No process to stop"
pm2 delete $APP_NAME 2>/dev/null || echo "No process to delete"

# 5️⃣ Start new PM2 process
echo "▶️ Starting new PM2 process..."
pm2 start dist/server.js --name $APP_NAME --env production || { echo "❌ Failed to start PM2"; exit 1; }

# 6️⃣ Save PM2 config
echo "💾 Saving PM2 configuration..."
pm2 save

# 7️⃣ Show PM2 status
echo "📊 Current PM2 status:"
pm2 status

echo "✅ Update completed! Running on port $EXPRESS_PORT"
echo "📝 Logs: pm2 logs $APP_NAME"
