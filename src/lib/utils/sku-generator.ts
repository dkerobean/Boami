import Product from '../database/models/Product';
import ProductVariant from '../database/models/ProductVariant';

/**
 * SKU Generator Utility
 * Generates unique SKUs for products and variants with configurable patterns
 */

export interface SKUGeneratorConfig {
  prefix?: string; // Custom prefix
  includeCategory?: boolean; // Include category in SKU
  includeYear?: boolean; // Include year in SKU
  includeTimestamp?: boolean; // Include timestamp for uniqueness
  separator?: string; // Separator character
  length?: number; // Total SKU length
  pattern?: 'CATEGORY-PRODUCT-ID' | 'PREFIX-TIMESTAMP' | 'CUSTOM';
}

export class SKUGenerator {
  private static defaultConfig: SKUGeneratorConfig = {
    prefix: 'PRD',
    includeCategory: true,
    includeYear: false,
    includeTimestamp: true,
    separator: '-',
    length: 12,
    pattern: 'CATEGORY-PRODUCT-ID'
  };

  /**
   * Generate a unique SKU for a simple product
   */
  static async generateProductSKU(
    productData: {
      title: string;
      category?: string[];
      brand?: string;
    },
    config: Partial<SKUGeneratorConfig> = {}
  ): Promise<string> {
    const finalConfig = { ...this.defaultConfig, ...config };
    let sku = '';
    
    try {
      switch (finalConfig.pattern) {
        case 'CATEGORY-PRODUCT-ID':
          sku = await this.generateCategoryProductIdSKU(productData, finalConfig);
          break;
        case 'PREFIX-TIMESTAMP':
          sku = this.generatePrefixTimestampSKU(productData, finalConfig);
          break;
        case 'CUSTOM':
          sku = this.generateCustomSKU(productData, finalConfig);
          break;
        default:
          sku = await this.generateCategoryProductIdSKU(productData, finalConfig);
      }
      
      // Ensure uniqueness
      const existingSKU = await Product.findBySku(sku);
      if (existingSKU) {
        // Add suffix to make it unique
        sku = await this.makeUnique(sku, 'product');
      }
      
      return sku.toUpperCase();
      
    } catch (error) {
      console.error('Error generating SKU:', error);
      // Fallback to timestamp-based SKU
      return this.generateFallbackSKU();
    }
  }

  /**
   * Generate a unique SKU for a product variant
   */
  static async generateVariantSKU(
    productData: {
      title: string;
      category?: string[];
      sku?: string; // Parent product SKU
    },
    variantData: {
      attributes: { name: string; value: string }[];
    },
    config: Partial<SKUGeneratorConfig> = {}
  ): Promise<string> {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    try {
      // Start with product base or generate new base
      let baseSKU = productData.sku || 
        await this.generateProductSKU(productData, { ...config, includeTimestamp: false });
      
      // Remove any existing variant suffix
      baseSKU = baseSKU.replace(/-V\d+$/, '');
      
      // Generate variant suffix from attributes
      const variantSuffix = this.generateVariantSuffix(variantData.attributes);
      
      let variantSKU = `${baseSKU}${finalConfig.separator}${variantSuffix}`;
      
      // Ensure uniqueness
      const existingVariant = await ProductVariant.findBySku(variantSKU);
      if (existingVariant) {
        variantSKU = await this.makeUnique(variantSKU, 'variant');
      }
      
      return variantSKU.toUpperCase();
      
    } catch (error) {
      console.error('Error generating variant SKU:', error);
      return this.generateFallbackSKU('VAR');
    }
  }

