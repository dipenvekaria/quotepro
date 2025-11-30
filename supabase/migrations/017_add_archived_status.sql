-- Migration 017: Add 'archived' to lead_status_enum
-- This allows leads and quotes to be archived with a reason

-- Add 'archived' value to the enum
ALTER TYPE lead_status_enum ADD VALUE 'archived';
