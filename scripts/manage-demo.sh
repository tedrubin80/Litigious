#!/bin/bash

# Legal Estate Demo Management Script
# Provides manual control over demo environment

# Configuration
SCRIPT_DIR="/var/www/html/scripts"
BACKEND_DIR="/var/www/html/backend"
FRONTEND_DIR="/var/www/html/frontend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
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

# Show current demo status
show_status() {
    echo "============================================"
    echo "    Legal Estate Demo Status"
    echo "============================================"
    echo

    # Check if in demo mode
    if [ -f "$BACKEND_DIR/.env" ] && grep -q "DEMO_MODE=true" "$BACKEND_DIR/.env"; then
        print_success "Demo mode: ENABLED"
    else
        print_warning "Demo mode: DISABLED"
    fi

    # Check last reset time
    if [ -f "$BACKEND_DIR/.env" ] && grep -q "LAST_DEMO_RESET=" "$BACKEND_DIR/.env"; then
        local last_reset=$(grep "LAST_DEMO_RESET=" "$BACKEND_DIR/.env" | cut -d'=' -f2)
        echo "Last reset: $last_reset"
    else
        echo "Last reset: Never"
    fi

    # Check cron job
    if crontab -l 2>/dev/null | grep -q "reset-demo.sh"; then
        print_success "Auto-reset: ENABLED (3 AM UTC daily)"
    else
        print_warning "Auto-reset: DISABLED"
    fi

    # Check services
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        print_success "Backend: RUNNING"
    else
        print_error "Backend: NOT RESPONDING"
    fi

    if curl -f http://localhost:80 > /dev/null 2>&1; then
        print_success "Frontend: ACCESSIBLE"
    else
        print_warning "Frontend: CHECK NGINX"
    fi

    # Check demo users
    cd "$BACKEND_DIR"
    if node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        prisma.user.count({where: {email: {contains: '@legalestate.tech'}}})
        .then(count => {
            console.log('Demo users: ' + count);
            process.exit(0);
        })
        .catch(() => {
            console.log('Demo users: ERROR');
            process.exit(1);
        });
    " 2>/dev/null; then
        true
    else
        print_error "Database: CONNECTION FAILED"
    fi
    cd - > /dev/null

    echo
}

# Enable demo mode
enable_demo() {
    print_step "Enabling demo mode..."

    if [ ! -f "$BACKEND_DIR/.env.demo" ]; then
        print_error "Demo configuration files not found!"
        return 1
    fi

    # Copy demo configurations
    cp "$BACKEND_DIR/.env.demo" "$BACKEND_DIR/.env"
    cp "$FRONTEND_DIR/.env.demo" "$FRONTEND_DIR/.env"

    # Restart services
    systemctl restart legal-estate-backend 2>/dev/null || true
    systemctl restart legal-estate-frontend 2>/dev/null || true
    systemctl reload nginx 2>/dev/null || true

    print_success "Demo mode enabled"
}

# Disable demo mode (revert to production)
disable_demo() {
    print_step "Disabling demo mode..."

    print_warning "This will revert to production configuration!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_step "Demo mode remains enabled"
        return 0
    fi

    # Restore production configurations
    if [ -f "$BACKEND_DIR/.env.production" ]; then
        cp "$BACKEND_DIR/.env.production" "$BACKEND_DIR/.env"
    else
        print_error "Production backend configuration not found!"
        return 1
    fi

    if [ -f "$FRONTEND_DIR/.env.production" ]; then
        cp "$FRONTEND_DIR/.env.production" "$FRONTEND_DIR/.env"
    else
        print_warning "Production frontend configuration not found, using default"
    fi

    # Restart services
    systemctl restart legal-estate-backend 2>/dev/null || true
    systemctl restart legal-estate-frontend 2>/dev/null || true
    systemctl reload nginx 2>/dev/null || true

    print_success "Demo mode disabled - reverted to production"
}

# Run manual reset
manual_reset() {
    print_step "Running manual demo reset..."

    print_warning "This will reset all demo data immediately!"
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_step "Manual reset cancelled"
        return 0
    fi

    # Run the reset script
    if [ -f "$SCRIPT_DIR/reset-demo.sh" ]; then
        "$SCRIPT_DIR/reset-demo.sh"
    else
        print_error "Demo reset script not found!"
        return 1
    fi
}