  /**
   * Generate category-product-id pattern SKU
   */
  private static async generateCategoryProductIdSKU(
    productData: { title: string; category?: string[]; brand?: string },
    config: SKUGeneratorConfig
  ): Promise<string> {
    const parts: string[] = [];
    
    // Category prefix
    if (config.includeCategory && productData.category && productData.category.length > 0) {
      const categoryCode = this.generateCategoryCode(productData.category[0]);
      parts.push(categoryCode);
    } else if (config.prefix) {
      parts.push(config.prefix);
    }
    
    // Product name code
    const productCode = this.generateProductCode(productData.title);
    parts.push(productCode);
    
    // Year if requested
    if (config.includeYear) {
      parts.push(new Date().getFullYear().toString().slice(-2));
    }
    
    // Timestamp or sequence for uniqueness
    if (config.includeTimestamp) {
      const timestamp = Date.now().toString().slice(-6);
      parts.push(timestamp);
    } else {
      // Use sequential number
      const sequence = await this.getNextSequence();
      parts.push(sequence.toString().padStart(4, '0'));
    }
    
    return parts.join(config.separator || '-');
  }

  /**
   * Generate prefix-timestamp pattern SKU
   */
  private static generatePrefixTimestampSKU(
    productData: { title: string; brand?: string },
    config: SKUGeneratorConfig
  ): string {
    const prefix = config.prefix || 'PRD';
    const timestamp = Date.now().toString();
    const randomSuffix = Math.random().toString(36).substr(2, 3).toUpperCase();
    
    return `${prefix}${config.separator}${timestamp.slice(-8)}${config.separator}${randomSuffix}`;
  }

  /**
   * Generate custom pattern SKU
   */
  private static generateCustomSKU(
    productData: { title: string; category?: string[]; brand?: string },
    config: SKUGeneratorConfig
  ): string {
    // Custom logic can be implemented here based on specific business needs
    const parts: string[] = [];
    
    if (productData.brand) {
      parts.push(productData.brand.substr(0, 3).toUpperCase());
    }
    
    if (productData.category && productData.category.length > 0) {
      parts.push(this.generateCategoryCode(productData.category[0]));
    }
    
    const productCode = this.generateProductCode(productData.title);
    parts.push(productCode);
    
    const randomId = Math.random().toString(36).substr(2, 4).toUpperCase();
    parts.push(randomId);
    
    return parts.join(config.separator || '-');
  }

  /**
   * Generate category code from category name
   */
  private static generateCategoryCode(category: string): string {
    const cleanCategory = category.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    // Common category mappings
    const categoryMappings: { [key: string]: string } = {
      'ELECTRONICS': 'ELC',
      'CLOTHING': 'CLT',
      'APPAREL': 'APP',
      'SHOES': 'SHO',
      'ACCESSORIES': 'ACC',
      'HOME': 'HOM',
      'GARDEN': 'GRD',
      'SPORTS': 'SPT',
      'TOYS': 'TOY',
      'BOOKS': 'BOO',
      'BEAUTY': 'BTY',
      'HEALTH': 'HTH',
      'AUTOMOTIVE': 'AUT',
      'TOOLS': 'TOL',
      'JEWELRY': 'JWL',
      'FOOD': 'FOD',
      'PETS': 'PET'
    };
    
    // Check for exact match
    if (categoryMappings[cleanCategory]) {
      return categoryMappings[cleanCategory];
    }
    
    // Generate from first letters or first 3 characters
    if (cleanCategory.length >= 3) {
      return cleanCategory.substr(0, 3);
    }
    
    return 'GEN'; // Generic category
  }

  /**
   * Generate product code from product title
   */
  private static generateProductCode(title: string): string {
    // Remove special characters and get meaningful words
    const words = title
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2) // Filter out small words
      .slice(0, 3); // Take first 3 meaningful words
    
    if (words.length === 0) {
      return 'PRD';
    }
    
    // Take first letter of each word
    const code = words
      .map(word => word.charAt(0).toUpperCase())
      .join('');
    
    // If too short, pad with first word
    if (code.length < 3 && words.length > 0) {
      const firstWord = words[0].toUpperCase();
      return (code + firstWord).substr(0, 3);
    }
    
