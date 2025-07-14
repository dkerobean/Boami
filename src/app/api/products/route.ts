import { NextRequest, NextResponse } from 'next/server';
import * as yup from 'yup';
import { connectToDatabase } from '@/lib/database/mongoose-connection';
import Product from '@/lib/database/models/Product';
import ProductVariant from '@/lib/database/models/ProductVariant';
import { SKUGenerator } from '@/lib/utils/sku-generator';
import { InventoryManager } from '@/lib/utils/inventory-manager';

// Validation schemas
const productCreateSchema = yup.object({
  title: yup.string().required('Product title is required').max(200),
  description: yup.string().required('Product description is required'),
  price: yup.number().required('Price is required').min(0),
  regularPrice: yup.number().min(0),
  salePrice: yup.number().min(0),
  sku: yup.string().max(50),
  category: yup.array().of(yup.string()).min(1, 'At least one category is required'),
  subcategory: yup.array().of(yup.string()),
  brand: yup.string(),
  type: yup.string().oneOf(['simple', 'variable', 'grouped', 'external']).default('simple'),
  status: yup.string().oneOf(['draft', 'pending', 'private', 'publish']).default('publish'),
  featured: yup.boolean().default(false),
  virtual: yup.boolean().default(false),
  downloadable: yup.boolean().default(false),
  qty: yup.number().min(0).default(0),
  lowStockThreshold: yup.number().min(0).default(5),
  manageStock: yup.boolean().default(true),
  backordersAllowed: yup.boolean().default(false),
  weight: yup.number().min(0),
  dimensions: yup.object({
    length: yup.string().default(''),
    width: yup.string().default(''),
    height: yup.string().default('')
  }),
  photo: yup.string().required('Product photo is required'),
  gallery: yup.array().of(yup.string()),
  tags: yup.array().of(yup.string()).default([]),
  variants: yup.array().of(yup.object({
    attributes: yup.array().of(yup.object({
      name: yup.string().required(),
      value: yup.string().required()
    })).min(1),
    pricing: yup.object({
      price: yup.number().required().min(0),
      compareAtPrice: yup.number().min(0),
      costPrice: yup.number().min(0),
      currency: yup.string().default('USD')
    }),
    inventory: yup.object({
      quantity: yup.number().required().min(0),
      lowStockThreshold: yup.number().min(0).default(5),
      backordersAllowed: yup.boolean().default(false)
    }),
    status: yup.string().oneOf(['active', 'inactive']).default('active'),
    isDefault: yup.boolean().default(false)
  }))
});

// For updates, make all fields optional
const productUpdateSchema = yup.object({
  title: yup.string().max(200),
  description: yup.string(),
  price: yup.number().min(0),
  regularPrice: yup.number().min(0),
  salePrice: yup.number().min(0),
  sku: yup.string().max(50),
  category: yup.array().of(yup.string()),
  subcategory: yup.array().of(yup.string()),
  brand: yup.string(),
  type: yup.string().oneOf(['simple', 'variable', 'grouped', 'external']),
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
  tags: yup.array().of(yup.string()),
  variants: yup.array().of(yup.object({
    attributes: yup.array().of(yup.object({
      name: yup.string().required(),
      value: yup.string().required()
    })),
    pricing: yup.object({
      price: yup.number().min(0),
      compareAtPrice: yup.number().min(0),
      costPrice: yup.number().min(0),
      currency: yup.string()
    }),
    inventory: yup.object({
      quantity: yup.number().min(0),
      lowStockThreshold: yup.number().min(0),
      backordersAllowed: yup.boolean()
    }),
    status: yup.string().oneOf(['active', 'inactive']),
    isDefault: yup.boolean()
  }))
});

const productListSchema = yup.object({
  page: yup.number().min(1).default(1),
  limit: yup.number().min(1).max(100).default(20),
  search: yup.string(),
  category: yup.array().of(yup.string()),
  brand: yup.array().of(yup.string()),
  status: yup.array().of(yup.string()),
  stockStatus: yup.array().of(yup.string()),
  type: yup.array().of(yup.string()),
  featured: yup.boolean(),
  sortBy: yup.string().oneOf(['title', 'price', 'createdAt', 'updatedAt', 'qty']).default('createdAt'),
  sortOrder: yup.string().oneOf(['asc', 'desc']).default('desc')
});

