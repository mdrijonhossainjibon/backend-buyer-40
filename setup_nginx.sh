#!/bin/bash

# -----------------------------
# Variables - Change if needed
# -----------------------------
MAIN_DOMAIN="earnfromadsbd.online"
API_DOMAIN="api.earnfromadsbd.online"
HTML_ROOT="/var/www/$MAIN_DOMAIN/html"
EXPRESS_PORT=5000

# -----------------------------
# 1️⃣ Install Nginx
# -----------------------------
echo "Installing Nginx..."
sudo apt update
sudo apt install nginx -y

# -----------------------------
# 2️⃣ Install Node.js and npm
# -----------------------------
echo "Installing Node.js and npm..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# -----------------------------
# 3️⃣ Setup environment and install dependencies
# -----------------------------
echo "Setting up environment file..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env file from .env.example. Please update it with your configuration."
fi

echo "Installing Express application dependencies..."
npm install

# -----------------------------
# 4️⃣ Build and start Express app
# -----------------------------
echo "Building Express application..."
npm run build

echo "Starting Express application on port $EXPRESS_PORT..."
# Install PM2 for process management
sudo npm install -g pm2

# Start the Express app with PM2 in background
pm2 start dist/server.js --name "earnfrom-api" --env production

# Save PM2 configuration and setup startup script
pm2 save
pm2 startup

echo "Express application is now running on port $EXPRESS_PORT"

# -----------------------------
# 5️⃣ Remove default site
# -----------------------------
echo "Removing default Nginx site..."
sudo unlink /etc/nginx/sites-enabled/default 2>/dev/null
sudo rm -rf /etc/nginx/sites-available/default

 
# -----------------------------
# 6️⃣ Configure API subdomain
# -----------------------------
echo "Configuring Nginx for $API_DOMAIN..."
sudo tee /etc/nginx/sites-available/$API_DOMAIN > /dev/null <<EOL
server {
    listen 80;
    server_name $API_DOMAIN;

    location / {
        proxy_pass http://localhost:$EXPRESS_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOL

sudo ln -s /etc/nginx/sites-available/$API_DOMAIN /etc/nginx/sites-enabled/

# -----------------------------
# 7️⃣ Test and reload Nginx
# -----------------------------
echo "Testing Nginx configuration..."
sudo nginx -t
echo "Reloading Nginx..."
sudo systemctl reload nginx

echo "Setup completed! Main domain and API subdomain are ready."
