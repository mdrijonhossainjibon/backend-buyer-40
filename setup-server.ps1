# EarnFrom Backend Server Setup Script
# PowerShell version for Windows

Write-Host "=== EarnFrom Backend Server Setup ===" -ForegroundColor Green

# Get domain from user
$domain = Read-Host "Enter your domain (e.g., api.earnfrom.com)"
if ([string]::IsNullOrEmpty($domain)) {
    Write-Host "Domain is required!" -ForegroundColor Red
    exit 1
}

# Get email for SSL certificate
$email = Read-Host "Enter your email for SSL certificate"
if ([string]::IsNullOrEmpty($email)) {
    Write-Host "Email is required for SSL certificate!" -ForegroundColor Red
    exit 1
}

# Get server port
$port = Read-Host "Enter server port (default: 3000)"
if ([string]::IsNullOrEmpty($port)) {
    $port = "3000"
}

Write-Host "Setting up server with:" -ForegroundColor Yellow
Write-Host "Domain: $domain" -ForegroundColor Cyan
Write-Host "Email: $email" -ForegroundColor Cyan
Write-Host "Port: $port" -ForegroundColor Cyan

# Create Nginx configuration
$nginxConfig = @"
server {
    listen 80;
    server_name $domain;
    
    # Redirect HTTP to HTTPS
    return 301 https://`$server_name`$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $domain;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/$domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$domain/privkey.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Rate Limiting
    limit_req_zone `$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:$port;
        proxy_http_version 1.1;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
        proxy_cache_bypass `$http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:$port/health;
        access_log off;
    }

    # Block access to sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
"@

# Create nginx config file
$nginxConfigPath = "nginx-$domain.conf"
$nginxConfig | Out-File -FilePath $nginxConfigPath -Encoding UTF8

Write-Host "Nginx configuration created: $nginxConfigPath" -ForegroundColor Green

# Create PM2 ecosystem file
$pm2Config = @"
module.exports = {
  apps: [{
    name: 'earnfrom-backend',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: $port
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max_old_space_size=1024'
  }]
};
"@

$pm2Config | Out-File -FilePath "ecosystem.config.js" -Encoding UTF8

Write-Host "PM2 configuration created: ecosystem.config.js" -ForegroundColor Green

# Create deployment script
$deployScript = @"
#!/bin/bash
# Deployment script for EarnFrom Backend

echo "=== Deploying EarnFrom Backend ==="

# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx

# Create logs directory
mkdir -p logs

# Install dependencies
npm install

# Build the application
npm run build

# Copy Nginx configuration
sudo cp $nginxConfigPath /etc/nginx/sites-available/$domain
sudo ln -sf /etc/nginx/sites-available/$domain /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Get SSL certificate
sudo certbot --nginx -d $domain --email $email --agree-tos --non-interactive

# Start application with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "=== Deployment Complete ==="
echo "Your API is now available at: https://$domain"
echo "Health check: https://$domain/health"
"@

$deployScript | Out-File -FilePath "deploy.sh" -Encoding UTF8

Write-Host "Deployment script created: deploy.sh" -ForegroundColor Green

# Create environment template
$envTemplate = @"
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/earnfrom
# or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/earnfrom

# Server Configuration
PORT=$port
NODE_ENV=production

# Security
NEXT_PUBLIC_SECRET_KEY=your-secret-key-here-change-this
JWT_SECRET=your-jwt-secret-here-change-this

# Telegram Bot (if using)
TELEGRAM_BOT_TOKEN=your-telegram-bot-token

# YouTube API (if using)
YOUTUBE_API_KEY=your-youtube-api-key

# Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Other API Keys
# Add any other API keys your application needs
"@

$envTemplate | Out-File -FilePath ".env.example" -Encoding UTF8

Write-Host "Environment template created: .env.example" -ForegroundColor Green

Write-Host "`n=== Setup Complete! ===" -ForegroundColor Green
Write-Host "Files created:" -ForegroundColor Yellow
Write-Host "  - $nginxConfigPath (Nginx configuration)" -ForegroundColor Cyan
Write-Host "  - ecosystem.config.js (PM2 configuration)" -ForegroundColor Cyan
Write-Host "  - deploy.sh (Linux deployment script)" -ForegroundColor Cyan
Write-Host "  - .env.example (Environment template)" -ForegroundColor Cyan

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Copy .env.example to .env and configure your environment variables" -ForegroundColor White
Write-Host "2. If deploying to Linux server, run: chmod +x deploy.sh && ./deploy.sh" -ForegroundColor White
Write-Host "3. If deploying manually, follow the instructions in deploy.sh" -ForegroundColor White
Write-Host "4. Your API will be available at: https://$domain" -ForegroundColor White

Write-Host "`nPress any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
