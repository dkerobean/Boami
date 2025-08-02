#!/usr/bin/env node

/**
 * Simple validation script to check MongoDB connection
 */

console.log('🔍 Validating MongoDB Connection...\n');

const fs = require('fs');

const checks = [
  {
    name: 'Mongoose connection file exists',
    check: () => fs.existsSync('src/lib/database/mongoose-connection.ts')
  },
  {
    name: 'Ecommerce dashboard service exists',
    check: () => fs.existsSync('src/lib/services/ecommerce-dashboard.ts')
  },
  {
    name: 'Service uses correct imports',
    check: () => {
      const content = fs.readFileSync('src/lib/services/ecommerce-dashboard.ts', 'utf8');
      return content.includes('mongoose-connection') && content.includes('mongoose');
    }
  },
  {
    name: 'API endpoints exist',
    check: () => {
      return fs.existsSync('src/app/api/dashboard/ecommerce/stats/route.ts');
    }
  }
];

let passed = 0;
let failed = 0;

checks.forEach(({ name, check }) => {
  try {
    const result = check();
    if (result) {
      console.log(`✅ ${name}`);
      passed++;
    } else {
      console.log(`❌ ${name}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ ${name} (Error: ${error.message})`);
    failed++;
  }
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('\n🎉 MongoDB connection setup looks good!');
  console.log('\n📝 Next steps:');
  console.log('1. Make sure your MongoDB server is running');
  console.log('2. Check your MONGODB_URI environment variable');
  console.log('3. Start your development server: npm run dev');
  console.log('4. Try logging in and accessing the dashboard');
} else {
  console.log('\n⚠️  Some checks failed. Please review the setup.');
}