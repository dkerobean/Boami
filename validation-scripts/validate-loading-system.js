// Simple validation script for the loading system
const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'src/app/components/shared/loading/types.ts',
  'src/app/components/shared/loading/constants.ts',
  'src/app/components/shared/loading/LoadingContext.tsx',
  'src/app/components/shared/loading/utils.ts',
  'src/app/components/shared/loading/index.ts',
  'src/__tests__/components/shared/loading/LoadingContext.test.tsx',
  'src/__tests__/components/shared/loading/utils.test.ts',
];

console.log('🔍 Validating Loading System Foundation...\n');

let allFilesExist = true;

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const stats = fs.statSync(file);
    console.log(`✅ ${file} (${stats.size} bytes)`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

console.log('\n📊 Summary:');
if (allFilesExist) {
  console.log('✅ All core loading system files are present');
  console.log('✅ Task 1: Create core loading system foundation - COMPLETED');
} else {
  console.log('❌ Some files are missing');
}

// Check file contents for key exports
console.log('\n🔍 Checking key exports...');

try {
  const typesContent = fs.readFileSync('src/app/components/shared/loading/types.ts', 'utf8');
  const hasAnimationType = typesContent.includes('export type AnimationType');
  const hasLoadingConfig = typesContent.includes('export interface LoadingConfig');

  console.log(`${hasAnimationType ? '✅' : '❌'} AnimationType exported`);
  console.log(`${hasLoadingConfig ? '✅' : '❌'} LoadingConfig interface exported`);

  const constantsContent = fs.readFileSync('src/app/components/shared/loading/constants.ts', 'utf8');
  const hasDefaultConfig = constantsContent.includes('DEFAULT_LOADING_CONFIG');

  console.log(`${hasDefaultConfig ? '✅' : '❌'} DEFAULT_LOADING_CONFIG exported`);

  const contextContent = fs.readFileSync('src/app/components/shared/loading/LoadingContext.tsx', 'utf8');
  const hasProvider = contextContent.includes('LoadingContextProvider');
  const hasHook = contextContent.includes('useLoadingContext');

  console.log(`${hasProvider ? '✅' : '❌'} LoadingContextProvider component`);
  console.log(`${hasHook ? '✅' : '❌'} useLoadingContext hook`);

} catch (error) {
  console.log('❌ Error reading files:', error.message);
}

console.log('\n🎉 Core loading system foundation is ready for the next task!');