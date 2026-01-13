#!/bin/bash

# -----------------------------
# Domain Configuration Setup
# -----------------------------
echo "==================================="
echo "   EarnFrom Backend Setup Script   "
echo "==================================="
echo ""

# Prompt for GitHub repository
read -p "Enter your GitHub repository URL (e.g., https://github.com/username/repo.git): " GITHUB_REPO

# Validate GitHub repo input
if [ -z "$GITHUB_REPO" ]; then
    echo "Error: GitHub repository URL cannot be empty!"
    exit 1
fi

# Extract repo name from URL for default app name
REPO_NAME=$(basename "$GITHUB_REPO" .git)

# Prompt for application name
read -p "Enter your application name (default: $REPO_NAME): " APP_NAME
APP_NAME=${APP_NAME:-$REPO_NAME}

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
echo "GitHub Repository: $GITHUB_REPO"
echo "Application Name: $APP_NAME"
echo "Project Directory: /var/www/$APP_NAME"
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
# 1️⃣ Check and Install Git and Nginx
# -----------------------------

# Function to check if a package is installed
check_package() {
    dpkg -l "$1" &> /dev/null
    return $?
}

# Check if apt update is needed (if last update was more than 24 hours ago)
APT_UPDATE_STAMP="/var/lib/apt/periodic/update-success-stamp"
if [ -f "$APT_UPDATE_STAMP" ]; then
    LAST_UPDATE=$(stat -c %Y "$APT_UPDATE_STAMP" 2>/dev/null || echo 0)
    CURRENT_TIME=$(date +%s)
    TIME_DIFF=$((CURRENT_TIME - LAST_UPDATE))
    # 86400 seconds = 24 hours
    if [ $TIME_DIFF -gt 86400 ]; then
        echo "Apt cache is outdated. Updating..."
        sudo apt update
    else
        echo "✓ Apt cache is up to date (updated within last 24 hours)"
    fi
else
    echo "Running apt update..."
    sudo apt update
fi

# Check and install Git
if check_package "git"; then
    echo "✓ Git is already installed: $(git --version)"
else
    echo "Installing Git..."
    sudo apt install git -y
fi

# Check and install Nginx
if check_package "nginx"; then
    echo "✓ Nginx is already installed: $(nginx -v 2>&1)"
else
    echo "Installing Nginx..."
    sudo apt install nginx -y
fi

# -----------------------------
# 2️⃣ Check and Install Node.js and npm
# -----------------------------
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "✓ Node.js is already installed: $NODE_VERSION"
    # Check if version is 18.x or higher
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | tr -d 'v')
    if [ "$NODE_MAJOR" -lt 18 ]; then
        echo "Warning: Node.js version is below 18. Upgrading..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
else
    echo "Installing Node.js and npm..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# -----------------------------
# 3️⃣ Clone GitHub repository
# -----------------------------
echo "Cloning repository from $GITHUB_REPO..."
PROJECT_DIR="/var/www/$APP_NAME"

# Remove existing directory if exists
if [ -d "$PROJECT_DIR" ]; then
    echo "Removing existing directory..."
    sudo rm -rf "$PROJECT_DIR"
fi

# Clone the repository
sudo git clone "$GITHUB_REPO" "$PROJECT_DIR"
cd "$PROJECT_DIR"

# Set ownership
sudo chown -R $USER:$USER "$PROJECT_DIR"

# -----------------------------
# 4️⃣ Setup environment and install dependencies
# -----------------------------
echo "Setting up environment file..."
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "Created .env file from .env.example. Please update it with your configuration."
    else
        echo "Warning: No .env.example found. Please create .env manually."
    fi
fi

echo "Installing Express application dependencies..."
npm install

# -----------------------------
# 4️⃣ Build and start Express app
# -----------------------------
echo "Building Express application..."
npm run build

echo "Starting Express application on port $EXPRESS_PORT..."
# Check and install PM2 for process management
if command -v pm2 &> /dev/null; then
    echo "✓ PM2 is already installed: $(pm2 -v)"
else
    echo "Installing PM2..."
    sudo npm install -g pm2
fi

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
echo "   • GitHub Repo: $GITHUB_REPO"
echo "   • Application: $APP_NAME"
echo "   • Project Dir: $PROJECT_DIR"
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
echo "🔄 Auto Update & Redeploy:"
echo "   Run this command to pull latest code, rebuild, and restart:"
echo "   cd $PROJECT_DIR && git pull && npm install && npm run build && pm2 restart $APP_NAME"
echo ""
echo "✅ Your EarnFrom backend is now ready!"

# -----------------------------
# Create update script for easy redeployment
# -----------------------------
echo ""
echo "Creating update script at $PROJECT_DIR/update.sh..."
sudo tee $PROJECT_DIR/update.sh > /dev/null <<'UPDATESCRIPT'
#!/bin/bash

# -----------------------------
# Auto Update & Redeploy Script
# -----------------------------
echo "🔄 Starting auto update and redeploy..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Get app name from PM2 (first running app in this directory)
APP_NAME=$(pm2 jlist 2>/dev/null | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$APP_NAME" ]; then
    APP_NAME=$(basename "$SCRIPT_DIR")
    echo "⚠ Could not detect PM2 app name, using directory name: $APP_NAME"
fi

echo "📂 Project: $SCRIPT_DIR"
echo "📦 App Name: $APP_NAME"
echo ""

# Step 1: Pull latest code
echo "📥 Step 1: Pulling latest code from Git..."
git fetch origin
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse @{u})

if [ "$LOCAL" = "$REMOTE" ]; then
    echo "✓ Already up to date!"
    read -p "Force rebuild anyway? (y/N): " FORCE_REBUILD
    if [[ ! $FORCE_REBUILD =~ ^[Yy]$ ]]; then
        echo "No changes to deploy. Exiting."
        exit 0
    fi
else
    echo "New commits found. Pulling..."
    git pull origin $(git branch --show-current)
    echo "✓ Code updated!"
fi
echo ""

# Step 2: Install dependencies
echo "📦 Step 2: Installing dependencies..."
npm install
echo "✓ Dependencies installed!"
echo ""

# Step 3: Build the application
echo "🔨 Step 3: Building application..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed! Aborting deployment."
    exit 1
fi
echo "✓ Build successful!"
echo ""

# Step 4: Restart PM2 process
echo "🔄 Step 4: Restarting server..."
pm2 restart "$APP_NAME"
if [ $? -ne 0 ]; then
    echo "⚠ PM2 restart failed, trying to start..."
    pm2 start dist/server.js --name "$APP_NAME"
fi
echo "✓ Server restarted!"
echo ""

# Step 5: Save PM2 state
pm2 save

# Show status
echo "=================================="
echo "   🎉 Update Complete!"
echo "=================================="
pm2 status
echo ""
echo "📊 View logs: pm2 logs $APP_NAME"
UPDATESCRIPT

sudo chmod +x $PROJECT_DIR/update.sh
sudo chown $USER:$USER $PROJECT_DIR/update.sh
echo "✓ Update script created!"
echo ""
echo "💡 To update your app in the future, simply run:"
echo "   cd $PROJECT_DIR && ./update.sh"
