import Papa from 'papaparse';
import { Readable } from 'stream';
import Product from '../database/models/Product';
import ProductVariant from '../database/models/ProductVariant';
import InventoryLog from '../database/models/InventoryLog';
import { SKUGenerator } from './sku-generator';
import { InventoryManager } from './inventory-manager';

/**
 * CSV Processor Utility
 * Handles streaming CSV import/export with validation and error reporting
 */

export interface CSVImportResult {
  totalRows: number;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
    data?: any;
  }>;
  warnings: Array<{
    row: number;
    message: string;
    data?: any;
  }>;
}

export interface CSVExportOptions {
  includeVariants: boolean;
  includeInventoryLogs: boolean;
  fields?: string[];
  filters?: {
    category?: string[];
    status?: string[];
    dateFrom?: Date;
    dateTo?: Date;
  };
}

export interface ProductCSVData {
  title: string;
  description?: string;
  shortDescription?: string;
  sku?: string;
  price: number;
  regularPrice?: number;
  salePrice?: number;
  category: string;
  subcategory?: string;
  brand?: string;
  type: 'simple' | 'variable';
  status: 'draft' | 'pending' | 'private' | 'publish';
  featured?: boolean;
  virtual?: boolean;
  downloadable?: boolean;
  quantity: number;
  lowStockThreshold?: number;
  manageStock?: boolean;
  stockStatus?: 'instock' | 'outofstock' | 'onbackorder';
  backordersAllowed?: boolean;
  weight?: number;
  length?: string;
  width?: string;
  height?: string;
  photo: string;
  gallery?: string;
  tags?: string;
  // Variant-specific fields (for variable products)
  variantAttributes?: string; // JSON string of attributes
  variantPricing?: string; // JSON string of variant pricing
  variantInventory?: string; // JSON string of variant inventory
}

