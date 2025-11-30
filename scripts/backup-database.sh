#!/bin/bash
# ============================================
# Database Backup Script
# ============================================
# Purpose: Create backup before applying migrations
# Usage: ./backup-database.sh
# ============================================

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔄 Creating database backup...${NC}"

# Create backups directory if it doesn't exist
mkdir -p backups

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="backups/backup-${TIMESTAMP}.sql"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found. Install it first:${NC}"
    echo "   brew install supabase/tap/supabase"
    exit 1
fi

# Create backup
echo "📦 Dumping database to: $BACKUP_FILE"
supabase db dump -f "$BACKUP_FILE"

# Verify backup was created
if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✅ Backup created successfully!${NC}"
    echo "   File: $BACKUP_FILE"
    echo "   Size: $SIZE"
    
    # Keep only last 10 backups
    BACKUP_COUNT=$(ls -1 backups/backup-*.sql 2>/dev/null | wc -l)
    if [ "$BACKUP_COUNT" -gt 10 ]; then
        echo "🗑️  Cleaning up old backups (keeping last 10)..."
        ls -1t backups/backup-*.sql | tail -n +11 | xargs rm -f
    fi
    
    echo -e "${GREEN}✅ Backup complete!${NC}"
else
    echo -e "${RED}❌ Backup failed!${NC}"
    exit 1
fi
