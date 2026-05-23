#!/bin/bash

# Backup Demo Source Changes
# This script backs up the key source files that have our demo modifications
# so they can be restored if needed

FRONTEND_DIR="/var/www/html/frontend"
BACKUP_DIR="/var/www/html/scripts/demo-source-backup"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "🔄 Backing up demo source modifications..."

# Backup App.js with no-auth changes
cp "$FRONTEND_DIR/src/App.js" "$BACKUP_DIR/App.js.demo"

# Backup Dashboard.js with demo user handling
cp "$FRONTEND_DIR/src/components/Dashboard/Dashboard.js" "$BACKUP_DIR/Dashboard.js.demo"

# Create a restore script
cat > "$BACKUP_DIR/restore-source.sh" << 'EOF'
#!/bin/bash
# Restore demo source modifications

FRONTEND_DIR="/var/www/html/frontend"
BACKUP_DIR="/var/www/html/scripts/demo-source-backup"

echo "🔄 Restoring demo source modifications..."

# Restore App.js
cp "$BACKUP_DIR/App.js.demo" "$FRONTEND_DIR/src/App.js"

# Restore Dashboard.js
cp "$BACKUP_DIR/Dashboard.js.demo" "$FRONTEND_DIR/src/components/Dashboard/Dashboard.js"

echo "✅ Demo source modifications restored"
echo "Remember to run 'npm run build' after restoring source files"
EOF

chmod +x "$BACKUP_DIR/restore-source.sh"

echo "✅ Demo source files backed up to: $BACKUP_DIR"
echo "✅ Use $BACKUP_DIR/restore-source.sh to restore if needed"