#!/bin/bash

# Legal Estate AI System Monitor
# Captures AI usage data, performance metrics, and system health
# Excludes model data - focuses on usage analytics

LOG_DATE=$(date '+%Y-%m-%d %H:%M:%S')
MONITOR_DIR="/var/www/html/logs/ai-monitoring"
DAILY_LOG="$MONITOR_DIR/ai-system-$(date '+%Y%m%d').json"
SUMMARY_LOG="$MONITOR_DIR/ai-summary.json"

# Create monitoring directory
mkdir -p "$MONITOR_DIR"

echo "[$LOG_DATE] AI System Monitoring Started" | tee -a "$MONITOR_DIR/monitor.log"

# Function to capture AI system metrics
capture_ai_metrics() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    
    # Ollama server status
    local ollama_status="offline"
    local ollama_version=""
    if curl -s http://localhost:11434/api/version >/dev/null 2>&1; then
        ollama_status="online"
        ollama_version=$(curl -s http://localhost:11434/api/version | grep -o '"version":"[^"]*' | cut -d'"' -f4)
    fi
    
    # System resources
    local memory_total=$(free -m | awk '/^Mem:/ {print $2}')
    local memory_used=$(free -m | awk '/^Mem:/ {print $3}')
    local memory_available=$(free -m | awk '/^Mem:/ {print $7}')
    
    # Disk space
    local disk_usage=$(df -h /var/www/html | awk 'NR==2 {print $5}' | tr -d '%')
    
    # Backend API status
    local backend_status="offline"
    if curl -s http://localhost:3001/api/health >/dev/null 2>&1; then
        backend_status="online"
    fi
    
    # Database connectivity
    local db_status="offline"
    if PGPASSWORD=LegalTechSecure2024 psql -U legalestate_admin -h localhost -d legal_estate -c "SELECT 1;" >/dev/null 2>&1; then
        db_status="online"
    fi
    
    # AI Provider configurations (without sensitive data)
    local provider_count=0
    local enabled_providers=0
    if [ "$db_status" = "online" ]; then
        provider_count=$(PGPASSWORD=LegalTechSecure2024 psql -U legalestate_admin -h localhost -d legal_estate -t -c "SELECT COUNT(*) FROM \"AiProviderConfig\";" 2>/dev/null | xargs || echo "0")
        enabled_providers=$(PGPASSWORD=LegalTechSecure2024 psql -U legalestate_admin -h localhost -d legal_estate -t -c "SELECT COUNT(*) FROM \"AiProviderConfig\" WHERE enabled = true;" 2>/dev/null | xargs || echo "0")
    fi
    
    # Create JSON metrics
    cat > "$DAILY_LOG.tmp" <<EOF
{
    "timestamp": "$timestamp",
    "system": {
        "memory": {
            "total_mb": $memory_total,
            "used_mb": $memory_used,
            "available_mb": $memory_available,
            "usage_percent": $(echo "scale=2; $memory_used * 100 / $memory_total" | bc)
        },
        "disk": {
            "usage_percent": $disk_usage
        },
        "uptime": "$(uptime -p)"
    },
    "services": {
        "ollama": {
            "status": "$ollama_status",
            "version": "$ollama_version"
        },
        "backend": {
            "status": "$backend_status"
        },
        "database": {
            "status": "$db_status"
        }
    },
    "ai_providers": {
        "total_configured": $provider_count,
        "enabled_count": $enabled_providers
    },
    "monitoring": {
        "script_version": "1.0",
        "log_location": "$DAILY_LOG"
    }
}
EOF
    
    # Move temp file to final location
    mv "$DAILY_LOG.tmp" "$DAILY_LOG"
}

# Function to update summary statistics
update_summary() {
    local current_time=$(date +%s)
    local hour=$(date '+%H')
    
    # Create or update summary file
    if [ ! -f "$SUMMARY_LOG" ]; then
        echo '{"daily_checks": 0, "uptime_percentage": 100, "last_update": 0}' > "$SUMMARY_LOG"
    fi
    
    # Read current summary
    local daily_checks=$(cat "$SUMMARY_LOG" | grep -o '"daily_checks":[0-9]*' | cut -d':' -f2 || echo "0")
    local new_count=$((daily_checks + 1))
    
    # Update summary with current metrics
    cat > "$SUMMARY_LOG.tmp" <<EOF
{
    "last_update": $current_time,
    "daily_checks": $new_count,
    "last_check_hour": "$hour",
    "monitoring_active": true,
    "log_retention_days": 30
}
EOF
    
    mv "$SUMMARY_LOG.tmp" "$SUMMARY_LOG"
}

# Function to cleanup old logs (keep 30 days)
cleanup_old_logs() {
    find "$MONITOR_DIR" -name "ai-system-*.json" -mtime +30 -delete 2>/dev/null || true
    echo "[$LOG_DATE] Cleaned up logs older than 30 days"
}

# Main execution
echo "[$LOG_DATE] Capturing AI system metrics..." | tee -a "$MONITOR_DIR/monitor.log"
capture_ai_metrics

echo "[$LOG_DATE] Updating summary statistics..." | tee -a "$MONITOR_DIR/monitor.log"
update_summary

echo "[$LOG_DATE] Cleaning up old logs..." | tee -a "$MONITOR_DIR/monitor.log"
cleanup_old_logs

echo "[$LOG_DATE] AI System Monitoring Complete" | tee -a "$MONITOR_DIR/monitor.log"
echo "Daily log: $DAILY_LOG"
echo "Summary: $SUMMARY_LOG"