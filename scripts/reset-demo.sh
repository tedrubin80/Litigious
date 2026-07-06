#!/bin/bash

# Legal Estate Demo Reset Script
# Resets the demo environment to a clean state with fresh demo data
# Runs daily at 3 AM UTC via cron job

# Configuration
SCRIPT_DIR="/var/www/html/scripts"
BACKEND_DIR="/var/www/html/backend"
FRONTEND_DIR="/var/www/html/frontend"
LOG_FILE="/var/www/html/logs/demo-reset.log"
UPLOAD_DIR="/var/www/html/backend/uploads"
DEMO_BACKUP_DIR="/mnt/HC_Volume_103150588/demo-backups"

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
mkdir -p "$DEMO_BACKUP_DIR"

print_step "Starting Legal Estate Demo Reset - $(date)"

# Check if demo mode is enabled
check_demo_mode() {
    if [ ! -f "$BACKEND_DIR/.env.demo" ]; then
        print_error "Demo configuration not found. Aborting reset."
        exit 1
    fi

    # Check if currently in demo mode
    if ! grep -q "DEMO_MODE=true" "$BACKEND_DIR/.env" 2>/dev/null; then
        print_warning "System not in demo mode. Enabling demo mode."
        cp "$BACKEND_DIR/.env.demo" "$BACKEND_DIR/.env"
        cp "$FRONTEND_DIR/.env.demo" "$FRONTEND_DIR/.env"
    fi

    print_success "Demo mode configuration verified"
}

