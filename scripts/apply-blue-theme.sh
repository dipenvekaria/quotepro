#!/bin/bash

# Ocean Blue/Teal Theme Color Replacement Script
# Replaces all hardcoded orange colors with blue colors

echo "🎨 Applying Ocean Blue/Teal theme..."

# Navigate to src directory
cd "$(dirname "$0")/../src" || exit 1

# Replace orange with blue throughout the codebase
find . -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) -exec sed -i '' \
  -e 's/bg-orange-50/bg-blue-50/g' \
  -e 's/bg-orange-100/bg-blue-100/g' \
  -e 's/bg-orange-500/bg-blue-700/g' \
  -e 's/bg-orange-600/bg-blue-700/g' \
  -e 's/text-orange-600/text-blue-700/g' \
  -e 's/text-orange-700/text-blue-700/g' \
  -e 's/text-orange-800/text-blue-800/g' \
  -e 's/text-orange-400/text-blue-400/g' \
  -e 's/border-orange-200/border-blue-200/g' \
  -e 's/border-orange-300/border-blue-300/g' \
  -e 's/border-orange-700/border-blue-700/g' \
  -e 's/border-orange-800/border-blue-800/g' \
  -e 's/hover:bg-orange-50/hover:bg-blue-50/g' \
  -e 's/hover:bg-orange-100/hover:bg-blue-100/g' \
  -e 's/dark:bg-orange-900\/20/dark:bg-blue-900\/20/g' \
  -e 's/dark:bg-orange-900\/10/dark:bg-blue-900\/10/g' \
  -e 's/dark:bg-orange-950\/20/dark:bg-blue-950\/20/g' \
  -e 's/dark:bg-orange-950\/30/dark:bg-blue-950\/30/g' \
  -e 's/dark:bg-orange-600/dark:bg-blue-600/g' \
  -e 's/dark:text-orange-400/dark:text-blue-400/g' \
  -e 's/dark:border-orange-700/dark:border-blue-700/g' \
  -e 's/dark:border-orange-800/dark:border-blue-800/g' \
  -e 's/dark:hover:bg-orange-900\/40/dark:hover:bg-blue-900\/40/g' \
  -e 's/#FF6200/#1d4ed8/g' \
  -e 's/#E55800/#1e40af/g' \
  {} +

echo "✅ Theme colors updated successfully!"
echo "🔄 Restart your Next.js server to see changes"
