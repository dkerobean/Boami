/**
 * Utility functions for fetching product-related data
 */

/**
 * Fetch unique categories from all products
 */
export async function fetchProductCategories(): Promise<string[]> {
  try {
    const response = await fetch('/api/products/categories');
    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }
    const data = await response.json();
    return data.success ? data.data.categories : [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

/**
 * Fetch unique tags from all products
 */
export async function fetchProductTags(): Promise<string[]> {
  try {
    const response = await fetch('/api/products/tags');
    if (!response.ok) {
      throw new Error('Failed to fetch tags');
    }
    const data = await response.json();
    return data.success ? data.data.tags : [];
  } catch (error) {
    console.error('Error fetching tags:', error);
    return [];
  }
}

/**
 * Fetch variations for a specific product
 */
export async function fetchProductVariations(productId: string): Promise<any[]> {
  try {
    const response = await fetch(`/api/products/${productId}/variations`);
    if (!response.ok) {
      throw new Error('Failed to fetch variations');
    }
    const data = await response.json();
    return data.success ? data.data.variations : [];
  } catch (error) {
    console.error('Error fetching variations:', error);
    return [];
  }
}

/**
 * Save product changes
 */
export async function saveProductData(productId: string, productData: any): Promise<boolean> {
  try {
    const response = await fetch(`/api/products/${productId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save product');
    }
    
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error saving product:', error);
    return false;
  }
}

/**
 * Format categories for Autocomplete component
 */
export function formatCategoriesForAutocomplete(categories: string[]): { label: string }[] {
  return categories.map(category => ({ label: category }));
}

/**
 * Format tags for Autocomplete component
 */
export function formatTagsForAutocomplete(tags: string[]): { label: string }[] {
  return tags.map(tag => ({ label: tag }));
}

/**
 * Extract label values from Autocomplete selection
 */
export function extractLabelsFromAutocomplete(selection: { label: string }[]): string[] {
  return selection.map(item => item.label);
}