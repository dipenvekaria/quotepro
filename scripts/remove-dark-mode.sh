#!/bin/bash

# Remove all dark mode classes from components
# Run from project root

echo "Removing dark mode classes..."

# Target files with dark mode
FILES=(
  "src/components/navigation/desktop-sidebar.tsx"
  "src/components/navigation/mobile-bottom-nav.tsx"
  "src/components/navigation/mobile-section-tabs.tsx"
  "src/components/dashboard-navigation.tsx"
  "src/components/quote-status-badge.tsx"
  "src/components/work-calendar.tsx"
  "src/components/leads-and-quotes.tsx"
  "src/components/queues/mobile-filter-button.tsx"
  "src/components/ui/input.tsx"
  "src/components/ui/textarea.tsx"
  "src/components/field-genie-logo.tsx"
  "src/app/(dashboard)/leads-and-quotes/leads/page.tsx"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing: $file"
    # Remove dark: classes (handles various patterns)
    sed -i '' -E \
      -e 's/ dark:[^ "]+//g' \
      -e 's/dark:[^ "]+ //g' \
      -e 's/ dark:[a-z-]+:[^ "]+//g' \
      -e 's/dark:[a-z-]+:[^ "]+ //g' \
      "$file"
  else
    echo "Skipping (not found): $file"
  fi
done

echo "✅ Dark mode removal complete!"
