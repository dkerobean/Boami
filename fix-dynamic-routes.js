#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Routes that need to be made dynamic based on the error log
const routesToFix = [
  'src/app/api/admin/analytics/route.ts',
  'src/app/api/admin/subscriptions/export/route.ts',
  'src/app/api/admin/subscriptions/stats/route.ts',
  'src/app/api/auth/invitations/validate/route.ts',
  'src/app/api/auth/permissions/user/route.ts',
  'src/app/api/auth/test/route.ts',
  'src/app/api/cron/email-notifications/route.ts',
  'src/app/api/cron/system-health-check/route.ts',
  'src/app/api/dashboard/ecommerce/payments/route.ts',
  'src/app/api/dashboard/ecommerce/products/route.ts',
  'src/app/api/dashboard/ecommerce/sales/route.ts',
  'src/app/api/dashboard/ecommerce/stats/route.ts',
  'src/app/api/dashboard/ecommerce/transactions/route.ts',
  'src/app/api/finance/dashboard/route.ts',
  'src/app/api/invitations/stats/route.ts',
  'src/app/api/notifications/analytics/route.ts',
  'src/app/api/notifications/history/route.ts',
  'src/app/api/notifications/preferences/route.ts',
  'src/app/api/notifications/unsubscribe/route.ts',
  'src/app/api/permissions/route.ts',
  'src/app/api/products/route.ts',
  'src/app/api/roles/matrix/route.ts',
  'src/app/api/roles/route.ts',
  'src/app/api/shop-management/recent-activities/route.ts',
  'src/app/api/shop-management/top-products/route.ts',
  'src/app/api/subscriptions/billing/history/route.ts',
  'src/app/api/subscriptions/current/route.ts',
  'src/app/api/test/auth-status/route.ts',
  'src/app/api/test/permission-check/route.ts',
  'src/app/api/users/stats/route.ts'
];

// Additional routes that use dynamic features (from grep search)
const additionalRoutes = [
  'src/app/api/finance/recurring/process/route.ts',
  'src/app/api/finance/recurring/route.ts',
  'src/app/api/finance/sales/[id]/route.ts',
  'src/app/api/finance/expenses/[id]/route.ts',
  'src/app/api/finance/vendors/[id]/route.ts',
  'src/app/api/finance/income/[id]/route.ts',
  'src/app/api/admin/cron/route.ts',
  'src/app/api/admin/performance/route.ts',
  'src/app/api/admin/audit-logs/route.ts',
  'src/app/api/admin/analytics/route.ts',
  'src/app/api/admin/monitoring/route.ts',
  'src/app/api/subscriptions/subscribe/route.ts',
  'src/app/api/subscriptions/webhooks/flutterwave/route.ts',
  'src/app/api/subscriptions/cancel/route.ts',
  'src/app/api/subscriptions/billing/invoice/[id]/route.ts',
  'src/app/api/admin/users/route.ts',
  'src/app/api/admin/roles/route.ts',
  'src/app/api/productivity/onboarding/route.ts',
  'src/app/api/productivity/kanban/boards/[id]/route.ts',
  'src/app/api/productivity/kanban/boards/route.ts',
  'src/app/api/productivity/kanban/tasks/route.ts',
  'src/app/api/productivity/notes/[id]/route.ts',
  'src/app/api/productivity/notes/enhanced/route.ts',
  'src/app/api/productivity/notes/route.ts',
  'src/app/api/productivity/calendar/events/route.ts',
  'src/app/api/finance/categories/income/route.ts',
  'src/app/api/finance/categories/expense/route.ts',
  'src/app/api/finance/templates/income/route.ts',
  'src/app/api/finance/templates/expense/route.ts',
  'src/app/api/email/preferences/route.ts',
  'src/app/api/finance/income/route.ts',
  'src/app/api/finance/vendors/route.ts',
  'src/app/api/bulk-upload/route.ts',
  'src/app/api/notifications/real/route.ts',
  'src/app/api/users/route.ts',
  'src/app/api/advanced-reports/route.ts',
  'src/app/api/bulk-export/route.ts',
  'src/app/api/finance/sales/route.ts',
  'src/app/api/stock-alerts/[id]/route.ts',
  'src/app/api/stock-alerts/route.ts',
  'src/app/api/stock-alerts/clear/route.ts',
  'src/app/api/finance/expenses/route.ts',
  'src/app/api/inventory/route.ts',
  'src/app/api/user/onboarding/route.ts',
  'src/app/api/admin/subscriptions/route.ts',
  'src/app/api/admin/subscriptions/export/route.ts'
];

// Combine and deduplicate routes
const allRoutes = [...new Set([...routesToFix, ...additionalRoutes])];

function addDynamicExport(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  // Check if dynamic export already exists
  if (content.includes('export const dynamic') || content.includes('export const runtime')) {
    console.log(`✅ ${filePath} already has dynamic config`);
    return false;
  }

  // Find the position to insert the dynamic export
  // Look for the first export function (GET, POST, etc.)
  const exportMatch = content.match(/^export\s+(async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)/m);

  if (!exportMatch) {
    console.log(`⚠️  No export function found in: ${filePath}`);
    return false;
  }

  const insertPosition = exportMatch.index;
  const beforeInsert = content.substring(0, insertPosition);
  const afterInsert = content.substring(insertPosition);

  // Add the dynamic export with proper spacing
  const dynamicExport = `// Force dynamic rendering for this route\nexport const dynamic = 'force-dynamic';\n\n`;

  const newContent = beforeInsert + dynamicExport + afterInsert;

  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`✅ Added dynamic export to: ${filePath}`);
  return true;
}

console.log('🔧 Fixing dynamic routes for Vercel deployment...\n');

let fixedCount = 0;
let totalCount = 0;

for (const route of allRoutes) {
  totalCount++;
  if (addDynamicExport(route)) {
    fixedCount++;
  }
}

console.log(`\n📊 Summary:`);
console.log(`   Total routes processed: ${totalCount}`);
console.log(`   Routes fixed: ${fixedCount}`);
console.log(`   Routes already configured: ${totalCount - fixedCount}`);

console.log('\n🎉 Dynamic route configuration complete!');
console.log('💡 These routes will now be server-rendered on demand instead of statically generated.');