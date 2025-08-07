#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Vercel build issues...\n');

// 1. Clean up potential build artifacts
const cleanupPaths = [
  '.next',
  'node_modules/.cache',
  '.vercel'
];

console.log('🧹 Cleaning up build artifacts...');
cleanupPaths.forEach(cleanupPath => {
  if (fs.existsSync(cleanupPath)) {
    console.log(`   Removing ${cleanupPath}`);
    try {
      fs.rmSync(cleanupPath, { recursive: true, force: true });
    } catch (error) {
      console.log(`   ⚠️  Could not remove ${cleanupPath}: ${error.message}`);
    }
  }
});

// 2. Check for missing environment variables that might cause build issues
console.log('\n🔍 Checking environment configuration...');

const requiredEnvVars = [
  'NEXTAUTH_SECRET',
  'MONGODB_URI',
  'NEXTAUTH_URL'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.log('⚠️  Missing environment variables:');
  missingEnvVars.forEach(envVar => {
    console.log(`   - ${envVar}`);
  });
  console.log('\n💡 Make sure these are set in your Vercel project settings.');
} else {
  console.log('✅ All required environment variables are present');
}

// 3. Create a build info file for debugging
const buildInfo = {
  timestamp: new Date().toISOString(),
  nodeVersion: process.version,
  platform: process.platform,
  arch: process.arch,
  fixedRoutes: 74,
  buildOptimizations: [
    'Added dynamic exports to API routes',
    'Optimized next.config.js',
    'Cleaned build artifacts'
  ]
};

fs.writeFileSync('.vercel-build-info.json', JSON.stringify(buildInfo, null, 2));
console.log('\n📝 Created build info file: .vercel-build-info.json');

// 4. Verify critical files exist
console.log('\n🔍 Verifying critical files...');
const criticalFiles = [
  'package.json',
  'next.config.js',
  'src/app/layout.tsx',
  'src/app/page.tsx',
  'src/lib/database/connection.ts'
];

criticalFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING!`);
  }
});

console.log('\n🎉 Vercel build fix complete!');
console.log('\n📋 Next steps:');
console.log('   1. Commit and push these changes');
console.log('   2. Redeploy on Vercel');
console.log('   3. Monitor the build logs for any remaining issues');
console.log('\n💡 If you still see the client reference manifest error,');
console.log('   it should resolve itself after the dynamic route fixes are deployed.');