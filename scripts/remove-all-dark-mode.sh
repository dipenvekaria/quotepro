#!/bin/bash

# Remove dark mode from all remaining files
echo "Removing dark mode from remaining files..."

# Find all .tsx and .ts files with dark: and process them
find src -name "*.tsx" -o -name "*.ts" | while read -r file; do
  if grep -q "dark:" "$file" 2>/dev/null; then
    echo "Cleaning: $file"
    sed -i '' -E \
      -e 's/ dark:[^ "]+//g' \
      -e 's/dark:[^ "]+ //g' \
      -e 's/ dark:[a-z-]+:[^ "]+//g' \
      -e 's/dark:[a-z-]+:[^ "]+ //g' \
      "$file"
  fi
done

echo "✅ Complete! All dark mode classes removed."
