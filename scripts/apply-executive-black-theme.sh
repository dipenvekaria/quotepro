#!/bin/bash

# Executive Black Theme Application Script
# Applies Slate-900 + Blue-600 theme with 20% typography reduction
# Replaces ALL orange colors and updates typography

echo "🎨 Applying Executive Black Theme (20% typography reduction)..."

cd "$(dirname "$0")/.." || exit 1

# Step 1: Replace ALL orange colors with blue (Executive Black accent)
echo "Step 1: Replacing orange → blue..."

find src -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) -exec sed -i '' \
  -e 's/bg-orange-50/bg-blue-50/g' \
  -e 's/bg-orange-100/bg-blue-100/g' \
  -e 's/bg-orange-500/bg-blue-600/g' \
  -e 's/bg-orange-600/bg-blue-700/g' \
  -e 's/text-orange-50/text-blue-50/g' \
  -e 's/text-orange-100/text-blue-100/g' \
  -e 's/text-orange-400/text-blue-400/g' \
  -e 's/text-orange-500/text-blue-500/g' \
  -e 's/text-orange-600/text-blue-600/g' \
  -e 's/text-orange-700/text-blue-700/g' \
  -e 's/text-orange-800/text-blue-800/g' \
  -e 's/text-orange-900/text-blue-900/g' \
  -e 's/border-orange-50/border-blue-50/g' \
  -e 's/border-orange-100/border-blue-100/g' \
  -e 's/border-orange-200/border-blue-200/g' \
  -e 's/border-orange-300/border-blue-300/g' \
  -e 's/border-orange-400/border-blue-400/g' \
  -e 's/border-orange-500/border-blue-500/g' \
  -e 's/border-orange-600/border-blue-600/g' \
  -e 's/border-orange-700/border-blue-700/g' \
  -e 's/border-orange-800/border-blue-800/g' \
  -e 's/hover:bg-orange-50/hover:bg-blue-50/g' \
  -e 's/hover:bg-orange-100/hover:bg-blue-100/g' \
  -e 's/hover:bg-orange-600/hover:bg-blue-700/g' \
  -e 's/hover:bg-orange-700/hover:bg-blue-800/g' \
  -e 's/dark:bg-orange-900\/20/dark:bg-blue-900\/20/g' \
  -e 's/dark:bg-orange-900\/10/dark:bg-blue-900\/10/g' \
  -e 's/dark:bg-orange-950\/20/dark:bg-blue-950\/20/g' \
  -e 's/dark:bg-orange-950\/30/dark:bg-blue-950\/30/g' \
  -e 's/dark:bg-orange-600/dark:bg-blue-600/g' \
  -e 's/dark:text-orange-200/dark:text-blue-200/g' \
  -e 's/dark:text-orange-300/dark:text-blue-300/g' \
  -e 's/dark:text-orange-400/dark:text-blue-400/g' \
  -e 's/dark:border-orange-700/dark:border-blue-700/g' \
  -e 's/dark:border-orange-800/dark:border-blue-800/g' \
  -e 's/dark:hover:bg-orange-900\/40/dark:hover:bg-blue-900\/40/g' \
  -e 's/from-orange-500 to-orange-600/from-slate-900 to-blue-600/g' \
  -e 's/from-orange-600 to-orange-700/from-slate-900 to-blue-700/g' \
  {} +

# Step 2: Replace hex color codes
echo "Step 2: Replacing hex codes..."

find src -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) -exec sed -i '' \
  -e 's/#FF6200/#2563eb/g' \
  -e 's/#E55800/#1d4ed8/g' \
  -e 's/#ff6200/#2563eb/g' \
  -e 's/#e55800/#1d4ed8/g' \
  {} +

# Step 3: Typography reduction (20% smaller)
echo "Step 3: Applying 20% typography reduction..."

find src -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) -exec sed -i '' \
  -e 's/text-6xl/text-5xl/g' \
  -e 's/text-5xl/text-4xl/g' \
  -e 's/text-4xl/text-3xl/g' \
  -e 's/text-3xl/text-2xl/g' \
  -e 's/text-2xl/text-xl/g' \
  -e 's/text-xl/text-lg/g' \
  -e 's/text-lg/text-base/g' \
  -e 's/text-base/text-sm/g' \
  {} +

# Step 4: Make all fonts bold/medium
echo "Step 4: Applying Professional Bold weights..."

find src -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) -exec sed -i '' \
  -e 's/font-normal/font-medium/g' \
  -e 's/font-light/font-medium/g' \
  -e 's/font-semibold/font-bold/g' \
  {} +

echo "✅ Theme applied successfully!"
echo "🔄 Restart your Next.js server to see changes"
echo ""
echo "Applied:"
echo "  • Orange → Blue-600 (all variants)"
echo "  • Typography reduced by 20%"
echo "  • All fonts set to font-medium or font-bold"
echo "  • Executive Black theme active"
