#!/bin/bash

# Legal Estate Professional Package Installer
# This script installs the Professional version of Legal Estate Management System
# Designed for law firms with 2-25 attorneys with team collaboration features

set -e  # Exit on any error

echo "=================================================="
echo "  Legal Estate Professional Package Installer"
echo "=================================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    print_error "This script should not be run as root. Please run as a regular user."
    exit 1
fi

print_status "Starting Legal Estate Professional Package installation..."

# Check system requirements
print_status "Checking system requirements..."

# Check RAM
TOTAL_RAM=$(free -m | awk 'NR==2{printf "%.0f", $2}')
MIN_RAM=4096  # 4GB minimum for Professional

if [ $TOTAL_RAM -lt $MIN_RAM ]; then
    print_error "Insufficient RAM. Professional package requires at least 4GB RAM. Found: ${TOTAL_RAM}MB"
    exit 1
fi

print_success "RAM check passed: ${TOTAL_RAM}MB available"

# Check available disk space
DISK_SPACE=$(df -m . | awk 'NR==2{print $4}')
MIN_DISK=20480  # 20GB minimum

if [ $DISK_SPACE -lt $MIN_DISK ]; then
    print_error "Insufficient disk space. Professional package requires at least 20GB free space. Available: ${DISK_SPACE}MB"
    exit 1
fi

print_success "Disk space check passed: ${DISK_SPACE}MB available"

# Detect hosting type
print_status "Detecting hosting environment..."

if [ -f /proc/vz/veinfo ]; then
    print_warning "OpenVZ container detected. Some features may not work properly."
elif [ -f /.dockerenv ]; then
    print_success "Docker container detected."
elif [ -f /sys/hypervisor/uuid ] && [ `head -c 3 /sys/hypervisor/uuid` == ec2 ]; then
    print_success "AWS EC2 instance detected."
elif [ -n "$(dmidecode -s system-manufacturer | grep -i google)" ] 2>/dev/null; then
    print_success "Google Cloud instance detected."
else
    # Check for shared hosting indicators
    if [ -f /usr/local/cpanel/version ] || [ -f /usr/local/directadmin/conf/directadmin.conf ] || [ -f /etc/webmin/version ]; then
        print_error "Shared hosting detected. Legal Estate Professional requires VPS or dedicated server."
        echo "Recommended VPS providers:"
        echo "  - OVH Cloud (recommended for EU)"
        echo "  - Hetzner (cost-effective)"
        echo "  - DigitalOcean (developer-friendly)"
        exit 1
    fi
    print_success "VPS/Dedicated server detected."
fi

# Install system dependencies
print_status "Installing system dependencies..."

# Update package list
sudo apt update

# Install required packages
sudo apt install -y \
    curl \
    wget \
    git \
    build-essential \
    python3 \
    python3-pip \
    postgresql \
    postgresql-contrib \
    nginx \
    certbot \
    python3-certbot-nginx \
    ufw \
    fail2ban \
    htop \
    unzip \
    redis-server

print_success "System dependencies installed"

# Install Node.js 18+
print_status "Installing Node.js..."

if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" -lt 18 ]; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    print_success "Node.js $(node -v) installed"
else
    print_success "Node.js $(node -v) already installed"
fi

# Install Docker
print_status "Installing Docker..."

if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    sudo systemctl enable docker
    sudo systemctl start docker
    rm get-docker.sh
    print_success "Docker installed"
else
    print_success "Docker already installed"
fi

# Install Docker Compose
print_status "Installing Docker Compose..."

if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    print_success "Docker Compose installed"
else
    print_success "Docker Compose already installed"
fi

# Install Ollama for local AI
print_status "Installing Ollama for local AI processing..."

if ! command -v ollama &> /dev/null; then
    curl -fsSL https://ollama.ai/install.sh | sh
    print_success "Ollama installed"
else
    print_success "Ollama already installed"
fi

# Start services
print_status "Starting services..."
sudo systemctl enable postgresql
sudo systemctl start postgresql
sudo systemctl enable redis-server
sudo systemctl start redis-server
sudo systemctl enable ollama
sudo systemctl start ollama

