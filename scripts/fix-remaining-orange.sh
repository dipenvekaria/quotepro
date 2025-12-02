#!/bin/bash

# Second pass - fix remaining orange colors that need contextual replacement

echo "🎨 Fixing remaining orange colors..."

cd "$(dirname "$0")/../src" || exit 1

# Fix dark mode orange references
find . -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' \
  -e 's/dark:bg-orange-900\/30/dark:bg-blue-900\/30/g' \
  -e 's/dark:bg-orange-900/dark:bg-blue-900/g' \
  -e 's/dark:text-orange-300/dark:text-blue-300/g' \
  -e 's/dark:text-orange-400/dark:text-blue-400/g' \
  -e 's/dark:hover:bg-orange-700/dark:hover:bg-blue-700/g' \
  -e 's/dark:hover:bg-orange-950\/30/dark:hover:bg-blue-950\/30/g' \
  -e 's/dark:focus:ring-orange-600/dark:focus:ring-blue-600/g' \
  -e 's/focus:ring-orange-500/focus:ring-blue-500/g' \
  -e 's/border-orange-500/border-blue-500/g' \
  -e 's/bg-orange-500/bg-blue-700/g' \
  -e 's/bg-orange-600/bg-blue-800/g' \
  -e 's/hover:bg-orange-600/hover:bg-blue-800/g' \
  -e 's/hover:bg-orange-700/hover:bg-blue-800/g' \
  -e 's/text-orange-500/text-blue-700/g' \
  {} +

echo "✅ All orange colors replaced with Ocean Blue!"
