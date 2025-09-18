#!/bin/bash

# EarnFrom Backend Server Setup Script
# Bash version for Linux servers

echo "=== EarnFrom Backend Server Setup ==="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get domain from user
read -p "Enter your domain (e.g., api.earnfrom.com): " domain
if [ -z "$domain" ]; then
    echo -e "${RED}Domain is required!${NC}"
    exit 1
fi

# Get email for SSL certificate
read -p "Enter your email for SSL certificate: " email
if [ -z "$email" ]; then
    echo -e "${RED}Email is required for SSL certificate!${NC}"
    exit 1
fi

# Get server port
read -p "Enter server port (default: 3000): " port
if [ -z "$port" ]; then
    port="3000"
fi

echo -e "${YELLOW}Setting up server with:${NC}"
echo -e "${CYAN}Domain: $domain${NC}"
echo -e "${CYAN}Email: $email${NC}"
echo -e "${CYAN}Port: $port${NC}"

# Create Nginx configuration
cat > "nginx-$domain.conf" << EOF
server {
    listen 80;
    server_name $domain;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
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
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:$port;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
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
EOF

echo -e "${GREEN}Nginx configuration created: nginx-$domain.conf${NC}"

# Create PM2 ecosystem file
cat > "ecosystem.config.js" << EOF
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
EOF

echo -e "${GREEN}PM2 configuration created: ecosystem.config.js${NC}"

# Create deployment script
cat > "deploy.sh" << EOF
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
sudo cp nginx-$domain.conf /etc/nginx/sites-available/$domain
sudo ln -sf /etc/nginx/sites-available/$domain /etc/nginx/sites-enabled/

# Remove default Nginx site
sudo rm -f /etc/nginx/sites-enabled/default

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
EOF

chmod +x deploy.sh

echo -e "${GREEN}Deployment script created: deploy.sh${NC}"

# Create environment template
cat > ".env.example" << EOF
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
EOF

echo -e "${GREEN}Environment template created: .env.example${NC}"

# Create Docker configuration (optional)
cat > "Dockerfile" << EOF
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN yarn build

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE $port

# Start application
CMD ["node", "dist/server.js"]
EOF

cat > "docker-compose.yml" << EOF
version: '3.8'

services:
  app:
    build: .
    ports:
      - "$port:$port"
    environment:
      - NODE_ENV=production
      - PORT=$port
    env_file:
      - .env
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    depends_on:
      - mongodb

  mongodb:
    image: mongo:6.0
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx-$domain.conf:/etc/nginx/conf.d/default.conf
      - /etc/letsencrypt:/etc/letsencrypt
    depends_on:
      - app
    restart: unless-stopped

volumes:
  mongodb_data:
EOF

echo -e "${GREEN}Docker configuration created: Dockerfile, docker-compose.yml${NC}"

# Create monitoring script
cat > "monitor.sh" << EOF
#!/bin/bash
# Monitoring script for EarnFrom Backend

echo "=== EarnFrom Backend Status ==="

# Check PM2 status
echo "PM2 Status:"
pm2 status

echo ""

# Check Nginx status
echo "Nginx Status:"
sudo systemctl status nginx --no-pager -l

echo ""

# Check SSL certificate
echo "SSL Certificate Status:"
sudo certbot certificates

echo ""

# Check disk usage
echo "Disk Usage:"
df -h

echo ""

# Check memory usage
echo "Memory Usage:"
free -h

echo ""

# Check application logs
echo "Recent Application Logs:"
pm2 logs earnfrom-backend --lines 10

echo ""

# Check Nginx logs
echo "Recent Nginx Access Logs:"
sudo tail -10 /var/log/nginx/access.log

echo ""

# Check system load
echo "System Load:"
uptime
EOF

chmod +x monitor.sh

echo -e "${GREEN}Monitoring script created: monitor.sh${NC}"

echo ""
echo -e "${GREEN}=== Setup Complete! ===${NC}"
echo -e "${YELLOW}Files created:${NC}"
echo -e "${CYAN}  - nginx-$domain.conf (Nginx configuration)${NC}"
echo -e "${CYAN}  - ecosystem.config.js (PM2 configuration)${NC}"
echo -e "${CYAN}  - deploy.sh (Deployment script)${NC}"
echo -e "${CYAN}  - .env.example (Environment template)${NC}"
echo -e "${CYAN}  - Dockerfile (Docker configuration)${NC}"
echo -e "${CYAN}  - docker-compose.yml (Docker Compose)${NC}"
echo -e "${CYAN}  - monitor.sh (Monitoring script)${NC}"

echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Copy .env.example to .env and configure your environment variables"
echo -e "2. Run deployment: ${CYAN}./deploy.sh${NC}"
echo -e "3. Monitor your application: ${CYAN}./monitor.sh${NC}"
echo -e "4. Your API will be available at: ${CYAN}https://$domain${NC}"

echo ""
echo -e "${YELLOW}Alternative Docker deployment:${NC}"
echo -e "1. Configure .env file"
echo -e "2. Run: ${CYAN}docker-compose up -d${NC}"

echo ""
echo -e "${GREEN}Setup completed successfully!${NC}"
