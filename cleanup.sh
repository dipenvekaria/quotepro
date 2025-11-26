#!/bin/bash

# QuotePro Repository Cleanup Script
# This script archives old docs and removes obsolete scripts

set -e  # Exit on error

echo "🧹 QuotePro Repository Cleanup"
echo "=============================="
echo ""

# Create archive directory
echo "📁 Creating docs/archive directory..."
mkdir -p docs/archive

# Archive old documentation
echo "📦 Archiving old documentation files..."
files_to_archive=(
  "BUILD_SUMMARY.md"
  "GROQ_MODEL_FIX.md"
  "FIX_GOOGLE_OAUTH_REDIRECT.md"
  "GOOGLE_AUTH_SETUP.md"
  "SUPABASE_REDIRECT_SETUP.md"
  "SETUP_LOCAL_DOMAIN.md"
  "FEATURES_UPDATE.md"
  "PRICING_PAGE.md"
  "SETTINGS_FEATURE.md"
  "TEAM_ROLES_IMPLEMENTATION.md"
)

for file in "${files_to_archive[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ Archiving $file"
    mv "$file" docs/archive/
  else
    echo "  ⊘ $file not found (already moved?)"
  fi
done

# Remove obsolete scripts
echo ""
echo "🗑️  Removing obsolete configuration scripts..."
scripts_to_remove=(
  "check-oauth.sh"
  "setup-oauth.sh"
  "configure-oauth.js"
  "find-google-oauth.js"
  "check-supabase-auth.js"
  "setup-mobile-wifi.sh"
  "setup-ngrok.sh"
  "start-tunnel.sh"
)

for script in "${scripts_to_remove[@]}"; do
  if [ -f "$script" ]; then
    echo "  ✓ Removing $script"
    rm "$script"
  else
    echo "  ⊘ $script not found (already removed?)"
  fi
done

echo ""
echo "✨ Cleanup Complete!"
echo ""
echo "Summary:"
echo "  • Archived ${#files_to_archive[@]} documentation files → docs/archive/"
echo "  • Removed ${#scripts_to_remove[@]} obsolete scripts"
echo ""
echo "Next steps:"
echo "  1. Review archived files in docs/archive/"
echo "  2. Create ARCHITECTURE.md (system overview)"
echo "  3. Create DEVELOPMENT.md (dev guidelines)"
echo "  4. Update README.md with consolidated info"
echo ""
echo "Run 'git status' to see changes"
