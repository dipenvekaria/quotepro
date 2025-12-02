#!/bin/bash

# Third pass - fix specific remaining files

echo "🎨 Fixing final orange references..."

cd "$(dirname "$0")/.." || exit 1

# Fix leads page
sed -i '' 's/bg-orange-500/bg-blue-700/g' src/app/\(dashboard\)/leads-and-quotes/leads/page.tsx
sed -i '' 's/hover:bg-orange-600/hover:bg-blue-800/g' src/app/\(dashboard\)/leads-and-quotes/leads/page.tsx

# Fix mobile section tabs
sed -i '' 's/dark:bg-orange-400/dark:bg-blue-400/g' src/components/navigation/mobile-section-tabs.tsx

# Fix public quote viewer
sed -i '' 's/dark:bg-orange-950/dark:bg-blue-950/g' src/app/q/\[id\]/page.tsx

# Fix floating action menu
sed -i '' 's/from-orange-500 to-orange-600/from-blue-600 to-teal-500/g' src/components/floating-action-menu.tsx

# Fix dark mode text colors
sed -i '' 's/dark:text-orange-200/dark:text-blue-200/g' src/app/\(dashboard\)/work/page.tsx
sed -i '' 's/dark:text-orange-200/dark:text-blue-200/g' src/app/\(dashboard\)/pay/page.tsx

# Fix old page backups (in case they're ever used)
sed -i '' 's/text-orange-900/text-blue-900/g' src/app/\(dashboard\)/leads/new/page_old_2262_lines.tsx
sed -i '' 's/dark:text-orange-100/dark:text-blue-100/g' src/app/\(dashboard\)/leads/new/page_old_2262_lines.tsx
sed -i '' 's/dark:hover:bg-orange-900\/30/dark:hover:bg-blue-900\/30/g' src/app/\(dashboard\)/leads/new/page_old_2262_lines.tsx

sed -i '' 's/text-orange-900/text-blue-900/g' src/app/\(dashboard\)/leads/new/page_original_backup.tsx
sed -i '' 's/dark:text-orange-100/dark:text-blue-100/g' src/app/\(dashboard\)/leads/new/page_original_backup.tsx
sed -i '' 's/dark:hover:bg-orange-900\/30/dark:hover:bg-blue-900\/30/g' src/app/\(dashboard\)/leads/new/page_original_backup.tsx

echo "✅ Final orange colors replaced!"
echo "⚠️  Theme test page left unchanged (intentionally contains all theme options)"
