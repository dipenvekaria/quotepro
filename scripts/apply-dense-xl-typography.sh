#!/bin/bash

# Apply Dense (XL Text) typography throughout the app
# Based on: text-lg body, text-5xl headings, p-3 padding, gap-3 spacing

echo "🎨 Applying Dense (XL Text) typography..."

cd "$(dirname "$0")/../src" || exit 1

# Update lead and quote cards to use larger, more readable text
find . -name "leads-and-quotes.tsx" -exec sed -i '' \
  -e 's/py-0\.5 px-2/p-3/g' \
  -e 's/space-y-0/space-y-1/g' \
  -e 's/leading-tight//g' \
  -e 's/text-sm font-semibold truncate/text-lg font-semibold truncate/g' \
  -e 's/text-xs text-muted-foreground truncate/text-base text-muted-foreground truncate/g' \
  -e 's/text-xs text-muted-foreground/text-base text-muted-foreground/g' \
  -e 's/text-xs font-medium/text-sm font-medium/g' \
  -e 's/h-8 w-8/h-10 w-10/g' \
  -e 's/h-3 w-3/h-4 w-4/g' \
  -e 's/gap-2/gap-3/g' \
  -e 's/gap-1/gap-2/g' \
  {} +

echo "✅ Dense (XL Text) typography applied!"
echo "📝 Card text is now larger and more readable"