/**
 * GET /api/products - List products with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    
    // Parse array parameters
    ['category', 'brand', 'status', 'stockStatus', 'type'].forEach(key => {
      if (params[key]) {
        (params as any)[key] = params[key].split(',');
      }
    });

    // Validate query parameters
    const validatedParams = await productListSchema.validate(params);

    // Build MongoDB query
    const query: any = {};
    
    if (validatedParams.search) {
      query.$or = [
        { title: { $regex: validatedParams.search, $options: 'i' } },
        { description: { $regex: validatedParams.search, $options: 'i' } },
        { sku: { $regex: validatedParams.search, $options: 'i' } },
        { tags: { $in: [new RegExp(validatedParams.search, 'i')] } }
      ];
    }

    if (validatedParams.category && validatedParams.category.length > 0) {
      query.category = { $in: validatedParams.category };
    }

    if (validatedParams.brand && validatedParams.brand.length > 0) {
      query.brand = { $in: validatedParams.brand };
    }

    if (validatedParams.status && validatedParams.status.length > 0) {
      query.status = { $in: validatedParams.status };
    }

    if (validatedParams.stockStatus && validatedParams.stockStatus.length > 0) {
      query.stockStatus = { $in: validatedParams.stockStatus };
    }

    if (validatedParams.type && validatedParams.type.length > 0) {
      query.type = { $in: validatedParams.type };
    }

    if (validatedParams.featured !== undefined) {
      query.featured = validatedParams.featured;
    }

    // Build sort object
    const sort: any = {};
    sort[validatedParams.sortBy] = validatedParams.sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (validatedParams.page - 1) * validatedParams.limit;

    // Execute query
    const [products, total] = await Promise.all([
      Product.find(query)
        .sort(sort)
        .skip(skip)
        .limit(validatedParams.limit)
        .lean(),
      Product.countDocuments(query)
    ]);

    // Get variants for variable products and map field names for frontend compatibility
    const enhancedProducts = await Promise.all(
      products.map(async (product) => {
        // Map MongoDB field names to frontend expected field names
        const mappedProduct = {
          ...product,
          id: product._id,
          created: product.createdAt || new Date(),
          updated: product.updatedAt || new Date(),
          photo: product.photo,
          // Ensure required fields have defaults
          stock: product.stock !== undefined ? product.stock : product.qty > 0,
          rating: product.rating || 0,
          category: Array.isArray(product.category) ? product.category : [product.category].filter(Boolean),
          colors: product.colors || [],
          tags: product.tags || [],
          gallery: product.gallery || []
        };

        if (product.type === 'variable') {
          const variants = await ProductVariant.findByProductId(product._id.toString());
          return { ...mappedProduct, variants };
        }
        return mappedProduct;
      })
    );

    const totalPages = Math.ceil(total / validatedParams.limit);

    return NextResponse.json({
      success: true,
      data: {
        products: enhancedProducts,
        pagination: {
          page: validatedParams.page,
          limit: validatedParams.limit,
          total,
          totalPages
        },
        filters: {
          search: validatedParams.search,
          category: validatedParams.category,
          brand: validatedParams.brand,
          status: validatedParams.status,
          stockStatus: validatedParams.stockStatus,
          type: validatedParams.type,
          featured: validatedParams.featured
        },
        sort: {
          field: validatedParams.sortBy,
          direction: validatedParams.sortOrder
        }
      }
    });

  } catch (error) {
    console.error('Products GET error:', error);
    
    if (error instanceof yup.ValidationError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch products'
    }, { status: 500 });
  }
}

/**
 * POST /api/products - Create new product
 */
