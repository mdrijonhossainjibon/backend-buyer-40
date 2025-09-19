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
# 2️⃣ Remove default site
# -----------------------------
echo "Removing default Nginx site..."
sudo unlink /etc/nginx/sites-enabled/default 2>/dev/null
sudo rm -rf /etc/nginx/sites-available/default

 
# -----------------------------
# 5️⃣ Configure API subdomain
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
# 6️⃣ Test and reload Nginx
# -----------------------------
echo "Testing Nginx configuration..."
sudo nginx -t
echo "Reloading Nginx..."
sudo systemctl reload nginx

echo "Setup completed! Main domain and API subdomain are ready."
