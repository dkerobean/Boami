#!/usr/bin/env node

/**
 * Validation script for dashboard loading animations
 * This script checks if the loading system is properly configured for dashboard navigation
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Dashboard Loading System...\n');

const checks = [
  {
    name: 'LoadingAnimation supports fullWidth prop',
    check: () => {
      const animationPath = 'src/app/components/shared/loading/LoadingAnimation.tsx';
      const overlayPath = 'src/app/components/shared/loading/LoadingOverlay.tsx';

      if (!fs.existsSync(animationPath) || !fs.existsSync(overlayPath)) return false;

      const animationContent = fs.readFileSync(animationPath, 'utf8');
      const overlayContent = fs.readFileSync(overlayPath, 'utf8');

      return animationContent.includes('fullWidth') &&
             animationContent.includes('fullWidth = false') &&
             overlayContent.includes('fullWidth={true}');
    }
  },
  {
    name: 'LoadingAnimationProps includes fullWidth',
    check: () => {
      const filePath = 'src/app/components/shared/loading/types.ts';
      if (!fs.existsSync(filePath)) return false;
      const content = fs.readFileSync(filePath, 'utf8');
      return content.includes('fullWidth?: boolean');
    }
  },
  {
    name: 'LoadingOverlay handles dashboard routes',
    check: () => {
      const filePath = 'src/app/components/shared/loading/LoadingOverlay.tsx';
      if (!fs.existsSync(filePath)) return false;
      const content = fs.readFileSync(filePath, 'utf8');
      return content.includes('isDashboardRoute') && content.includes('usePathname');
    }
  },
  {
    name: 'Dashboard loading hook exists',
    check: () => {
      const filePath = 'src/hooks/useDashboardLoading.ts';
      return fs.existsSync(filePath);
    }
  },
  {
    name: 'NavigationWrapper component exists',
    check: () => {
      const filePath = 'src/app/components/shared/navigation/NavigationWrapper.tsx';
      return fs.existsSync(filePath);
    }
  },
  {
    name: 'Dashboard layout uses loading hook',
    check: () => {
      const filePath = 'src/app/(DashboardLayout)/layout.tsx';
      if (!fs.existsSync(filePath)) return false;
      const content = fs.readFileSync(filePath, 'utf8');
      return content.includes('useDashboardLoading');
    }
  },
  {
    name: 'NavItem uses NavigationWrapper',
    check: () => {
      const filePath = 'src/app/(DashboardLayout)/layout/vertical/sidebar/NavItem/index.tsx';
      if (!fs.existsSync(filePath)) return false;
      const content = fs.readFileSync(filePath, 'utf8');
      return content.includes('NavigationWrapper');
    }
  },
  {
    name: 'Test loading page exists',
    check: () => {
      const filePath = 'src/app/(DashboardLayout)/test-loading/page.tsx';
      return fs.existsSync(filePath);
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
  console.log('\n🎉 All checks passed! Dashboard loading system is properly configured.');
  console.log('\n📝 Next steps:');
  console.log('1. Start your development server: npm run dev');
  console.log('2. Navigate to /test-loading to test the loading animations');
  console.log('3. Click between different dashboard pages to see the linear loading bar');
  console.log('4. Verify that sub-menu navigation shows loading animations');
} else {
  console.log('\n⚠️  Some checks failed. Please review the implementation.');
  process.exit(1);
}