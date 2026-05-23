#!/bin/bash

# Legal Estate System Backup Script
# Backs up database, files, and configurations

set -e  # Exit on error

# Configuration
BACKUP_DIR="/mnt/legal-estate-backups"
PROJECT_DIR="/var/www/html"
DB_NAME="legal_estate"
DB_USER="legalestate_admin"
DB_PASSWORD="LegalTechSecure2024"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="legal_estate_backup_$TIMESTAMP"

# Retention settings (keep backups for 30 days)
RETENTION_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$BACKUP_DIR/backup.log"
}

log "Starting backup: $BACKUP_NAME"

# Create timestamped backup directory
CURRENT_BACKUP_DIR="$BACKUP_DIR/$BACKUP_NAME"
mkdir -p "$CURRENT_BACKUP_DIR"

# 1. Database backup
log "Backing up PostgreSQL database..."
PGPASSWORD="$DB_PASSWORD" pg_dump \
    --host=localhost \
    --username="$DB_USER" \
    --dbname="$DB_NAME" \
    --no-password \
    --verbose \
    --clean \
    --if-exists \
    --format=custom \
    > "$CURRENT_BACKUP_DIR/database.sql" 2>>"$BACKUP_DIR/backup.log"

if [ $? -eq 0 ]; then
    log "Database backup completed successfully"
else
    log "ERROR: Database backup failed"
    exit 1
fi

# 2. Application files backup
log "Backing up application files..."
tar -czf "$CURRENT_BACKUP_DIR/application_files.tar.gz" \
    --exclude="node_modules" \
    --exclude="*.log" \
    --exclude=".git" \
    --exclude="uploads/temp" \
    -C "$(dirname $PROJECT_DIR)" \
    "$(basename $PROJECT_DIR)" 2>>"$BACKUP_DIR/backup.log"

if [ $? -eq 0 ]; then
    log "Application files backup completed successfully"
else
    log "ERROR: Application files backup failed"
    exit 1
fi

# 3. Environment and configuration backup
log "Backing up environment and configuration..."
mkdir -p "$CURRENT_BACKUP_DIR/config"

# Copy important config files (excluding sensitive data)
cp "$PROJECT_DIR/backend/.env" "$CURRENT_BACKUP_DIR/config/.env.backup" 2>/dev/null || log "WARNING: .env file not found"
cp "$PROJECT_DIR/backend/package.json" "$CURRENT_BACKUP_DIR/config/" 2>/dev/null || log "WARNING: package.json not found"
cp "$PROJECT_DIR/backend/schema.prisma" "$CURRENT_BACKUP_DIR/config/" 2>/dev/null || log "WARNING: schema.prisma not found"

# Copy nginx configuration if it exists
if [ -f "/etc/nginx/sites-available/legal-estate" ]; then
    cp "/etc/nginx/sites-available/legal-estate" "$CURRENT_BACKUP_DIR/config/nginx-legal-estate.conf"
    log "Nginx configuration backed up"
fi

# 4. System information
log "Collecting system information..."
{
    echo "Backup created: $(date)"
    echo "System: $(uname -a)"
    echo "Node version: $(node --version 2>/dev/null || echo 'Not installed')"
    echo "PostgreSQL version: $(psql --version 2>/dev/null || echo 'Not installed')"
    echo "Nginx version: $(nginx -v 2>&1 || echo 'Not installed')"
    echo ""
    echo "Database size:"
    PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            schemaname,
            tablename,
            attname,
            n_distinct,
            most_common_vals
        FROM pg_stats 
        WHERE schemaname = 'public'
        ORDER BY schemaname, tablename;" 2>/dev/null || echo "Could not get database stats"
} > "$CURRENT_BACKUP_DIR/system_info.txt"

# 5. Create backup manifest
log "Creating backup manifest..."
{
    echo "Legal Estate System Backup Manifest"
    echo "=================================="
    echo "Backup ID: $BACKUP_NAME"
    echo "Created: $(date)"
    echo "Backup Directory: $CURRENT_BACKUP_DIR"
    echo ""
    echo "Contents:"
    ls -la "$CURRENT_BACKUP_DIR/"
    echo ""
    echo "Sizes:"
    du -h "$CURRENT_BACKUP_DIR/"*
} > "$CURRENT_BACKUP_DIR/manifest.txt"

# 6. Create compressed archive of entire backup
log "Creating compressed backup archive..."
cd "$BACKUP_DIR"
tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"

if [ $? -eq 0 ]; then
    # Remove uncompressed backup directory
    rm -rf "$CURRENT_BACKUP_DIR"
    log "Compressed backup created: ${BACKUP_NAME}.tar.gz"
else
    log "ERROR: Failed to create compressed backup"
    exit 1
fi

# 7. Clean up old backups
log "Cleaning up old backups (keeping last $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "legal_estate_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>>"$BACKUP_DIR/backup.log"

# 8. Backup verification
log "Verifying backup integrity..."
if tar -tzf "${BACKUP_NAME}.tar.gz" >/dev/null 2>&1; then
    log "Backup integrity check passed"
else
    log "ERROR: Backup integrity check failed"
    exit 1
fi

# 9. Calculate and log backup size
BACKUP_SIZE=$(du -h "${BACKUP_NAME}.tar.gz" | cut -f1)
log "Backup completed successfully: ${BACKUP_NAME}.tar.gz (Size: $BACKUP_SIZE)"

# 10. Send notification (if configured)
if command -v mail >/dev/null 2>&1 && [ ! -z "$BACKUP_EMAIL" ]; then
    echo "Legal Estate backup completed: $BACKUP_NAME (Size: $BACKUP_SIZE)" | \
        mail -s "Legal Estate Backup Success - $(hostname)" "$BACKUP_EMAIL"
fi

log "Backup script finished successfully"
exit 0