#!/bin/bash

# Legal Estate System Restore Script
# Restores database and files from backup

set -e  # Exit on error

# Configuration
BACKUP_DIR="/var/backups/legal-estate"
PROJECT_DIR="/var/www/html"
DB_NAME="legal_estate"
DB_USER="legal_user"
DB_PASSWORD="legal_password"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Log function
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Usage function
usage() {
    echo "Usage: $0 <backup_name> [options]"
    echo ""
    echo "Options:"
    echo "  --database-only    Restore only the database"
    echo "  --files-only      Restore only application files"
    echo "  --config-only     Restore only configuration files"
    echo "  --force          Skip confirmation prompts"
    echo "  --list           List available backups"
    echo ""
    echo "Examples:"
    echo "  $0 --list"
    echo "  $0 legal_estate_backup_20250828_173520"
    echo "  $0 legal_estate_backup_20250828_173520 --database-only"
    exit 1
}

# List available backups
list_backups() {
    log "Available backups in $BACKUP_DIR:"
    if [ -d "$BACKUP_DIR" ]; then
        ls -la "$BACKUP_DIR"/*.tar.gz 2>/dev/null | awk '{print $9, $5, $6, $7, $8}' | column -t
    else
        error "Backup directory not found: $BACKUP_DIR"
        exit 1
    fi
}

# Check if backup exists
check_backup() {
    local backup_name="$1"
    if [ ! -f "$BACKUP_DIR/${backup_name}.tar.gz" ]; then
        error "Backup not found: $BACKUP_DIR/${backup_name}.tar.gz"
        echo "Available backups:"
        list_backups
        exit 1
    fi
}

# Restore database
restore_database() {
    local backup_extract_dir="$1"
    
    if [ ! -f "$backup_extract_dir/database.sql" ]; then
        error "Database backup file not found in extracted backup"
        return 1
    fi
    
    log "Restoring database..."
    warn "This will DROP and RECREATE the database. All current data will be lost!"
    
    if [ "$FORCE" != "true" ]; then
        read -p "Are you sure you want to continue? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            error "Database restore cancelled"
            return 1
        fi
    fi
    
    # Drop and recreate database
    PGPASSWORD="$DB_PASSWORD" dropdb -h localhost -U "$DB_USER" "$DB_NAME" 2>/dev/null || true
    PGPASSWORD="$DB_PASSWORD" createdb -h localhost -U "$DB_USER" "$DB_NAME"
    
    # Restore database
    PGPASSWORD="$DB_PASSWORD" pg_restore \
        --host=localhost \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --no-password \
        --verbose \
        --clean \
        --if-exists \
        "$backup_extract_dir/database.sql"
    
    log "Database restore completed"
}

# Restore application files
restore_files() {
    local backup_extract_dir="$1"
    
    if [ ! -f "$backup_extract_dir/application_files.tar.gz" ]; then
        error "Application files backup not found in extracted backup"
        return 1
    fi
    
    log "Restoring application files..."
    warn "This will overwrite current application files!"
    
    if [ "$FORCE" != "true" ]; then
        read -p "Are you sure you want to continue? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            error "Files restore cancelled"
            return 1
        fi
    fi
    
    # Create backup of current files
    if [ -d "$PROJECT_DIR" ]; then
        mv "$PROJECT_DIR" "${PROJECT_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
        log "Current files backed up to ${PROJECT_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # Extract application files
    tar -xzf "$backup_extract_dir/application_files.tar.gz" -C "$(dirname $PROJECT_DIR)"
    
    log "Application files restore completed"
}

# Restore configuration
restore_config() {
    local backup_extract_dir="$1"
    
    if [ ! -d "$backup_extract_dir/config" ]; then
        error "Configuration backup not found in extracted backup"
        return 1
    fi
    
    log "Restoring configuration files..."
    
    # Restore .env file
    if [ -f "$backup_extract_dir/config/.env.backup" ]; then
        cp "$backup_extract_dir/config/.env.backup" "$PROJECT_DIR/backend/.env"
        log "Environment file restored"
    fi
    
    # Restore nginx config if it exists
    if [ -f "$backup_extract_dir/config/nginx-legal-estate.conf" ]; then
        sudo cp "$backup_extract_dir/config/nginx-legal-estate.conf" "/etc/nginx/sites-available/legal-estate"
        log "Nginx configuration restored"
    fi
    
    log "Configuration restore completed"
}

# Parse command line arguments
DATABASE_ONLY=false
FILES_ONLY=false
CONFIG_ONLY=false
FORCE=false
LIST_ONLY=false
BACKUP_NAME=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --database-only)
            DATABASE_ONLY=true
            shift
            ;;
        --files-only)
            FILES_ONLY=true
            shift
            ;;
        --config-only)
            CONFIG_ONLY=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --list)
            LIST_ONLY=true
            shift
            ;;
        --help|-h)
            usage
            ;;
        *)
            if [ -z "$BACKUP_NAME" ]; then
                BACKUP_NAME="$1"
            else
                error "Unknown argument: $1"
                usage
            fi
            shift
            ;;
    esac
done

# Handle list option
if [ "$LIST_ONLY" = "true" ]; then
    list_backups
    exit 0
fi

# Check if backup name is provided
if [ -z "$BACKUP_NAME" ]; then
    error "Backup name is required"
    usage
fi

# Check if backup exists
check_backup "$BACKUP_NAME"

# Create temporary extraction directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

log "Starting restore process for: $BACKUP_NAME"
log "Extracting backup to temporary directory..."

# Extract backup
tar -xzf "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" -C "$TEMP_DIR"
BACKUP_EXTRACT_DIR="$TEMP_DIR/$BACKUP_NAME"

# Show backup manifest
if [ -f "$BACKUP_EXTRACT_DIR/manifest.txt" ]; then
    log "Backup manifest:"
    cat "$BACKUP_EXTRACT_DIR/manifest.txt"
    echo ""
fi

# Perform restore based on options
if [ "$DATABASE_ONLY" = "true" ]; then
    restore_database "$BACKUP_EXTRACT_DIR"
elif [ "$FILES_ONLY" = "true" ]; then
    restore_files "$BACKUP_EXTRACT_DIR"
elif [ "$CONFIG_ONLY" = "true" ]; then
    restore_config "$BACKUP_EXTRACT_DIR"
else
    # Full restore
    log "Performing full system restore..."
    restore_database "$BACKUP_EXTRACT_DIR"
    restore_files "$BACKUP_EXTRACT_DIR"
    restore_config "$BACKUP_EXTRACT_DIR"
fi

log "Restore process completed successfully!"
log "You may need to restart services and run 'npm install' in the backend directory."