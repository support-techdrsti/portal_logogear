#!/bin/bash

# Database backup script
set -e

echo "💾 Creating database backup..."

# Configuration
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/logogear_portal_backup_$DATE.sql"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
docker-compose exec -T db pg_dump -U logogear logogear_portal > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Clean old backups (keep last 7 days)
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "✅ Database backup created: ${BACKUP_FILE}.gz"