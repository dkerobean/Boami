import { NextRequest, NextResponse } from 'next/server';
import * as yup from 'yup';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/database/mongoose-connection';
import Product from '@/lib/database/models/Product';
import ProductVariant from '@/lib/database/models/ProductVariant';
import InventoryLog from '@/lib/database/models/InventoryLog';
import StockAlert from '@/lib/database/models/StockAlert';
import { InventoryManager } from '@/lib/utils/inventory-manager';

const productUpdateSchema = yup.object({
  title: yup.string().max(200),
  description: yup.string(),
  price: yup.number().min(0),
  regularPrice: yup.number().min(0),
  salePrice: yup.number().min(0),
  category: yup.array().of(yup.string()),
  subcategory: yup.array().of(yup.string()),
  brand: yup.string(),
  status: yup.string().oneOf(['draft', 'pending', 'private', 'publish']),
  featured: yup.boolean(),
  virtual: yup.boolean(),
  downloadable: yup.boolean(),
  qty: yup.number().min(0),
  lowStockThreshold: yup.number().min(0),
  manageStock: yup.boolean(),
  backordersAllowed: yup.boolean(),
  weight: yup.number().min(0),
  dimensions: yup.object({
    length: yup.string(),
    width: yup.string(),
    height: yup.string()
  }),
  photo: yup.string(),
  gallery: yup.array().of(yup.string()),
  tags: yup.array().of(yup.string())
});

/**
 * Helper function to check if a string is a valid MongoDB ObjectId
 */
function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Helper function to find a product using multiple lookup strategies
 */
async function findProductById(id: string) {
  let product = null;

  // Strategy 1: Try as MongoDB ObjectId first (most common case)
  if (isValidObjectId(id)) {
    try {
      product = await Product.findById(id).lean();
      if (product) return product;
    } catch (error) {
      console.warn('ObjectId lookup failed:', error);
    }
  }

  // Strategy 2: Try as WordPress ID (numeric)
  const numericId = Number(id);
  if (!isNaN(numericId) && Number.isInteger(numericId)) {
    try {
      product = await Product.findOne({ 'wordpress.id': numericId }).lean();
      if (product) return product;
    } catch (error) {
      console.warn('WordPress ID lookup failed:', error);
    }
  }

  // Strategy 3: Try as custom numeric ID field (if exists)
  if (!isNaN(numericId) && Number.isInteger(numericId)) {
    try {
      product = await Product.findOne({ numericId: numericId }).lean();
      if (product) return product;
    } catch (error) {
      console.warn('Numeric ID lookup failed:', error);
    }
  }

  // Strategy 4: Try as string ID in other fields (like SKU or custom ID)
  try {
    product = await Product.findOne({ 
      $or: [
        { sku: id },
        { customId: id },
        { externalId: id }
      ]
    }).lean();
    if (product) return product;
  } catch (error) {
    console.warn('Alternative ID lookup failed:', error);
  }

  return null;
}

