#!/bin/bash

# -----------------------------
# Domain Configuration Setup
# -----------------------------
echo "==================================="
echo "   EarnFrom Backend Setup Script   "
echo "==================================="
echo ""

# Prompt for application name
read -p "Enter your application name (e.g., earnfrom-api, myapp-backend): " APP_NAME

# Validate app name input
if [ -z "$APP_NAME" ]; then
    echo "Error: Application name cannot be empty!"
    exit 1
fi

# Prompt for domain name
read -p "Enter your main domain name (e.g., earnfromadsbd.online): " MAIN_DOMAIN

# Validate domain input
if [ -z "$MAIN_DOMAIN" ]; then
    echo "Error: Domain name cannot be empty!"
    exit 1
fi

# Ask for subdomain preference
echo ""
echo "Choose your API subdomain configuration:"
echo "1. api.$MAIN_DOMAIN (recommended)"
echo "2. backend.$MAIN_DOMAIN"
echo "3. server.$MAIN_DOMAIN"
echo "4. Custom subdomain"
echo ""
read -p "Enter your choice (1-4): " SUBDOMAIN_CHOICE

case $SUBDOMAIN_CHOICE in
    1)
        API_DOMAIN="api.$MAIN_DOMAIN"
        ;;
    2)
        API_DOMAIN="backend.$MAIN_DOMAIN"
        ;;
    3)
        API_DOMAIN="server.$MAIN_DOMAIN"
        ;;
    4)
        read -p "Enter your custom subdomain (without the main domain): " CUSTOM_SUB
        if [ -z "$CUSTOM_SUB" ]; then
            echo "Error: Custom subdomain cannot be empty!"
            exit 1
        fi
        API_DOMAIN="$CUSTOM_SUB.$MAIN_DOMAIN"
        ;;
    *)
        echo "Invalid choice. Using default: api.$MAIN_DOMAIN"
        API_DOMAIN="api.$MAIN_DOMAIN"
        ;;
esac

# Ask for Express port
read -p "Enter Express.js port (default: 5000): " USER_PORT
EXPRESS_PORT=${USER_PORT:-5000}

# Confirm configuration
echo ""
echo "==================================="
echo "   Configuration Summary"
echo "==================================="
echo "Application Name: $APP_NAME"
echo "Main Domain: $MAIN_DOMAIN"
echo "API Domain: $API_DOMAIN"
echo "Express Port: $EXPRESS_PORT"
echo "==================================="
echo ""
read -p "Proceed with this configuration? (y/N): " CONFIRM

if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 0
fi

echo ""
echo "Starting setup with your configuration..."
echo ""

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
pm2 start dist/server.js --name "$APP_NAME" --env production

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

echo ""
echo "==================================="
echo "   🎉 Setup Completed Successfully!"
echo "==================================="
echo ""
echo "📋 Configuration Summary:"
echo "   • Application: $APP_NAME"
echo "   • Main Domain: $MAIN_DOMAIN"
echo "   • API Endpoint: http://$API_DOMAIN"
echo "   • Express Port: $EXPRESS_PORT"
echo "   • PM2 Process: $APP_NAME"
echo ""
echo "🔧 Next Steps:"
echo "   1. Point your DNS records:"
echo "      - A record: $API_DOMAIN → Your server IP"
echo "   2. Install SSL certificate (recommended):"
echo "      sudo apt install certbot python3-certbot-nginx"
echo "      sudo certbot --nginx -d $API_DOMAIN"
echo "   3. Test your API:"
echo "      curl http://$API_DOMAIN/api/v1/health"
echo ""
echo "📊 Useful Commands:"
echo "   • Check PM2 status: pm2 status"
echo "   • View API logs: pm2 logs $APP_NAME"
echo "   • Restart API: pm2 restart $APP_NAME"
echo "   • Check Nginx status: sudo systemctl status nginx"
echo ""
echo "✅ Your EarnFrom backend is now ready!"
