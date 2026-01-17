#!/bin/bash

# Database restore script
set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file>"
    echo "Example: $0 backups/logogear_portal_backup_20260111_120000.sql.gz"
    exit 1
fi

BACKUP_FILE=$1

echo "🔄 Restoring database from backup: $BACKUP_FILE"

# Confirmation prompt
read -p "This will overwrite the current database. Are you sure? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Restore cancelled"
    exit 1
fi

# Stop application
echo "🛑 Stopping application..."
docker-compose stop app

# Restore database
echo "📥 Restoring database..."
if [[ $BACKUP_FILE == *.gz ]]; then
    gunzip -c $BACKUP_FILE | docker-compose exec -T db psql -U logogear -d logogear_portal
else
    cat $BACKUP_FILE | docker-compose exec -T db psql -U logogear -d logogear_portal
fi

# Start application
echo "▶️ Starting application..."
docker-compose start app

echo "✅ Database restore completed successfully!"