export async function POST(request: NextRequest) {
  try {
    // Connect to database with error handling
    try {
      await connectToDatabase();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: process.env.NODE_ENV === 'development' ? dbError : undefined
      }, { status: 500 });
    }

    // Parse request body with error handling
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body'
      }, { status: 400 });
    }
    
    // Validate request body
    let validatedData: any;
    try {
      validatedData = await productCreateSchema.validate(body);
    } catch (validationError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: validationError instanceof yup.ValidationError ? validationError.errors : [validationError]
      }, { status: 400 });
    }

    // Generate SKU if not provided
    try {
      if (!validatedData.sku) {
        validatedData.sku = await SKUGenerator.generateProductSKU({
          title: validatedData.title,
          category: validatedData.category,
          brand: validatedData.brand
        });
      } else {
        // Validate SKU uniqueness
        const isUnique = await SKUGenerator.isUnique(validatedData.sku);
        if (!isUnique) {
          return NextResponse.json({
            success: false,
            error: 'SKU already exists'
          }, { status: 400 });
        }
      }
    } catch (skuError) {
      console.error('SKU generation error:', skuError);
      // Generate a fallback SKU
      validatedData.sku = `PRD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    }

    // Calculate discount and sales price
    if (validatedData.regularPrice && validatedData.salePrice) {
      validatedData.discount = Math.round(
        ((validatedData.regularPrice - validatedData.salePrice) / validatedData.regularPrice) * 100
      );
    }

    // Start session for transaction with error handling
    let session: any;
    try {
      session = await Product.db.startSession();
    } catch (sessionError) {
      console.error('Failed to start database session:', sessionError);
      return NextResponse.json({
        success: false,
        error: 'Database session initialization failed'
      }, { status: 500 });
    }
    
    try {
      const result = await session.withTransaction(async () => {
        // Create product
        const productData = {
          ...validatedData,
          salesPrice: validatedData.salePrice || validatedData.price,
          stock: validatedData.qty > 0,
          stockStatus: validatedData.qty > 0 ? 'instock' : 'outofstock',
          rating: 0,
          averageRating: 0,
          ratingCount: 0,
          reviewsAllowed: true,
          related: false,
          relatedIds: [],
          upsellIds: [],
          crossSellIds: [],
          colors: [] // Could be extracted from variants
        };

        let product;
        try {
          product = new Product(productData);
          await product.save({ session });
        } catch (productSaveError) {
          console.error('Failed to save product:', productSaveError);
          throw new Error('Failed to create product: ' + (productSaveError instanceof Error ? productSaveError.message : 'Unknown error'));
        }

        // Create variants if this is a variable product
        if (validatedData.type === 'variable' && validatedData.variants && validatedData.variants.length > 0) {
          try {
            for (const [index, variantData] of validatedData.variants.entries()) {
              let variantSKU;
              try {
                variantSKU = await SKUGenerator.generateVariantSKU(
                  { title: product.title, sku: product.sku },
                  { attributes: variantData.attributes }
                );
              } catch (variantSKUError) {
                console.error('Variant SKU generation failed:', variantSKUError);
                // Generate fallback variant SKU
                variantSKU = `${product.sku}-V${index + 1}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
              }

              const variant = new ProductVariant({
                productId: product._id,
                sku: variantSKU,
                attributes: variantData.attributes,
                pricing: {
                  currency: 'USD',
                  ...variantData.pricing
                },
                inventory: {
                  reserved: 0,
                  available: variantData.inventory.quantity,
                  ...variantData.inventory
                },
                status: variantData.status || 'active',
                isDefault: variantData.isDefault || index === 0
              });

              await variant.save({ session });

              // Log initial inventory for variant (with error handling)
              if (variantData.inventory.quantity > 0) {
                try {
                  await InventoryManager.updateInventory({
                    sku: variantSKU,
                    type: 'restock',
                    quantity: variantData.inventory.quantity,
                    reason: 'Initial stock - product creation',
                    userId: 'system', // TODO: Get from JWT token
                    source: 'manual'
                  });
                } catch (inventoryError) {
                  console.warn('Failed to log initial variant inventory:', inventoryError);
                  // Continue without failing the entire transaction
                }
              }
            }
          } catch (variantError) {
            console.error('Failed to create product variants:', variantError);
            throw new Error('Failed to create product variants: ' + (variantError instanceof Error ? variantError.message : 'Unknown error'));
          }
        } else if (validatedData.qty > 0) {
          // Log initial inventory for simple product (with error handling)
          try {
            await InventoryManager.updateInventory({
              sku: validatedData.sku!,
              type: 'restock',
              quantity: validatedData.qty,
              reason: 'Initial stock - product creation',
              userId: 'system', // TODO: Get from JWT token
              source: 'manual'
            });
          } catch (inventoryError) {
            console.warn('Failed to log initial product inventory:', inventoryError);
            // Continue without failing the entire transaction
          }
        }

        return product;
      });

      return NextResponse.json({
        success: true,
        message: 'Product created successfully',
        data: result
      }, { status: 201 });

    } catch (transactionError) {
      console.error('Database transaction failed:', transactionError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create product',
        details: process.env.NODE_ENV === 'development' ? (transactionError instanceof Error ? transactionError.message : transactionError) : undefined
      }, { status: 500 });
    } finally {
      if (session) {
        await session.endSession();
      }
    }

  } catch (error) {
    console.error('Unexpected product creation error:', error);
    
    // Handle different error types
    if (error instanceof yup.ValidationError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.errors
      }, { status: 400 });
    }

    // Handle mongoose validation errors
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError') {
      return NextResponse.json({
        success: false,
        error: 'Database validation error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }, { status: 400 });
    }

    // Handle duplicate key errors (SKU conflicts)
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return NextResponse.json({
        success: false,
        error: 'Duplicate SKU or unique field conflict'
      }, { status: 409 });
    }

    // Handle all other errors as internal server errors
    return NextResponse.json({
      success: false,
      error: 'Internal server error occurred while creating product',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : error) : undefined
    }, { status: 500 });
  }
}

/**
 * PUT /api/products - Bulk update products
 */
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { productIds, updates, operation } = body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Product IDs are required'
      }, { status: 400 });
    }

    let result;
    
    switch (operation) {
      case 'update_status':
        if (!updates.status) {
          return NextResponse.json({
            success: false,
            error: 'Status is required for update_status operation'
          }, { status: 400 });
        }
        
        result = await Product.updateMany(
          { _id: { $in: productIds } },
          { $set: { status: updates.status, updatedAt: new Date() } }
        );
        break;

      case 'update_category':
        if (!updates.category) {
          return NextResponse.json({
            success: false,
            error: 'Category is required for update_category operation'
          }, { status: 400 });
        }
        
        result = await Product.updateMany(
          { _id: { $in: productIds } },
          { $set: { category: updates.category, updatedAt: new Date() } }
        );
        break;

      case 'delete':
        result = await Product.deleteMany({ _id: { $in: productIds } });
        // Also delete associated variants
        await ProductVariant.deleteMany({ productId: { $in: productIds } });
        break;

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid operation'
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully performed ${operation} on ${(result as any).modifiedCount || (result as any).deletedCount} products`,
      data: {
        operation,
        affected: (result as any).modifiedCount || (result as any).deletedCount
      }
    });

  } catch (error) {
    console.error('Bulk update error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to perform bulk operation'
    }, { status: 500 });
  }
}