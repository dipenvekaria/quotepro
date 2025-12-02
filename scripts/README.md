# Work Items Cleanup Scripts

Two scripts for safely deleting all work items while preserving product pricing:

## Files

1. **`clean-work-items.sql`** - SQL commands for deletion
2. **`clean-work-items.sh`** - Interactive bash script with safety prompts

## What Gets Deleted ❌

- All quotes (leads and quoted items)
- All quote items
- All audit trail logs
- Resets auto-increment sequences

## What Gets Preserved ✅

- Companies
- User accounts
- All configuration data

## Usage

### Method 1: Interactive Script (Recommended)

```bash
./scripts/clean-work-items.sh
```

This will:
1. Show you what will be deleted
2. Ask for confirmation (`yes`)
3. Show counts before deletion
4. Execute cleanup
5. Show final counts

### Method 2: Direct SQL Execution

```bash
# Get your database URL from .env.local
psql "postgresql://postgres.[project-ref]:[password]@aws-0-us-west-1.pooler.supabase.com:6543/postgres" \
  -f scripts/clean-work-items.sql
```

## Prerequisites

- `psql` installed (PostgreSQL client)
- `.env.local` with `SUPABASE_DB_URL` variable
- Database connection access

## Safety Features

- Requires explicit `yes` confirmation
- Shows before/after counts
- Preserves all metadata tables
- Uses transactions

## After Cleanup

Your app will be in a clean state:
- No work items
- Fresh start for testing
- All pricing intact
- All user accounts intact

Perfect for:
- Development testing
- Demo resets
- Clean slate deployments