# Stop services gracefully
stop_services() {
    print_step "Stopping services for demo reset..."

    # Stop PM2 processes if running
    if command -v pm2 &> /dev/null; then
        pm2 stop all 2>/dev/null || true
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

# Backup current state before reset
backup_current_state() {
    print_step "Creating backup before reset..."

    local backup_timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$DEMO_BACKUP_DIR/demo-backup-$backup_timestamp.tar.gz"

    # Create compressed backup of uploads and logs
    tar -czf "$backup_file" \
        -C "$BACKEND_DIR" uploads/ logs/ \
        2>/dev/null || true

    # Keep only last 10 backups
    find "$DEMO_BACKUP_DIR" -name "demo-backup-*.tar.gz" -type f | \
        sort -r | tail -n +11 | xargs rm -f 2>/dev/null || true

    print_success "Backup created: $backup_file"
}

# Clear uploaded files
clear_uploads() {
    print_step "Clearing demo uploaded files..."

    if [ -d "$UPLOAD_DIR" ]; then
        # Remove all files but keep the directory structure
        find "$UPLOAD_DIR" -type f -delete 2>/dev/null || true

        # Recreate basic directory structure
        mkdir -p "$UPLOAD_DIR/documents"
        mkdir -p "$UPLOAD_DIR/images"
        mkdir -p "$UPLOAD_DIR/temp"

        # Set proper permissions
        chown -R www-data:www-data "$UPLOAD_DIR" 2>/dev/null || true
        chmod -R 755 "$UPLOAD_DIR" 2>/dev/null || true
    fi

    print_success "Upload directory cleared"
}

# Clear application logs
clear_logs() {
    print_step "Clearing application logs..."

    local log_dirs=("$BACKEND_DIR/logs" "/var/www/html/logs")

    for log_dir in "${log_dirs[@]}"; do
        if [ -d "$log_dir" ]; then
            # Keep only the demo-reset.log file
            find "$log_dir" -name "*.log" ! -name "demo-reset.log" -delete 2>/dev/null || true
        fi
    done

    print_success "Application logs cleared"
}

# Reset database and seed demo data
reset_database() {
    print_step "Resetting database and seeding demo data..."

    cd "$BACKEND_DIR"

    # Check if database is accessible
    if ! node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.\$connect().then(() => { console.log('DB Connected'); process.exit(0); }).catch(() => process.exit(1));" 2>/dev/null; then
        print_error "Database connection failed. Aborting reset."
        return 1
    fi

    # Run demo data seeding script
    if [ -f "scripts/seed-demo-data.js" ]; then
        node scripts/seed-demo-data.js
        if [ $? -eq 0 ]; then
            print_success "Demo data seeded successfully"
        else
            print_error "Failed to seed demo data"
            return 1
        fi
    else
        print_error "Demo seed script not found"
        return 1
    fi

    cd - > /dev/null
}

# Update demo configuration
update_demo_config() {
    print_step "Updating demo configuration..."

    # Ensure demo environment files are active
    cp "$BACKEND_DIR/.env.demo" "$BACKEND_DIR/.env"
    cp "$FRONTEND_DIR/.env.demo" "$FRONTEND_DIR/.env"

    # Update reset timestamp in config
    local reset_time=$(date -u '+%Y-%m-%d %H:%M:%S UTC')
    echo "LAST_DEMO_RESET=$reset_time" >> "$BACKEND_DIR/.env"

    print_success "Demo configuration updated"
}

# Rebuild frontend with demo settings
rebuild_frontend() {
    print_step "Rebuilding frontend with demo configuration..."

    cd "$FRONTEND_DIR"

    # Only rebuild if we have a build script and node_modules
    if [ -f "package.json" ] && [ -d "node_modules" ]; then
        npm run build > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            print_success "Frontend rebuilt with demo settings"

            # Restore custom demo files after build
            if [ -f "/var/www/html/scripts/restore-demo-files.sh" ]; then
                print_step "Restoring custom demo files..."
                /var/www/html/scripts/restore-demo-files.sh
                print_success "Demo files restored"
            fi
        else
            print_warning "Frontend rebuild failed, using existing build"
        fi
    else
        print_warning "Frontend build skipped (missing dependencies)"
    fi

    cd - > /dev/null
}

# Start services
start_services() {
    print_step "Starting demo services..."

    # Start systemd services if they exist
    systemctl start legal-estate-backend 2>/dev/null || true
    systemctl start legal-estate-frontend 2>/dev/null || true

    # Alternative: start with PM2 if available and configured
    if command -v pm2 &> /dev/null && [ -f "$BACKEND_DIR/ecosystem.config.js" ]; then
        cd "$BACKEND_DIR"
        pm2 start ecosystem.config.js --env demo 2>/dev/null || true
        cd - > /dev/null
    fi

    # Give services time to start
    sleep 10

    # Check if backend is responding
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        print_success "Backend service started successfully"
    else
        print_warning "Backend service may not be responding yet"
    fi

    print_success "Demo services started"
}

# Verify demo reset
verify_reset() {
    print_step "Verifying demo reset..."

    local errors=0

    # Check if demo users exist
    cd "$BACKEND_DIR"
    if node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        prisma.user.findFirst({where: {email: 'demo@litigious.online'}})
        .then(user => {
            if (user) {
                console.log('Demo admin user found');
                process.exit(0);
            } else {
                console.log('Demo admin user NOT found');
                process.exit(1);
            }
        })
        .catch(() => process.exit(1));
    " 2>/dev/null; then
        print_success "Demo users verified"
    else
        print_error "Demo users verification failed"
        errors=$((errors + 1))
    fi

    # Check if uploads directory is clean
    if [ -d "$UPLOAD_DIR" ] && [ "$(find "$UPLOAD_DIR" -type f | wc -l)" -eq 0 ]; then
        print_success "Upload directory verified clean"
    else
        print_warning "Upload directory may contain files"
    fi

    cd - > /dev/null

    if [ $errors -eq 0 ]; then
        print_success "Demo reset verification completed successfully"
        return 0
    else
        print_error "Demo reset verification found $errors issues"
        return 1
    fi
}

# Send notification (optional)
send_notification() {
    print_step "Sending demo reset notification..."

    local reset_time=$(date -u '+%Y-%m-%d %H:%M:%S UTC')
    local message="Legal Estate Demo has been reset successfully at $reset_time"

    # Log the notification
    log_message "INFO" "Demo reset notification: $message"

    # You can add email notification here if needed
    # echo "$message" | mail -s "Demo Reset Complete" admin@litigious.online

    print_success "Reset notification logged"
}

# Cleanup function
cleanup() {
    print_step "Performing cleanup..."

    # Remove any temporary files
    rm -f /tmp/demo-reset-* 2>/dev/null || true

    # Ensure proper file permissions
    chown -R www-data:www-data "$BACKEND_DIR/uploads" 2>/dev/null || true
    chown -R www-data:www-data "$FRONTEND_DIR/build" 2>/dev/null || true

    print_success "Cleanup completed"
}

# Main execution
main() {
    local start_time=$(date +%s)

    print_step "=== Legal Estate Demo Reset Started ==="

    # Execute reset steps
    check_demo_mode
    stop_services
    backup_current_state
    clear_uploads
    clear_logs
    reset_database
    update_demo_config
    rebuild_frontend
    start_services
    verify_reset
    send_notification
    cleanup

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    print_success "=== Demo Reset Completed in ${duration} seconds ==="
    print_success "Demo is ready for use with fresh data"
    print_success "Next reset scheduled for tomorrow at 3 AM UTC"

    # Log reset completion to a summary file
    echo "$(date -u '+%Y-%m-%d %H:%M:%S UTC') - Demo reset completed successfully (${duration}s)" >> "$DEMO_BACKUP_DIR/reset-history.log"
}

# Error handling
set -e
trap 'print_error "Demo reset failed at line $LINENO. Check logs for details."; exit 1' ERR

# Run main function
main "$@"