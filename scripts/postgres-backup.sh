#!/bin/bash

# PostgreSQL Database Backup & Restore Script
# Usage: ./postgres-backup.sh [backup|restore] [backup-file]

# Extract database connection from DATABASE_URL
DB_URL="${DATABASE_URL}"
DB_HOST=$(echo $DB_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DB_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo $DB_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
DB_PASSWORD=$(echo $DB_URL | sed -n 's/.*:\([^@]*\)@.*/\1/p')

# Create temporary .pgpass file for secure authentication
PGPASS_FILE=$(mktemp)
chmod 600 "$PGPASS_FILE"
echo "${DB_HOST}:${DB_PORT}:${DB_NAME}:${DB_USER}:${DB_PASSWORD}" > "$PGPASS_FILE"
export PGPASSFILE="$PGPASS_FILE"

# Cleanup function to remove .pgpass file
cleanup() {
    rm -f "$PGPASS_FILE"
    unset PGPASSFILE
}
trap cleanup EXIT

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="database_backup_${TIMESTAMP}.sql"

backup() {
    echo "🔄 Creating PostgreSQL backup..."
    pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > $BACKUP_FILE
    echo "✅ Backup created: $BACKUP_FILE"
    echo "📊 Backup size: $(du -h $BACKUP_FILE | cut -f1)"
}

restore() {
    local file=$1
    if [ -z "$file" ]; then
        echo "❌ Please specify backup file to restore"
        echo "Usage: ./postgres-backup.sh restore backup_file.sql"
        exit 1
    fi
    
    if [ ! -f "$file" ]; then
        echo "❌ Backup file not found: $file"
        exit 1
    fi
    
    echo "🔄 Restoring from $file..."
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME < $file
    echo "✅ Database restored successfully"
}

# Command handling
case "$1" in
    backup)
        backup
        ;;
    restore)
        restore "$2"
        ;;
    *)
        echo "Usage:"
        echo "  $0 backup"
        echo "  $0 restore <backup-file>"
        exit 1
        ;;
esac
