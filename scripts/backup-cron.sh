#!/bin/bash

# Cron wrapper for Legal Estate backup script
# This script sets up the proper environment for running via cron

# Set PATH for cron environment
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

# Set working directory
cd /var/www/html

# Run the backup script and capture output
/var/www/html/scripts/backup.sh

# Log the result
if [ $? -eq 0 ]; then
    logger "Legal Estate backup completed successfully"
else
    logger "Legal Estate backup failed with error code $?"
fi