# Wait for services to be ready
sleep 10

# Setup PostgreSQL database
print_status "Setting up PostgreSQL database..."

# Get database credentials
read -p "Enter database name [legal_estate_professional]: " DB_NAME
DB_NAME=${DB_NAME:-legal_estate_professional}

read -p "Enter database username [legalestate_professional]: " DB_USER
DB_USER=${DB_USER:-legalestate_professional}

read -s -p "Enter database password: " DB_PASSWORD
echo ""

# Create database and user
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

print_success "PostgreSQL database created"

# Download AI models for Professional package
print_status "Downloading AI models for Professional package..."

ollama pull llama3:8b
print_success "Llama 3 8B model downloaded"

ollama pull mistral:7b
print_success "Mistral 7B model downloaded"

ollama pull codellama:7b
print_success "CodeLlama 7B model downloaded"

# Verify models are working
print_status "Verifying AI models..."
if ollama list | grep -q "llama3:8b"; then
    print_success "AI models verified and ready"
else
    print_error "AI model verification failed"
    exit 1
fi

# Setup Legal Estate Professional
print_status "Setting up Legal Estate Professional package..."

# Create application directory
INSTALL_DIR="/opt/legal-estate-professional"
sudo mkdir -p $INSTALL_DIR
sudo chown $USER:$USER $INSTALL_DIR

