/**
 * Debug Image Update Issues
 * 
 * This script provides debugging utilities for the image update flow.
 * Add these functions to your components temporarily for debugging.
 */

// 1. Debug Image Upload Flow
function debugImageUpload() {
  console.group('🖼️  Image Upload Debug');
  
  // Check if upload directory exists
  const checkUploadDir = async () => {
    try {
      const response = await fetch('/api/upload/product-image');
      const result = await response.json();
      console.log('Upload endpoint status:', result);
      return result.success;
    } catch (error) {
      console.error('Upload endpoint not accessible:', error);
      return false;
    }
  };
  
  // Test upload with a small test image
  const testUpload = async (file) => {
    console.time('Image Upload');
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch('/api/upload/product-image', {
        method: 'POST',
        body: formData
      });
      
      console.log('Upload Response:', {
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      const result = await response.json();
      console.log('Upload Result:', result);
      console.timeEnd('Image Upload');
      
      return result;
    } catch (error) {
      console.error('Upload Error:', error);
      console.timeEnd('Image Upload');
      return { success: false, error: error.message };
    }
  };
  
  console.groupEnd();
  return { checkUploadDir, testUpload };
}

// 2. Debug Product Update Flow  
function debugProductUpdate(productId, updateData) {
  console.group('📦 Product Update Debug');
  console.log('Update Data:', {
    productId,
    hasPhoto: !!updateData.photo,
    photoUrl: updateData.photo,
    dataSize: JSON.stringify(updateData).length
  });
  
  const testUpdate = async () => {
    console.time('Product Update');
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      console.log('Update Response:', {
        status: response.status,
        ok: response.ok
      });
      
      const result = await response.json();
      console.log('Update Result:', result);
      console.timeEnd('Product Update');
      
      return result;
    } catch (error) {
      console.error('Update Error:', error);
      console.timeEnd('Product Update');
      return { success: false, error: error.message };
    }
  };
  
  console.groupEnd();
  return testUpdate;
}

// 3. Debug State Updates
function debugStateUpdates(component, stateName, newValue) {
  console.log(`🔄 State Update [${component}]:`, {
    stateName,
    newValue: typeof newValue === 'object' ? JSON.stringify(newValue, null, 2) : newValue,
    timestamp: new Date().toISOString()
  });
}

// 4. Debug Image Caching Issues
function debugImageCaching(imageUrl) {
  console.group('💾 Image Caching Debug');
  
  const testImageLoad = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        console.log('✅ Image loaded successfully:', url);
        resolve(true);
      };
      img.onerror = (error) => {
        console.error('❌ Image failed to load:', url, error);
        reject(false);
      };
      img.src = url;
    });
  };
  
  const testWithCacheBuster = async (url) => {
    const cacheBustedUrl = `${url}?t=${Date.now()}`;
    console.log('Testing with cache buster:', cacheBustedUrl);
    return testImageLoad(cacheBustedUrl);
  };
  
  console.groupEnd();
  return { testImageLoad, testWithCacheBuster };
}

// 5. Complete Debug Flow
function debugCompleteImageUpdateFlow(productId, imageFile) {
  console.group('🔍 Complete Image Update Debug Flow');
  
  const runFullDebug = async () => {
    // Step 1: Test upload
    const { testUpload } = debugImageUpload();
    const uploadResult = await testUpload(imageFile);
    
    if (!uploadResult.success) {
      console.error('❌ Upload failed, stopping debug');
      return { step: 'upload', success: false, error: uploadResult.error };
    }
    
    // Step 2: Test product update
    const updateData = { photo: uploadResult.data.url };
    const testUpdate = debugProductUpdate(productId, updateData);
    const updateResult = await testUpdate();
    
    if (!updateResult.success) {
      console.error('❌ Product update failed');
      return { step: 'update', success: false, error: updateResult.error };
    }
    
    // Step 3: Test image display
    const { testImageLoad } = debugImageCaching();
    try {
      await testImageLoad(uploadResult.data.url);
      console.log('✅ Complete flow successful');
      return { step: 'complete', success: true };
    } catch (error) {
      console.error('❌ Image display failed');
      return { step: 'display', success: false, error: 'Image not accessible' };
    }
  };
  
  console.groupEnd();
  return runFullDebug;
}

// Export for use in components
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    debugImageUpload,
    debugProductUpdate,
    debugStateUpdates,
    debugImageCaching,
    debugCompleteImageUpdateFlow
  };
}