    return code;
  }

  /**
   * Generate variant suffix from attributes
   */
  private static generateVariantSuffix(attributes: { name: string; value: string }[]): string {
    const codes = attributes
      .map(attr => {
        const name = attr.name.charAt(0).toUpperCase();
        const value = attr.value.replace(/[^a-zA-Z0-9]/g, '').substr(0, 2).toUpperCase();
        return `${name}${value}`;
      })
      .join('');
    
    return codes || 'VAR';
  }

  /**
   * Make SKU unique by adding suffix
   */
  private static async makeUnique(baseSKU: string, type: 'product' | 'variant'): Promise<string> {
    let counter = 1;
    let uniqueSKU = `${baseSKU}-${counter.toString().padStart(2, '0')}`;
    
    while (counter <= 99) {
      const existing = type === 'product' 
        ? await Product.findBySku(uniqueSKU)
        : await ProductVariant.findBySku(uniqueSKU);
      
      if (!existing) {
        return uniqueSKU;
      }
      
      counter++;
      uniqueSKU = `${baseSKU}-${counter.toString().padStart(2, '0')}`;
    }
    
    // If we can't find a unique SKU with counter, use timestamp
    const timestamp = Date.now().toString().slice(-4);
    return `${baseSKU}-${timestamp}`;
  }

  /**
   * Get next sequence number (simple implementation)
   */
  private static async getNextSequence(): Promise<number> {
    // In a real implementation, this would use a counter collection
    // For now, use timestamp-based approach
    return Date.now() % 10000;
  }

  /**
   * Generate fallback SKU when all else fails
   */
  private static generateFallbackSKU(prefix: string = 'PRD'): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${prefix}-${timestamp.slice(-6)}-${random}`;
  }

  /**
   * Validate SKU format
   */
  static validateSKU(sku: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!sku || sku.trim() === '') {
      errors.push('SKU cannot be empty');
    }
    
    if (sku && sku.length < 3) {
      errors.push('SKU must be at least 3 characters long');
    }
    
    if (sku && sku.length > 50) {
      errors.push('SKU cannot exceed 50 characters');
    }
    
    if (sku && !/^[A-Z0-9\-_]+$/.test(sku)) {
      errors.push('SKU can only contain uppercase letters, numbers, hyphens, and underscores');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if SKU is unique
   */
  static async isUnique(sku: string, excludeId?: string): Promise<boolean> {
    try {
      const [existingProduct, existingVariant] = await Promise.all([
        Product.findBySku(sku),
        ProductVariant.findBySku(sku)
      ]);
      
      // Check if found items are the same as excluded item
      if (excludeId) {
        if (existingProduct && existingProduct.id === excludeId) {
          return true;
        }
        if (existingVariant && existingVariant.id === excludeId) {
          return true;
        }
      }
      
      return !existingProduct && !existingVariant;
    } catch (error) {
      console.error('Error checking SKU uniqueness:', error);
      return false;
    }
  }

  /**
   * Generate bulk SKUs for multiple products
   */
  static async generateBulkSKUs(
    products: Array<{
      title: string;
      category?: string[];
      brand?: string;
      variants?: { attributes: { name: string; value: string }[] }[];
    }>,
    config: Partial<SKUGeneratorConfig> = {}
  ): Promise<Array<{
    productSKU: string;
    variantSKUs?: string[];
  }>> {
    const results = [];
    
    for (const product of products) {
      const productSKU = await this.generateProductSKU(product, config);
      let variantSKUs: string[] | undefined;
      
      if (product.variants && product.variants.length > 0) {
        variantSKUs = [];
        for (const variant of product.variants) {
          const variantSKU = await this.generateVariantSKU(
            { ...product, sku: productSKU },
            variant,
            config
          );
          variantSKUs.push(variantSKU);
        }
      }
      
      results.push({
        productSKU,
        variantSKUs
      });
    }
    
    return results;
  }
}