/**
 * GET /api/products/[id] - Get single product with variants and inventory details
 * Supports multiple ID formats: MongoDB ObjectId, WordPress ID, numeric ID, SKU, etc.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    const productId = params.id;
    
    if (!productId || typeof productId !== 'string' || productId.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'Product ID is required'
      }, { status: 400 });
    }

    // Use flexible product lookup
    const product = await findProductById(productId.trim());
    
    if (!product) {
      return NextResponse.json({
        success: false,
        error: 'Product not found'
      }, { status: 404 });
    }

    // Use the actual MongoDB _id for related data queries
    const mongoId = product._id.toString();

    // Get additional data using the MongoDB ObjectId
    const [variants, inventoryLogs, stockAlerts] = await Promise.all([
      product.type === 'variable' ? ProductVariant.findByProductId(mongoId) : [],
      InventoryLog.findByProduct(mongoId, 10),
      StockAlert.findByProduct(mongoId)
    ]);

    // Map the product data to ensure compatibility with frontend
    const mappedProduct = {
      ...product,
      id: product._id,
      created: product.createdAt || new Date(),
      updated: product.updatedAt || new Date(),
      // Ensure required fields have defaults
      stock: product.stock !== undefined ? product.stock : (product.qty || 0) > 0,
      rating: product.rating || 0,
      category: Array.isArray(product.category) ? product.category : [product.category].filter(Boolean),
      colors: product.colors || [],
      tags: product.tags || [],
      gallery: product.gallery || [],
      // Map pricing fields for compatibility
      salesPrice: product.salesPrice || product.salePrice || product.price,
      regularPrice: product.regularPrice || product.price,
    };

    return NextResponse.json({
      success: true,
      data: {
        product: mappedProduct,
        variants,
        inventoryLogs,
        stockAlerts
      }
    });

  } catch (error) {
    console.error('Product GET error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch product'
    }, { status: 500 });
  }
}

/**
 * PUT /api/products/[id] - Update product
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    const productId = params.id;
    const body = await request.json();
    
    if (!productId) {
      return NextResponse.json({
        success: false,
        error: 'Product ID is required'
      }, { status: 400 });
    }

    // Validate request body
    const validatedData = await productUpdateSchema.validate(body);

    // Find existing product using flexible lookup
    const existingProduct = await findProductById(productId.trim());
    
    if (!existingProduct) {
      return NextResponse.json({
        success: false,
        error: 'Product not found'
      }, { status: 404 });
    }

    // Handle inventory quantity change
    const oldQuantity = (existingProduct as any).qty;
    const newQuantity = validatedData.qty;
    
    if (newQuantity !== undefined && newQuantity !== oldQuantity) {
      const quantityChange = newQuantity - oldQuantity;
      const sku = (existingProduct as any).sku || (existingProduct as any).inventory?.sku;
      
      if (sku) {
        const inventoryResult = await InventoryManager.updateInventory({
          sku: sku,
          type: 'adjustment',
          quantity: quantityChange,
          reason: 'Product update - quantity adjustment',
          userId: 'system', // TODO: Get from JWT token
          source: 'manual'
        });

        if (!inventoryResult.success) {
          return NextResponse.json({
            success: false,
            error: inventoryResult.error
          }, { status: 400 });
        }
      }
    }

    // Calculate discount if pricing changed
    if (validatedData.regularPrice && validatedData.salePrice) {
      (validatedData as any).discount = Math.round(
        ((validatedData.regularPrice - validatedData.salePrice) / validatedData.regularPrice) * 100
      );
      (validatedData as any).salesPrice = validatedData.salePrice;
    } else if (validatedData.price) {
      (validatedData as any).salesPrice = validatedData.price;
    }

    // Update product using the MongoDB ObjectId from the found product
    const updatedProduct = await Product.findByIdAndUpdate(
      existingProduct._id,
      {
        ...validatedData,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct
    });

  } catch (error) {
    console.error('Product update error:', error);
    
    if (error instanceof yup.ValidationError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to update product'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/products/[id] - Delete product
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    const productId = params.id;
    
    if (!productId) {
      return NextResponse.json({
        success: false,
        error: 'Product ID is required'
      }, { status: 400 });
    }

    // Find product using flexible lookup
    const product = await findProductById(productId.trim());
    
    if (!product) {
      return NextResponse.json({
        success: false,
        error: 'Product not found'
      }, { status: 404 });
    }

    // Check if product has active orders (you might want to add this check)
    // const hasActiveOrders = await checkActiveOrders(productId);
    // if (hasActiveOrders) {
    //   return NextResponse.json({
    //     success: false,
    //     error: 'Cannot delete product with active orders'
    //   }, { status: 400 });
    // }

    const session = await Product.db.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Use the MongoDB ObjectId for related operations
        const mongoId = product._id.toString();
        
        // Delete product variants
        await ProductVariant.deleteMany({ productId: mongoId }, { session });
        
        // Delete associated stock alerts
        const sku = (product as any).sku || (product as any).inventory?.sku;
        if (sku) {
          await StockAlert.deleteMany({ sku }, { session });
        }
        
        // Delete the product (inventory logs are kept for audit purposes)
        await Product.findByIdAndDelete(product._id, { session });
      });

      return NextResponse.json({
        success: true,
        message: 'Product deleted successfully'
      });

    } finally {
      await session.endSession();
    }

  } catch (error) {
    console.error('Product deletion error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete product'
    }, { status: 500 });
  }
}