#!/bin/bash

# Legal Estate Production Mode Script
# Switches the system from demo mode to production mode

set -e

# Configuration
SCRIPT_DIR="/var/www/html/scripts"
BACKEND_DIR="/var/www/html/backend"
FRONTEND_DIR="/var/www/html/frontend"
LOG_FILE="/var/www/html/logs/production-mode.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S UTC')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

print_step() {
    log_message "INFO" "${BLUE}[STEP]${NC} $1"
}

print_success() {
    log_message "SUCCESS" "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    log_message "WARNING" "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    log_message "ERROR" "${RED}[ERROR]${NC} $1"
}

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

print_step "Switching Legal Estate to Production Mode - $(date)"

# Check if production configurations exist
check_production_config() {
    print_step "Checking production configuration files..."

    local errors=0

    if [ ! -f "$BACKEND_DIR/.env.production" ]; then
        print_warning "Production backend configuration not found. Creating from current settings."

        # Create production config from current .env
        if [ -f "$BACKEND_DIR/.env" ]; then
            cp "$BACKEND_DIR/.env" "$BACKEND_DIR/.env.production"

            # Remove demo-specific settings
            sed -i '/DEMO_MODE/d' "$BACKEND_DIR/.env.production"
            sed -i '/DEMO_/d' "$BACKEND_DIR/.env.production"

            # Set production values
            echo "NODE_ENV=production" >> "$BACKEND_DIR/.env.production"
            echo "PACKAGE_TYPE=production" >> "$BACKEND_DIR/.env.production"
            echo "DEMO_MODE=false" >> "$BACKEND_DIR/.env.production"

            print_success "Created production backend configuration"
        else
            print_error "No backend configuration found to create production config from"
            errors=$((errors + 1))
        fi
    else
        print_success "Production backend configuration found"
    fi

    if [ ! -f "$FRONTEND_DIR/.env.production" ]; then
        print_warning "Production frontend configuration not found. Creating default."

        cat > "$FRONTEND_DIR/.env.production" << EOF
# Legal Estate Production Frontend Environment
REACT_APP_API_URL=https://legalestate.tech/api
REACT_APP_PACKAGE_TYPE=production
REACT_APP_VERSION=1.0.0

# Production Mode Settings
REACT_APP_DEMO_MODE=false
REACT_APP_DEMO_BANNER=false

# Production Features
REACT_APP_SHOW_DEMO_CREDENTIALS=false
REACT_APP_DISABLE_REGISTRATION=true
REACT_APP_SHOW_RESET_WARNING=false

# Production Contact
REACT_APP_SUPPORT_EMAIL=support@legalestate.tech

# Analytics (configure as needed)
REACT_APP_GOOGLE_ANALYTICS=
REACT_APP_HOTJAR_ID=

# Production Settings
REACT_APP_SHOW_DEMO_HINTS=false
REACT_APP_WATERMARK_TEXT=
EOF
        print_success "Created production frontend configuration"
    else
        print_success "Production frontend configuration found"
    fi

    if [ $errors -gt 0 ]; then
        print_error "Configuration check failed with $errors errors"
        return 1
    fi

    print_success "Production configuration check completed"
}

# Backup current configuration
backup_current_config() {
    print_step "Backing up current configuration..."

    local backup_timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_dir="/mnt/HC_Volume_103150588/config-backups"

    mkdir -p "$backup_dir"

    # Backup current environment files
    if [ -f "$BACKEND_DIR/.env" ]; then
        cp "$BACKEND_DIR/.env" "$backup_dir/backend.env.$backup_timestamp"
    fi

    if [ -f "$FRONTEND_DIR/.env" ]; then
        cp "$FRONTEND_DIR/.env" "$backup_dir/frontend.env.$backup_timestamp"
    fi

    # Keep only last 10 backups
    find "$backup_dir" -name "*.env.*" -type f | sort -r | tail -n +21 | xargs rm -f 2>/dev/null || true

    print_success "Configuration backed up to external drive"
}

# Stop services gracefully
stop_services() {
    print_step "Stopping services for production switch..."

    # Stop PM2 processes if running
    if command -v pm2 &> /dev/null; then
        pm2 stop all 2>/dev/null || true
        pm2 delete all 2>/dev/null || true
    fi

    # Stop systemd services
    systemctl stop legal-estate-backend 2>/dev/null || true
    systemctl stop legal-estate-frontend 2>/dev/null || true

    # Kill any remaining Node processes
    pkill -f "node.*server.js" 2>/dev/null || true
    pkill -f "npm.*start" 2>/dev/null || true

    # Wait for processes to stop
    sleep 5

    print_success "Services stopped"
}

# Disable demo-related cron jobs
disable_demo_features() {
    print_step "Disabling demo-specific features..."

    # Remove demo reset cron job
    (crontab -l 2>/dev/null | grep -v "reset-demo.sh") | crontab - 2>/dev/null || true

    print_success "Demo features disabled"
}