# Show demo credentials
show_credentials() {
    echo "============================================"
    echo "    Demo Login Credentials"
    echo "============================================"
    echo
    echo "🔐 Administrator Account:"
    echo "   Email:    demo@legalestate.tech"
    echo "   Password: demo123"
    echo "   Role:     Admin (full access)"
    echo
    echo "👤 User Account:"
    echo "   Email:    user@legalestate.tech"
    echo "   Password: user123"
    echo "   Role:     Attorney"
    echo
    echo "📋 Paralegal Account:"
    echo "   Email:    paralegal@legalestate.tech"
    echo "   Password: paralegal123"
    echo "   Role:     Paralegal"
    echo
    echo "🌐 Demo URL: https://legalestate.tech"
    echo "📧 Support:  support@legalestate.tech"
    echo
}

# Setup auto-reset
setup_auto_reset() {
    print_step "Setting up automatic demo reset..."

    # Add cron job if not exists
    if ! crontab -l 2>/dev/null | grep -q "reset-demo.sh"; then
        (crontab -l 2>/dev/null; echo "0 3 * * * /var/www/html/scripts/reset-demo.sh >> /var/www/html/logs/demo-reset.log 2>&1") | crontab -
        print_success "Auto-reset enabled: Daily at 3 AM UTC"
    else
        print_success "Auto-reset already enabled"
    fi
}

# Disable auto-reset
disable_auto_reset() {
    print_step "Disabling automatic demo reset..."

    # Remove cron job
    (crontab -l 2>/dev/null | grep -v "reset-demo.sh") | crontab -
    print_success "Auto-reset disabled"
}

# Show logs
show_logs() {
    local log_type=${1:-demo}

    case $log_type in
        demo)
            echo "=== Demo Reset Logs ==="
            if [ -f "/var/www/html/logs/demo-reset.log" ]; then
                tail -50 "/var/www/html/logs/demo-reset.log"
            else
                print_warning "No demo reset logs found"
            fi
            ;;
        backend)
            echo "=== Backend Logs ==="
            if [ -f "$BACKEND_DIR/logs/server.log" ]; then
                tail -50 "$BACKEND_DIR/logs/server.log"
            else
                print_warning "No backend logs found"
            fi
            ;;
        nginx)
            echo "=== Nginx Logs ==="
            tail -50 /var/log/nginx/access.log 2>/dev/null || print_warning "Nginx logs not accessible"
            ;;
        *)
            print_error "Unknown log type: $log_type"
            echo "Available: demo, backend, nginx"
            ;;
    esac
}

# Show usage
show_usage() {
    echo "Legal Estate Demo Management Tool"
    echo
    echo "Usage: $0 [command]"
    echo
    echo "Commands:"
    echo "  status           Show current demo status"
    echo "  enable           Enable demo mode"
    echo "  disable          Disable demo mode (revert to production)"
    echo "  reset            Run manual demo reset"
    echo "  credentials      Show demo login credentials"
    echo "  auto-reset       Enable automatic daily reset"
    echo "  no-auto-reset    Disable automatic reset"
    echo "  logs [type]      Show logs (demo|backend|nginx)"
    echo "  help             Show this help message"
    echo
    echo "Examples:"
    echo "  $0 status                # Check demo status"
    echo "  $0 reset                 # Reset demo data now"
    echo "  $0 logs demo             # Show demo reset logs"
    echo "  $0 credentials           # Show login info"
    echo
}

# Main execution
main() {
    local command=${1:-status}

    case $command in
        status)
            show_status
            ;;
        enable)
            enable_demo
            ;;
        disable)
            disable_demo
            ;;
        reset)
            manual_reset
            ;;
        credentials)
            show_credentials
            ;;
        auto-reset)
            setup_auto_reset
            ;;
        no-auto-reset)
            disable_auto_reset
            ;;
        logs)
            show_logs "$2"
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            print_error "Unknown command: $command"
            echo
            show_usage
            exit 1
            ;;
    esac
}

# Check if running as root for certain operations
if [[ "$1" == "enable" || "$1" == "disable" || "$1" == "reset" ]]; then
    if [ "$EUID" -ne 0 ]; then
        print_error "This operation requires root privileges. Use sudo."
        exit 1
    fi
fi

# Run main function
main "$@"