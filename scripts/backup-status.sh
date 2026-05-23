#!/bin/bash

# Legal Estate System Backup Status Script
# Shows backup status and history

BACKUP_DIR="/var/backups/legal-estate"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Legal Estate System - Backup Status${NC}"
echo "========================================"

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${RED}❌ Backup directory not found: $BACKUP_DIR${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Backup directory: $BACKUP_DIR${NC}"

# Show disk usage
echo ""
echo -e "${BLUE}Backup Storage Usage:${NC}"
du -sh "$BACKUP_DIR" 2>/dev/null || echo "Could not determine size"

# Show available backups
echo ""
echo -e "${BLUE}Available Backups:${NC}"
if ls "$BACKUP_DIR"/*.tar.gz >/dev/null 2>&1; then
    echo "Filename | Size | Date"
    echo "---------|------|-----"
    ls -la "$BACKUP_DIR"/*.tar.gz | awk '{
        size = $5;
        if (size > 1024*1024*1024) size = sprintf("%.1fG", size/1024/1024/1024);
        else if (size > 1024*1024) size = sprintf("%.1fM", size/1024/1024);
        else if (size > 1024) size = sprintf("%.1fK", size/1024);
        else size = size "B";
        printf "%-40s | %8s | %s %s %s\n", $9, size, $6, $7, $8;
    }'
else
    echo -e "${YELLOW}⚠️  No backup files found${NC}"
fi

# Show last backup info
echo ""
echo -e "${BLUE}Last Backup Status:${NC}"
if [ -f "$BACKUP_DIR/backup.log" ]; then
    LAST_SUCCESS=$(grep "Backup completed successfully" "$BACKUP_DIR/backup.log" | tail -1)
    LAST_ERROR=$(grep "ERROR" "$BACKUP_DIR/backup.log" | tail -1)
    
    if [ ! -z "$LAST_SUCCESS" ]; then
        echo -e "${GREEN}✅ $LAST_SUCCESS${NC}"
    fi
    
    if [ ! -z "$LAST_ERROR" ]; then
        echo -e "${RED}❌ Last Error: $LAST_ERROR${NC}"
    fi
    
    echo ""
    echo "Recent log entries (last 10):"
    tail -10 "$BACKUP_DIR/backup.log"
else
    echo -e "${YELLOW}⚠️  No backup log found${NC}"
fi

# Check cron job
echo ""
echo -e "${BLUE}Cron Job Status:${NC}"
if crontab -l 2>/dev/null | grep -q "backup-cron.sh"; then
    echo -e "${GREEN}✅ Backup cronjob is installed${NC}"
    echo "Active cron entries:"
    crontab -l | grep backup
else
    echo -e "${RED}❌ Backup cronjob not found${NC}"
fi

# Show next scheduled backup
echo ""
echo -e "${BLUE}Next Scheduled Backup:${NC}"
echo "Daily: Tomorrow at 2:00 AM"
echo "Weekly: Next Sunday at 3:00 AM"

echo ""