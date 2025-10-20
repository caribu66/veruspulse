#!/bin/bash
# Fix missing console.log statements in API routes

echo "Fixing missing console.log() statements..."

# Find all TypeScript files with incomplete console.log statements
# Pattern: standalone backtick template strings (missing console.log)

find app/api -name "*.ts" -type f | while read file; do
  # Check if file has standalone template strings that should be console.log
  if grep -q '^\s\+`' "$file"; then
    echo "Processing: $file"
    
    # Fix patterns where console.log( is missing before backtick templates
    # This is a careful regex that only fixes obvious cases
    sed -i -E 's/^(\s+)`([^`]+)`$/\1console.log(\n\1  `\2`\n\1)/g' "$file"
  fi
done

echo "Done! Please review changes before committing."