export class CSVProcessor {
  /**
   * Process product import from CSV buffer
   */
  static async processProductImport(
    fileBuffer: Buffer,
    userId: string,
    options: {
      updateExisting?: boolean;
      skipDuplicates?: boolean;
      generateMissingSKUs?: boolean;
      validateOnly?: boolean;
    } = {}
  ): Promise<CSVImportResult> {
    const result: CSVImportResult = {
      totalRows: 0,
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
      warnings: []
    };

    return new Promise((resolve, reject) => {
      const csvString = fileBuffer.toString('utf8');
      
      Papa.parse<ProductCSVData>(csvString, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        step: async (row, parser) => {
          result.totalRows++;
          
          try {
            await this.processCSVRow(row.data, result, userId, options);
            result.processed++;
            
            // Pause parsing occasionally to prevent blocking
            if (result.processed % 100 === 0) {
              parser.pause();
              setTimeout(() => parser.resume(), 10);
            }
          } catch (error) {
            result.failed++;
            result.errors.push({
              row: result.totalRows,
              message: error instanceof Error ? error.message : 'Unknown error',
              data: row.data
            });
          }
        },
        complete: () => {
          resolve(result);
        },
        error: (error: any) => {
          reject(error);
        }
      });
    });
  }

  /**
   * Process a single CSV row
   */
  private static async processCSVRow(
    data: ProductCSVData,
    result: CSVImportResult,
    userId: string,
    options: {
      updateExisting?: boolean;
      skipDuplicates?: boolean;
      generateMissingSKUs?: boolean;
      validateOnly?: boolean;
    }
  ): Promise<void> {
    // Validate required fields
    const validation = this.validateProductData(data);
    if (!validation.valid) {
      result.failed++;
      validation.errors.forEach(error => {
        result.errors.push({
          row: result.totalRows,
          field: error.field,
          message: error.message,
          data: data
        });
      });
      return;
    }

    // Generate SKU if missing and option is enabled
    if (!data.sku && options.generateMissingSKUs) {
      try {
        data.sku = await SKUGenerator.generateProductSKU({
          title: data.title,
          category: data.category ? [data.category] : undefined,
          brand: data.brand
        });
      } catch (error) {
        result.warnings.push({
          row: result.totalRows,
          message: 'Failed to generate SKU, skipping row',
          data: data
        });
        result.skipped++;
        return;
      }
    }

    // Check if product exists
    const existingProduct = data.sku ? await Product.findBySku(data.sku) : null;
    
    if (existingProduct && !options.updateExisting) {
      if (options.skipDuplicates) {
        result.skipped++;
        result.warnings.push({
          row: result.totalRows,
          message: `Product with SKU ${data.sku} already exists, skipping`,
          data: data
        });
        return;
      } else {
        result.failed++;
        result.errors.push({
          row: result.totalRows,
          field: 'sku',
          message: `Product with SKU ${data.sku} already exists`,
          data: data
        });
        return;
      }
    }

    // If validateOnly mode, just validate and return
    if (options.validateOnly) {
      if (existingProduct) {
        result.updated++;
      } else {
        result.created++;
      }
      return;
    }

    // Process the product
    try {
      if (existingProduct && options.updateExisting) {
        await this.updateProductFromCSV(existingProduct, data, userId);
        result.updated++;
      } else {
        await this.createProductFromCSV(data, userId);
        result.created++;
      }
    } catch (error) {
      result.failed++;
      result.errors.push({
        row: result.totalRows,
        message: error instanceof Error ? error.message : 'Failed to process product',
        data: data
      });
    }
  }

  /**
   * Create new product from CSV data
   */
  private static async createProductFromCSV(data: ProductCSVData, userId: string): Promise<void> {
    const productData = {
      title: data.title,
      description: data.description || '',
      shortDescription: data.shortDescription,
      price: data.price,
      regularPrice: data.regularPrice,
      salePrice: data.salePrice,
      discount: data.regularPrice && data.salePrice 
        ? Math.round(((data.regularPrice - data.salePrice) / data.regularPrice) * 100)
        : 0,
      salesPrice: data.salePrice || data.price,
      sku: data.sku,
      category: data.category ? [data.category] : [],
      subcategory: data.subcategory ? [data.subcategory] : undefined,
      brand: data.brand,
      type: data.type || 'simple',
      status: data.status || 'draft',
      featured: data.featured || false,
      virtual: data.virtual || false,
      downloadable: data.downloadable || false,
      
      // Inventory
      stock: data.quantity > 0,
      qty: data.quantity || 0,
      stockStatus: data.stockStatus || (data.quantity > 0 ? 'instock' : 'outofstock'),
      manageStock: data.manageStock !== false,
      backordersAllowed: data.backordersAllowed || false,
      lowStockThreshold: data.lowStockThreshold || 5,
      
      // Physical properties
      weight: data.weight,
      dimensions: {
        length: data.length || '',
        width: data.width || '',
        height: data.height || ''
      },
      
      // Media
      photo: data.photo,
      gallery: data.gallery ? data.gallery.split(',').map(url => url.trim()) : [],
      colors: [], // Could be extracted from variants
      tags: data.tags ? data.tags.split(',').map(tag => tag.trim()) : [],
      
      // System fields
      rating: 0,
      averageRating: 0,
      ratingCount: 0,
      reviewsAllowed: true,
      related: false,
      relatedIds: [],
      upsellIds: [],
      crossSellIds: [],
      createdBy: userId,
      updatedBy: userId
    };

    const product = new Product(productData);
    await product.save();

    // Create inventory log for initial stock
    if (data.quantity > 0) {
      await InventoryLog.createLog({
        productId: product.id,
        sku: data.sku || 'NO-SKU',
        type: 'import',
        quantityBefore: 0,
        quantityChange: data.quantity,
        quantityAfter: data.quantity,
        userId: userId,
        reason: 'CSV import - initial stock',
        source: 'import'
      });
    }

    // Handle variants if this is a variable product
    if (data.type === 'variable' && data.variantAttributes) {
      await this.createVariantsFromCSV(product, data, userId);
    }
  }

  /**
   * Update existing product from CSV data
   */
  private static async updateProductFromCSV(
    existingProduct: any,
    data: ProductCSVData,
    userId: string
  ): Promise<void> {
    const oldQuantity = existingProduct.qty;
    
    // Update product fields
    existingProduct.title = data.title;
    existingProduct.description = data.description || existingProduct.description;
    existingProduct.shortDescription = data.shortDescription || existingProduct.shortDescription;
    existingProduct.price = data.price;
    existingProduct.regularPrice = data.regularPrice || existingProduct.regularPrice;
    existingProduct.salePrice = data.salePrice || existingProduct.salePrice;
    existingProduct.category = data.category ? [data.category] : existingProduct.category;
    existingProduct.brand = data.brand || existingProduct.brand;
    existingProduct.status = data.status || existingProduct.status;
    existingProduct.featured = data.featured !== undefined ? data.featured : existingProduct.featured;
    existingProduct.weight = data.weight || existingProduct.weight;
    existingProduct.photo = data.photo || existingProduct.photo;
    existingProduct.updatedBy = userId;

    // Update inventory if quantity changed
    if (data.quantity !== undefined && data.quantity !== oldQuantity) {
      const quantityChange = data.quantity - oldQuantity;
      
      // Use inventory manager for safe updates
      await InventoryManager.updateInventory({
        sku: data.sku!,
        type: 'adjustment',
        quantity: quantityChange,
        reason: 'CSV import - quantity update',
        userId: userId,
        source: 'import'
      });
    } else {
      // Just save the product updates
      await existingProduct.save();
    }
  }

  /**
   * Create variants from CSV data
   */
  private static async createVariantsFromCSV(
    product: any,
    data: ProductCSVData,
    userId: string
  ): Promise<void> {
    try {
      const variantAttributes = data.variantAttributes ? JSON.parse(data.variantAttributes) : [];
      const variantPricing = data.variantPricing ? JSON.parse(data.variantPricing) : {};
      const variantInventory = data.variantInventory ? JSON.parse(data.variantInventory) : {};

      if (Array.isArray(variantAttributes) && variantAttributes.length > 0) {
        for (let i = 0; i < variantAttributes.length; i++) {
          const attributes = variantAttributes[i];
          const pricing = variantPricing[i] || { price: data.price };
          const inventory = variantInventory[i] || { quantity: data.quantity || 0 };

          const variantSKU = await SKUGenerator.generateVariantSKU(
            { title: product.title, sku: product.sku },
            { attributes }
          );

          const variant = new ProductVariant({
            productId: product.id,
            sku: variantSKU,
            attributes,
            pricing: {
              price: pricing.price || data.price,
              compareAtPrice: pricing.compareAtPrice,
              costPrice: pricing.costPrice,
              currency: pricing.currency || 'USD'
            },
            inventory: {
              quantity: inventory.quantity || 0,
              reserved: 0,
              available: inventory.quantity || 0,
              lowStockThreshold: inventory.lowStockThreshold || 5,
              backordersAllowed: inventory.backordersAllowed || false
            },
            status: 'active',
            isDefault: i === 0
          });

          await variant.save();

          // Create inventory log for variant
          if (inventory.quantity > 0) {
            await InventoryLog.createLog({
              variantId: variant.id,
              sku: variantSKU,
              type: 'import',
              quantityBefore: 0,
              quantityChange: inventory.quantity,
              quantityAfter: inventory.quantity,
              userId: userId,
              reason: 'CSV import - variant initial stock',
              source: 'import'
            });
          }
        }
      }
    } catch (error) {
      console.error('Error creating variants from CSV:', error);
      // Don't throw here to avoid breaking the main import
    }
  }

  /**
   * Validate product data from CSV
   */
  private static validateProductData(data: ProductCSVData): {
    valid: boolean;
    errors: Array<{ field: string; message: string }>;
  } {
    const errors: Array<{ field: string; message: string }> = [];

    // Required fields
    if (!data.title || data.title.trim() === '') {
      errors.push({ field: 'title', message: 'Product title is required' });
    }

    if (data.price === undefined || data.price === null) {
      errors.push({ field: 'price', message: 'Price is required' });
    } else if (data.price < 0) {
      errors.push({ field: 'price', message: 'Price must be positive' });
    }

    if (!data.photo || data.photo.trim() === '') {
      errors.push({ field: 'photo', message: 'Product photo URL is required' });
    }

    // Validate SKU format if provided
    if (data.sku) {
      const skuValidation = SKUGenerator.validateSKU(data.sku);
      if (!skuValidation.valid) {
        errors.push({ 
          field: 'sku', 
          message: `Invalid SKU: ${skuValidation.errors.join(', ')}` 
        });
      }
    }

    // Validate numeric fields
    if (data.quantity !== undefined && data.quantity < 0) {
      errors.push({ field: 'quantity', message: 'Quantity cannot be negative' });
    }

    if (data.weight !== undefined && data.weight < 0) {
      errors.push({ field: 'weight', message: 'Weight cannot be negative' });
    }

    // Validate enum fields
    if (data.type && !['simple', 'variable', 'grouped', 'external'].includes(data.type)) {
      errors.push({ 
        field: 'type', 
        message: 'Type must be one of: simple, variable, grouped, external' 
      });
    }

    if (data.status && !['draft', 'pending', 'private', 'publish'].includes(data.status)) {
      errors.push({ 
        field: 'status', 
        message: 'Status must be one of: draft, pending, private, publish' 
      });
    }

    if (data.stockStatus && !['instock', 'outofstock', 'onbackorder'].includes(data.stockStatus)) {
      errors.push({ 
        field: 'stockStatus', 
        message: 'Stock status must be one of: instock, outofstock, onbackorder' 
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Export products to CSV
   */
  static async exportProductsToCSV(options: CSVExportOptions = { includeVariants: true, includeInventoryLogs: false }): Promise<string> {
    try {
      const products = await this.getProductsForExport(options);
      const csvData = await this.convertProductsToCSV(products, options);
      
      return Papa.unparse(csvData, {
        header: true,
        delimiter: ',',
        newline: '\n'
      });
    } catch (error) {
      console.error('Error exporting products to CSV:', error);
      throw new Error('Failed to export products to CSV');
    }
  }

  /**
   * Get products for export based on filters
   */
  private static async getProductsForExport(options: CSVExportOptions): Promise<any[]> {
    const query: any = {};
    
    if (options.filters) {
      if (options.filters.category && options.filters.category.length > 0) {
        query.category = { $in: options.filters.category };
      }
      
      if (options.filters.status && options.filters.status.length > 0) {
        query.status = { $in: options.filters.status };
      }
      
      if (options.filters.dateFrom || options.filters.dateTo) {
        query.createdAt = {};
        if (options.filters.dateFrom) {
          query.createdAt.$gte = options.filters.dateFrom;
        }
        if (options.filters.dateTo) {
          query.createdAt.$lte = options.filters.dateTo;
        }
      }
    }

    const products = await Product.find(query).sort({ createdAt: -1 });
    
    if (options.includeVariants) {
      // Also include variants
      for (const product of products) {
        const variants = await ProductVariant.findByProductId(product.id);
        (product as any).variants = variants;
      }
    }

    return products;
  }

  /**
   * Convert products to CSV format
   */
  private static async convertProductsToCSV(products: any[], options: CSVExportOptions): Promise<any[]> {
    const csvData = [];

    for (const product of products) {
      // Base product data
      const baseData = {
        title: product.title,
        description: product.description,
        shortDescription: product.shortDescription,
        sku: product.sku || product.inventory?.sku,
        price: product.price,
        regularPrice: product.regularPrice,
        salePrice: product.salePrice,
        category: product.category?.join(','),
        subcategory: product.subcategory?.join(','),
        brand: product.brand,
        type: product.type,
        status: product.status,
        featured: product.featured,
        virtual: product.virtual,
        downloadable: product.downloadable,
        quantity: product.qty,
        lowStockThreshold: product.lowStockThreshold,
        manageStock: product.manageStock,
        stockStatus: product.stockStatus,
        backordersAllowed: product.backordersAllowed,
        weight: product.weight,
        length: product.dimensions?.length,
        width: product.dimensions?.width,
        height: product.dimensions?.height,
        photo: product.photo,
        gallery: product.gallery?.join(','),
        tags: product.tags?.join(','),
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
      };

      // Add WordPress data if available
      if (product.wordpress) {
        (baseData as any).wordpressId = product.wordpress.id;
        (baseData as any).wordpressSyncStatus = product.wordpress.syncStatus;
        (baseData as any).wordpressLastSync = product.wordpress.lastSync;
      }

      if (options.includeVariants && product.variants && product.variants.length > 0) {
        // Include each variant as a separate row
        for (const variant of product.variants) {
          csvData.push({
            ...baseData,
            variantSku: variant.sku,
            variantAttributes: JSON.stringify(variant.attributes),
            variantPrice: variant.pricing.price,
            variantCompareAtPrice: variant.pricing.compareAtPrice,
            variantQuantity: variant.inventory.quantity,
            variantReserved: variant.inventory.reserved,
            variantAvailable: variant.inventory.available,
            variantStatus: variant.status,
            variantIsDefault: variant.isDefault
          });
        }
      } else {
        csvData.push(baseData);
      }
    }

    return csvData;
  }

  /**
   * Generate CSV template for import
   */
  static generateImportTemplate(): string {
    const templateData = [{
      title: 'Sample Product',
      description: 'This is a sample product description',
      shortDescription: 'Short description',
      sku: 'SAMPLE-001',
      price: 29.99,
      regularPrice: 39.99,
      salePrice: 29.99,
      category: 'Electronics',
      subcategory: 'Gadgets',
      brand: 'Sample Brand',
      type: 'simple',
      status: 'publish',
      featured: true,
      virtual: false,
      downloadable: false,
      quantity: 100,
      lowStockThreshold: 5,
      manageStock: true,
      stockStatus: 'instock',
      backordersAllowed: false,
      weight: 0.5,
      length: '10',
      width: '5',
      height: '2',
      photo: 'https://example.com/product-image.jpg',
      gallery: 'https://example.com/image1.jpg,https://example.com/image2.jpg',
      tags: 'electronics,gadget,sample'
    }];

    return Papa.unparse(templateData, {
      header: true,
      delimiter: ',',
      newline: '\n'
    });
  }
}