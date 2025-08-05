#!/bin/bash

# Script to update API endpoints from old JWT auth to NextAuth

echo "🔧 Updating API endpoints to use NextAuth..."

# List of API files to update
files=(
  "src/app/api/finance/income/route.ts"
  "src/app/api/finance/expenses/route.ts"
  "src/app/api/finance/categories/income/route.ts"
  "src/app/api/finance/categories/expense/route.ts"
  "src/app/api/productivity/notes/route.ts"
  "src/app/api/productivity/kanban/boards/route.ts"
  "src/app/api/productivity/calendar/events/route.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "📝 Updating $file..."

    # Replace import
    sed -i '' 's/import { authenticateRequest } from.*api-auth.*/import { authenticateApiRequest, createApiResponse } from '\''@\/lib\/auth\/nextauth-middleware'\'';/' "$file"

    # Replace authentication call
    sed -i '' 's/const authResult = await authenticateRequest(request);/const authResult = await authenticateApiRequest(request);/' "$file"

    # Replace success check
    sed -i '' 's/!authResult\.success || !authResult\.userId/!authResult.success || !authResult.user/' "$file"

    # Replace userId references
    sed -i '' 's/authResult\.userId/authResult.user.id/g' "$file"

    echo "✅ Updated $file"
  else
    echo "⚠️  File not found: $file"
  fi
done

echo "🎉 API authentication update complete!"