# Switch to production configuration
switch_to_production() {
    print_step "Switching to production configuration..."

    # Copy production configurations
    cp "$BACKEND_DIR/.env.production" "$BACKEND_DIR/.env"
    cp "$FRONTEND_DIR/.env.production" "$FRONTEND_DIR/.env"

    # Update production timestamp
    local switch_time=$(date -u '+%Y-%m-%d %H:%M:%S UTC')
    echo "PRODUCTION_MODE_ENABLED=$switch_time" >> "$BACKEND_DIR/.env"

    print_success "Production configuration activated"
}

# Rebuild frontend for production
rebuild_frontend() {
    print_step "Rebuilding frontend for production..."

    cd "$FRONTEND_DIR"

    if [ -f "package.json" ] && [ -d "node_modules" ]; then
        npm run build
        if [ $? -eq 0 ]; then
            print_success "Frontend rebuilt for production"
        else
            print_error "Frontend build failed"
            return 1
        fi
    else
        print_error "Frontend dependencies missing"
        return 1
    fi

    cd - > /dev/null
}

# Clear demo data and reset to production data
reset_to_production_data() {
    print_step "Resetting to production data..."

    read -p "This will clear demo data and reset to production. Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_step "Production data reset skipped"
        return 0
    fi

    cd "$BACKEND_DIR"

    # Check if database is accessible
    if ! node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.\$connect().then(() => { console.log('DB Connected'); process.exit(0); }).catch(() => process.exit(1));" 2>/dev/null; then
        print_error "Database connection failed. Skipping data reset."
        return 1
    fi

    # Remove demo users but keep production admin
    node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        async function resetToProduction() {
            // Remove demo-specific users
            await prisma.user.deleteMany({
                where: {
                    email: {
                        in: ['demo@legalestate.tech', 'user@legalestate.tech', 'paralegal@legalestate.tech']
                    }
                }
            });

            // Clear demo cases and clients
            await prisma.task.deleteMany();
            await prisma.document.deleteMany();
            await prisma.case.deleteMany();
            await prisma.client.deleteMany();

            console.log('Demo data cleared for production');
        }

        resetToProduction().catch(console.error).finally(() => prisma.\$disconnect());
    " 2>/dev/null || print_warning "Demo data cleanup had some issues"

    cd - > /dev/null

    print_success "Production data reset completed"
}

# Update Nginx configuration for production
update_nginx_config() {
    print_step "Updating Nginx configuration for production..."

    # Check if production nginx config exists
    if [ ! -f "/etc/nginx/sites-available/legalestate.tech" ]; then
        print_warning "Production Nginx configuration not found. Using current config."
        return 0
    fi

    # Ensure production site is enabled
    ln -sf /etc/nginx/sites-available/legalestate.tech /etc/nginx/sites-enabled/ 2>/dev/null || true

    # Test and reload Nginx
    if nginx -t 2>/dev/null; then
        systemctl reload nginx
        print_success "Nginx configuration updated for production"
    else
        print_error "Nginx configuration test failed"
        return 1
    fi
}

# Setup production monitoring
setup_production_monitoring() {
    print_step "Setting up production monitoring..."

    # Create production monitoring script
    cat > /usr/local/bin/monitor-production-health << 'EOF'
#!/bin/bash

LOG_FILE="/var/www/html/logs/production-health.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] Starting production health check..." >> $LOG_FILE

# Check backend health
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "[$DATE] Backend: HEALTHY" >> $LOG_FILE
else
    echo "[$DATE] Backend: UNHEALTHY - Restarting service" >> $LOG_FILE
    systemctl restart legal-estate-backend
fi

# Check database connectivity
if PGPASSWORD=LegalTechSecure2024 psql -h localhost -U legalestate_admin -d legal_estate -c "SELECT 1;" > /dev/null 2>&1; then
    echo "[$DATE] Database: HEALTHY" >> $LOG_FILE
else
    echo "[$DATE] Database: UNHEALTHY" >> $LOG_FILE
fi

# Check SSL certificate (if applicable)
if curl -f https://legalestate.tech > /dev/null 2>&1; then
    echo "[$DATE] SSL: HEALTHY" >> $LOG_FILE
else
    echo "[$DATE] SSL: CHECK REQUIRED" >> $LOG_FILE
fi
EOF

    chmod +x /usr/local/bin/monitor-production-health

    # Setup production monitoring cron job every 15 minutes
    (crontab -l 2>/dev/null | grep -v "monitor-production-health"; echo "*/15 * * * * /usr/local/bin/monitor-production-health") | crontab -

    print_success "Production monitoring configured"
}

