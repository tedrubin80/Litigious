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
