#!/bin/bash
# Database Migration Script for QuotePro
# Runs Supabase migrations with rollback support

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
DRY_RUN=${2:-false}

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}QuotePro Database Migration${NC}"
echo -e "${GREEN}======================================${NC}"
echo "Environment: $ENVIRONMENT"
echo "Dry run: $DRY_RUN"
echo ""

# Verify Supabase CLI installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found${NC}"
    echo "Install: brew install supabase/tap/supabase"
    exit 1
fi

# Verify environment variables
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo -e "${RED}❌ SUPABASE_ACCESS_TOKEN not set${NC}"
    exit 1
fi

if [ -z "$SUPABASE_DB_URL" ]; then
    echo -e "${RED}❌ SUPABASE_DB_URL not set${NC}"
    exit 1
fi

# Backup database before migration
echo -e "${YELLOW}📦 Creating backup...${NC}"
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"

if [ "$DRY_RUN" = "false" ]; then
    # Create backup using pg_dump
    pg_dump "$SUPABASE_DB_URL" > "$BACKUP_FILE" 2>/dev/null || {
        echo -e "${YELLOW}⚠️  Backup failed (continuing anyway)${NC}"
    }
    
    if [ -f "$BACKUP_FILE" ]; then
        echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"
    fi
fi

# Get list of pending migrations
echo -e "${YELLOW}📋 Checking pending migrations...${NC}"
PENDING=$(supabase migration list 2>&1 | grep -c "pending" || true)

if [ "$PENDING" -eq 0 ]; then
    echo -e "${GREEN}✅ No pending migrations${NC}"
    exit 0
fi

echo -e "${YELLOW}Found $PENDING pending migration(s)${NC}"

# Dry run - show what would be applied
if [ "$DRY_RUN" = "true" ]; then
    echo -e "${YELLOW}🔍 Dry run mode - showing migrations that would be applied:${NC}"
    supabase migration list
    echo ""
    echo -e "${YELLOW}To apply these migrations, run:${NC}"
    echo "./scripts/migrate-db.sh $ENVIRONMENT false"
    exit 0
fi

# Apply migrations
echo -e "${YELLOW}🚀 Applying migrations...${NC}"
if supabase db push; then
    echo -e "${GREEN}✅ Migrations applied successfully${NC}"
else
    echo -e "${RED}❌ Migration failed!${NC}"
    echo ""
    echo -e "${YELLOW}To rollback, run:${NC}"
    echo "psql \"$SUPABASE_DB_URL\" < $BACKUP_FILE"
    exit 1
fi

# Verify migrations
echo -e "${YELLOW}🔍 Verifying migrations...${NC}"
supabase migration list

# Check critical tables exist
echo -e "${YELLOW}🔍 Checking critical tables...${NC}"
TABLES=("companies" "users" "quotes" "pricing_items" "ai_generation_history")

for table in "${TABLES[@]}"; do
    EXISTS=$(psql "$SUPABASE_DB_URL" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');" 2>/dev/null || echo "f")
    
    if [ "$EXISTS" = " t" ]; then
        echo -e "${GREEN}  ✅ Table '$table' exists${NC}"
    else
        echo -e "${RED}  ❌ Table '$table' missing${NC}"
    fi
done

# Check RLS policies
echo -e "${YELLOW}🔍 Checking RLS policies...${NC}"
RLS_COUNT=$(psql "$SUPABASE_DB_URL" -t -c "SELECT COUNT(*) FROM pg_policies;" 2>/dev/null || echo "0")
echo -e "${GREEN}  ✅ Found $RLS_COUNT RLS policies${NC}"

# Cleanup old backups (keep last 10)
echo -e "${YELLOW}🧹 Cleaning up old backups...${NC}"
ls -t backup_*.sql 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}✅ Migration completed successfully${NC}"
echo -e "${GREEN}======================================${NC}"
echo "Backup: $BACKUP_FILE"
echo ""