# Create production management script
create_production_management() {
    print_step "Creating production management script..."

    cat > "$SCRIPT_DIR/manage-production.sh" << 'EOF'
#!/bin/bash

# Legal Estate Production Management Script

BACKEND_DIR="/var/www/html/backend"
FRONTEND_DIR="/var/www/html/frontend"

case "$1" in
    status)
        echo "=== Legal Estate Production Status ==="
        echo "Mode: $(grep -q "DEMO_MODE=false" $BACKEND_DIR/.env && echo "PRODUCTION" || echo "DEMO")"
        echo "Backend: $(curl -f http://localhost:3001/health > /dev/null 2>&1 && echo "RUNNING" || echo "DOWN")"
        echo "Frontend: $(curl -f http://localhost:80 > /dev/null 2>&1 && echo "ACCESSIBLE" || echo "DOWN")"
        echo "Database: $(PGPASSWORD=LegalTechSecure2024 psql -h localhost -U legalestate_admin -d legal_estate -c "SELECT 1;" > /dev/null 2>&1 && echo "CONNECTED" || echo "ERROR")"
        ;;
    restart)
        echo "Restarting production services..."
        systemctl restart legal-estate-backend
        systemctl restart legal-estate-frontend
        systemctl reload nginx
        echo "Services restarted"
        ;;
    logs)
        tail -f /var/www/html/logs/production-health.log
        ;;
    backup)
        echo "Creating production backup..."
        /var/www/html/scripts/backup-cron.sh
        ;;
    *)
        echo "Usage: $0 {status|restart|logs|backup}"
        exit 1
        ;;
esac
EOF

    chmod +x "$SCRIPT_DIR/manage-production.sh"

    print_success "Production management script created"
}

# Start production services
start_production_services() {
    print_step "Starting production services..."

    # Start systemd services
    systemctl enable legal-estate-backend 2>/dev/null || true
    systemctl start legal-estate-backend 2>/dev/null || true
    systemctl enable legal-estate-frontend 2>/dev/null || true
    systemctl start legal-estate-frontend 2>/dev/null || true

    # Start Nginx
    systemctl enable nginx
    systemctl start nginx

    # Give services time to start
    sleep 10

    # Check if services are running
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        print_success "Backend service started successfully"
    else
        print_warning "Backend service may not be responding yet"
    fi

    if curl -f http://localhost:80 > /dev/null 2>&1; then
        print_success "Frontend service accessible"
    else
        print_warning "Frontend service may not be accessible yet"
    fi

    print_success "Production services started"
}

# Verify production setup
verify_production() {
    print_step "Verifying production setup..."

    local errors=0

    # Check environment files
    if grep -q "DEMO_MODE=false" "$BACKEND_DIR/.env"; then
        print_success "Backend in production mode"
    else
        print_error "Backend not in production mode"
        errors=$((errors + 1))
    fi

    if grep -q "REACT_APP_DEMO_MODE=false" "$FRONTEND_DIR/.env"; then
        print_success "Frontend in production mode"
    else
        print_error "Frontend not in production mode"
        errors=$((errors + 1))
    fi

    # Check services
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        print_success "Backend service responding"
    else
        print_error "Backend service not responding"
        errors=$((errors + 1))
    fi

    # Check if demo cron jobs are disabled
    if ! crontab -l 2>/dev/null | grep -q "reset-demo.sh"; then
        print_success "Demo reset cron job disabled"
    else
        print_warning "Demo reset cron job still active"
    fi

    if [ $errors -eq 0 ]; then
        print_success "Production verification completed successfully"
        return 0
    else
        print_error "Production verification found $errors issues"
        return 1
    fi
}

# Main execution
main() {
    local start_time=$(date +%s)

    echo "============================================"
    echo "  Legal Estate Production Mode Setup       "
    echo "============================================"
    echo

    print_warning "This will switch from demo mode to production mode!"
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_step "Production mode setup cancelled"
        exit 0
    fi

    # Execute production setup steps
    check_production_config
    backup_current_config
    stop_services
    disable_demo_features
    switch_to_production
    rebuild_frontend
    reset_to_production_data
    update_nginx_config
    setup_production_monitoring
    create_production_management
    start_production_services
    verify_production

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    print_success "=== Production Mode Setup Completed in ${duration} seconds ==="
    print_success "Legal Estate is now running in PRODUCTION MODE"

    echo
    echo "🎉 Production Mode Active!"
    echo
    echo "📊 Production Features:"
    echo "  • Demo credentials disabled"
    echo "  • Demo reset cron job removed"
    echo "  • Production monitoring enabled"
    echo "  • Real user data only"
    echo
    echo "🔧 Management Commands:"
    echo "  • Status: $SCRIPT_DIR/manage-production.sh status"
    echo "  • Restart: $SCRIPT_DIR/manage-production.sh restart"
    echo "  • Logs: $SCRIPT_DIR/manage-production.sh logs"
    echo "  • Backup: $SCRIPT_DIR/manage-production.sh backup"
    echo
    echo "⚠️  Important:"
    echo "  • Configure SSL certificates for production"
    echo "  • Update DNS settings to point to this server"
    echo "  • Set up external monitoring and alerts"
    echo "  • Configure backup strategy for production data"
    echo

    # Log production mode activation
    echo "$(date -u '+%Y-%m-%d %H:%M:%S UTC') - Production mode activated (${duration}s)" >> "/mnt/HC_Volume_103150588/production-history.log"
}

# Error handling
set -e
trap 'print_error "Production setup failed at line $LINENO. Check logs for details."; exit 1' ERR

# Run main function
main "$@"