# Clone/copy application files
if [ -d "/var/www/html" ]; then
    print_status "Copying application files..."
    cp -r /var/www/html/* $INSTALL_DIR/
else
    print_error "Application source not found in /var/www/html"
    exit 1
fi

cd $INSTALL_DIR

# Checkout Professional branch
git checkout package/professional

# Setup backend
print_status "Setting up backend..."
cd backend

# Copy Professional environment configuration
cp .env.professional .env

# Update database URL in .env
sed -i "s|postgresql://legalestate_professional:LegalTechPro2024@localhost:5432/legal_estate_professional|postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME|g" .env

# Install backend dependencies
npm install

# Generate Prisma client for PostgreSQL
print_status "Setting up PostgreSQL database schema..."
npx prisma generate --schema=./prisma/schema.professional.prisma
npx prisma db push --schema=./prisma/schema.professional.prisma

# Create initial admin user
print_status "Creating admin user..."
read -p "Enter admin email: " ADMIN_EMAIL
read -s -p "Enter admin password: " ADMIN_PASSWORD
echo ""

read -p "Enter admin first name: " ADMIN_FIRSTNAME
read -p "Enter admin last name: " ADMIN_LASTNAME
read -p "Enter bar number (optional): " BAR_NUMBER

node -e "
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createAdmin() {
  const hashedPassword = await bcrypt.hash('$ADMIN_PASSWORD', 10);

  await prisma.user.create({
    data: {
      email: '$ADMIN_EMAIL',
      password: hashedPassword,
      name: '$ADMIN_FIRSTNAME $ADMIN_LASTNAME',
      firstName: '$ADMIN_FIRSTNAME',
      lastName: '$ADMIN_LASTNAME',
      role: 'SUPER_ADMIN',
      isActive: true,
      barNumber: '$BAR_NUMBER' || null,
      canAssignTasks: true,
      canManageClients: true,
      canViewBilling: true,
      canManageUsers: true,
      emailVerified: true
    }
  });

  // Create default Professional config
  await prisma.professionalConfig.create({
    data: {
      maxUsers: 25,
      currentUserCount: 1,
      teamFeaturesEnabled: true,
      taskDelegationEnabled: true,
      documentSharingEnabled: true,
      timeTrackingEnabled: true,
      billingEnabled: true,
      clientPortalEnabled: true
    }
  });

  console.log('Admin user and configuration created successfully');
  process.exit(0);
}

createAdmin().catch(console.error);
"

print_success "Admin user created"

# Setup frontend
print_status "Setting up frontend..."
cd ../frontend

# Install frontend dependencies
npm install

# Build frontend for production
npm run build

print_success "Frontend built successfully"

# Setup Nginx
print_status "Configuring Nginx..."

# Get domain information
read -p "Enter your domain name (or press Enter for localhost): " DOMAIN_NAME
DOMAIN_NAME=${DOMAIN_NAME:-localhost}

sudo tee /etc/nginx/sites-available/legal-estate-professional > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN_NAME;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Frontend
    location / {
        root $INSTALL_DIR/frontend/build;
        index index.html;
        try_files \$uri \$uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3031;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        # Increase timeouts for large uploads
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # File uploads
    location /uploads {
        alias $INSTALL_DIR/backend/uploads;

        # Restrict file types for security
        location ~* \.(php|php5|phtml|pl|py|jsp|asp|sh|cgi)$ {
            deny all;
        }
    }

    # Rate limiting
    location /api/auth {
        limit_req zone=auth burst=5 nodelay;
        proxy_pass http://localhost:3031;
        # ... (same proxy settings as above)
    }

    # Deny access to sensitive files
    location ~ /\. {
        deny all;
    }

    location ~ \.(env|git|htaccess|htpasswd)$ {
        deny all;
    }
}

# Rate limiting zones
limit_req_zone \$binary_remote_addr zone=auth:10m rate=5r/m;
limit_req_zone \$binary_remote_addr zone=api:10m rate=30r/m;
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/legal-estate-professional /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Start Nginx
sudo systemctl enable nginx
sudo systemctl restart nginx

print_success "Nginx configured and started"

# Setup SSL if domain provided
if [ "$DOMAIN_NAME" != "localhost" ]; then
    print_status "Setting up SSL certificate..."
    read -p "Enter email for SSL certificate: " SSL_EMAIL

    # Request SSL certificate
    sudo certbot --nginx -d $DOMAIN_NAME --email $SSL_EMAIL --agree-tos --non-interactive

    if [ $? -eq 0 ]; then
        print_success "SSL certificate installed"
    else
        print_warning "SSL certificate installation failed. You can set it up manually later."
    fi
fi

# Setup systemd service
print_status "Creating systemd service..."

sudo tee /etc/systemd/system/legal-estate-professional.service > /dev/null <<EOF
[Unit]
Description=Legal Estate Professional Backend
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable legal-estate-professional
sudo systemctl start legal-estate-professional

print_success "Systemd service created and started"

# Setup firewall
print_status "Configuring firewall..."
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5432/tcp  # PostgreSQL (only if needed for remote access)

print_success "Firewall configured"

# Setup backup script
print_status "Setting up backup system..."

sudo tee /usr/local/bin/backup-legal-estate-professional > /dev/null <<EOF
#!/bin/bash
BACKUP_DIR="/opt/legal-estate-backups"
DATE=\$(date +%Y%m%d_%H%M%S)

mkdir -p \$BACKUP_DIR

# Backup database
pg_dump -h localhost -U $DB_USER -d $DB_NAME > \$BACKUP_DIR/database_\$DATE.sql

# Backup uploads
tar -czf \$BACKUP_DIR/uploads_\$DATE.tar.gz -C $INSTALL_DIR/backend uploads/

# Backup configuration
tar -czf \$BACKUP_DIR/config_\$DATE.tar.gz -C $INSTALL_DIR/backend .env

# Cleanup old backups (keep last 30 days)
find \$BACKUP_DIR -name "*.sql" -mtime +30 -delete
find \$BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: \$DATE"
EOF

sudo chmod +x /usr/local/bin/backup-legal-estate-professional

# Setup daily backup cron job
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-legal-estate-professional") | crontab -

print_success "Backup system configured"

# Setup monitoring
print_status "Setting up basic monitoring..."

# Create log rotation
sudo tee /etc/logrotate.d/legal-estate-professional > /dev/null <<EOF
$INSTALL_DIR/backend/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    notifempty
    create 0644 $USER $USER
    postrotate
        systemctl reload legal-estate-professional
    endscript
}
EOF

print_success "Log rotation configured"

# Final checks
print_status "Performing final checks..."

# Check if services are running
sleep 10

if systemctl is-active --quiet legal-estate-professional; then
    print_success "Backend service is running"
else
    print_warning "Backend service may not be running. Check with: sudo systemctl status legal-estate-professional"
fi

if systemctl is-active --quiet nginx; then
    print_success "Nginx is running"
else
    print_warning "Nginx may not be running. Check with: sudo systemctl status nginx"
fi

if systemctl is-active --quiet postgresql; then
    print_success "PostgreSQL is running"
else
    print_warning "PostgreSQL may not be running. Check with: sudo systemctl status postgresql"
fi

# Check if application is accessible
if curl -f http://localhost:3031/health > /dev/null 2>&1; then
    print_success "Backend API is accessible"
else
    print_warning "Backend API may not be accessible yet"
fi

echo ""
echo "======================================================"
print_success "Legal Estate Professional Package Installation Complete!"
echo "======================================================"
echo ""
echo "📋 Installation Summary:"
echo "  • Package Type: Professional (Team collaboration)"
echo "  • User Limit: 25 users maximum"
echo "  • Database: PostgreSQL"
echo "  • AI Providers: OpenAI + Ollama (hybrid)"
echo "  • Installation Directory: $INSTALL_DIR"
echo ""
echo "🌐 Access Information:"
if [ "$DOMAIN_NAME" != "localhost" ]; then
    echo "  • Web Interface: https://$DOMAIN_NAME"
else
    echo "  • Web Interface: http://localhost"
fi
echo "  • Admin Email: $ADMIN_EMAIL"
echo "  • Backend Port: 3031"
echo "  • Frontend Port: 80/443"
echo ""
echo "🔧 System Services:"
echo "  • Backend: sudo systemctl status legal-estate-professional"
echo "  • Nginx: sudo systemctl status nginx"
echo "  • PostgreSQL: sudo systemctl status postgresql"
echo "  • Redis: sudo systemctl status redis-server"
echo "  • Ollama: sudo systemctl status ollama"
echo ""
echo "🤖 AI Features:"
echo "  • Local AI: Ollama (Llama 3, Mistral, CodeLlama)"
echo "  • Cloud AI: OpenAI, Anthropic (configure API keys in settings)"
echo "  • Document analysis and generation"
echo "  • Case summaries and legal research"
echo ""
echo "👥 Team Features:"
echo "  • Role-based permissions (Attorney, Paralegal, Assistant)"
echo "  • Task delegation and assignment"
echo "  • Document sharing and collaboration"
echo "  • Team messaging and communication"
echo "  • Case team management"
echo "  • Time tracking and billing"
echo ""
echo "💾 Backup:"
echo "  • Manual: /usr/local/bin/backup-legal-estate-professional"
echo "  • Automatic: Daily at 2:00 AM"
echo "  • Location: /opt/legal-estate-backups"
echo ""
echo "📁 Important Directories:"
echo "  • Application: $INSTALL_DIR"
echo "  • Database: PostgreSQL ($DB_NAME)"
echo "  • Uploads: $INSTALL_DIR/backend/uploads"
echo "  • Logs: $INSTALL_DIR/backend/logs"
echo ""
print_warning "NEXT STEPS:"
echo "1. Open your web interface and login with admin credentials"
echo "2. Complete the initial setup wizard"
echo "3. Configure AI API keys in Settings > AI Configuration"
echo "4. Add team members in Settings > User Management"
echo "5. Set up integrations (Slack, Teams) if needed"
echo "6. Create your first case and invite team members!"
echo ""
print_warning "SECURITY REMINDERS:"
echo "• Change the default admin password immediately"
echo "• Configure 2FA for all admin users"
echo "• Review firewall settings for your environment"
echo "• Set up regular database backups"
echo "• Monitor system logs regularly"
echo ""
echo "📧 Need help? Contact support@legalestate.tech"
echo ""

exit 0