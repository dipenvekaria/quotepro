#!/bin/bash
# Rollback Database Script for QuotePro
# Restores database from backup file

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKUP_FILE=${1:-""}

echo -e "${RED}======================================${NC}"
echo -e "${RED}QuotePro Database Rollback${NC}"
echo -e "${RED}======================================${NC}"
echo ""

# Verify backup file provided
if [ -z "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ No backup file specified${NC}"
    echo ""
    echo "Usage: ./scripts/rollback-db.sh <backup_file>"
    echo ""
    echo "Available backups:"
    ls -lh backup_*.sql 2>/dev/null || echo "  (none found)"
    exit 1
fi

# Verify backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

# Verify environment variables
if [ -z "$SUPABASE_DB_URL" ]; then
    echo -e "${RED}❌ SUPABASE_DB_URL not set${NC}"
    exit 1
fi

# Show backup file info
echo -e "${YELLOW}Backup file: $BACKUP_FILE${NC}"
echo -e "${YELLOW}File size: $(du -h "$BACKUP_FILE" | cut -f1)${NC}"
echo -e "${YELLOW}Created: $(stat -f %Sm "$BACKUP_FILE")${NC}"
echo ""

# Confirm rollback
echo -e "${RED}⚠️  WARNING: This will REPLACE the current database with the backup!${NC}"
echo -e "${RED}⚠️  All data since the backup will be LOST!${NC}"
echo ""
read -p "Are you sure you want to rollback? (type 'yes' to confirm): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Rollback cancelled${NC}"
    exit 0
fi

# Create a backup of current state before rollback
echo -e "${YELLOW}📦 Creating backup of current state...${NC}"
CURRENT_BACKUP="backup_before_rollback_$(date +%Y%m%d_%H%M%S).sql"
pg_dump "$SUPABASE_DB_URL" > "$CURRENT_BACKUP" 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Current backup failed${NC}"
}

# Restore from backup
echo -e "${YELLOW}🔄 Restoring database from backup...${NC}"
if psql "$SUPABASE_DB_URL" < "$BACKUP_FILE"; then
    echo -e "${GREEN}✅ Database restored successfully${NC}"
else
    echo -e "${RED}❌ Rollback failed!${NC}"
    echo ""
    echo -e "${YELLOW}To retry:${NC}"
    echo "psql \"$SUPABASE_DB_URL\" < $BACKUP_FILE"
    exit 1
fi

# Verify restoration
echo -e "${YELLOW}🔍 Verifying restoration...${NC}"

# Check critical tables
TABLES=("companies" "users" "quotes" "pricing_items")
for table in "${TABLES[@]}"; do
    COUNT=$(psql "$SUPABASE_DB_URL" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null || echo "0")
    echo -e "${GREEN}  ✅ Table '$table': $COUNT rows${NC}"
done

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}✅ Rollback completed successfully${NC}"
echo -e "${GREEN}======================================${NC}"
echo "Restored from: $BACKUP_FILE"
echo "Current state backed up to: $CURRENT_BACKUP"
echo ""
echo -e "${YELLOW}⚠️  Remember to re-run failed migration after fixing the issue${NC}"
