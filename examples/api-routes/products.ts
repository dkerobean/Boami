import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../database/mongoose-connection';
import Product, { IProduct, IProductVariant } from '../database/product-schema';
import * as yup from 'yup';

/**
 * Example API routes for product management
 * Demonstrates e-commerce specific operations with validation
 * File: app/api/products/route.ts
 */

/**
 * Validation schema for product variant
 */
const variantSchema = yup.object({
  sku: yup.string().required('SKU is required'),
  size: yup.string().optional(),
  color: yup.string().optional(),
  price: yup.number().min(0, 'Price must be positive').required('Price is required'),
  stock: yup.number().min(0, 'Stock must be non-negative').required('Stock is required'),
  isActive: yup.boolean().optional()
});

/**
 * Validation schema for product creation
 */
const createProductSchema = yup.object({
  name: yup.string().max(200, 'Name too long').required('Product name is required'),
  description: yup.string().max(2000, 'Description too long').required('Description is required'),
  category: yup.string().required('Category is required'),
  brand: yup.string().required('Brand is required'),
  basePrice: yup.number().min(0, 'Base price must be positive').required('Base price is required'),
  variants: yup.array().of(variantSchema).min(1, 'At least one variant required').required(),
  images: yup.array().of(yup.string().url('Invalid image URL')).min(1, 'At least one image required').required(),
  tags: yup.array().of(yup.string()).optional(),
  isFeatured: yup.boolean().optional(),
  seo: yup.object({
    title: yup.string().max(60, 'SEO title too long').optional(),
    description: yup.string().max(160, 'SEO description too long').optional(),
    keywords: yup.array().of(yup.string()).optional()
  }).optional(),
  createdBy: yup.string().required('Creator ID is required')
});

/**
 * GET /api/products - Retrieve products with advanced filtering and pagination
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const category = searchParams.get('category');
    const brand = searchParams.get('brand');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const inStock = searchParams.get('inStock') === 'true';
    const featured = searchParams.get('featured') === 'true';
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
    
    // Build aggregation pipeline for complex filtering
    const pipeline: any[] = [
      {
        $match: {
          isActive: true,
          ...(category && { category: category.toLowerCase() }),
          ...(brand && { brand: new RegExp(brand, 'i') }),
          ...(featured && { isFeatured: true }),
          ...(inStock && { totalStock: { $gt: 0 } }),
          ...(search && {
            $or: [
              { name: { $regex: search, $options: 'i' } },
              { description: { $regex: search, $options: 'i' } },
              { tags: { $in: [new RegExp(search, 'i')] } }
            ]
          })
        }
      }
    ];
    
    // Add price filtering if specified
    if (minPrice || maxPrice) {
      pipeline.push({
        $match: {
          'variants': {
            $elemMatch: {
              ...(minPrice && { price: { $gte: parseFloat(minPrice) } }),
              ...(maxPrice && { price: { $lte: parseFloat(maxPrice) } })
            }
          }
        }
      });
    }
    
    // Add sorting
    const sortField = sortBy === 'price' ? 'basePrice' : sortBy;
    pipeline.push({ $sort: { [sortField]: sortOrder } });
    
    // Get total count for pagination
    const countPipeline = [...pipeline, { $count: 'total' }];
    const [totalResult] = await Product.aggregate(countPipeline);
    const totalCount = totalResult?.total || 0;
    
    // Add pagination
    pipeline.push(
      { $skip: (page - 1) * limit },
      { $limit: limit }
    );
    
    // Populate creator information
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        as: 'creator',
        pipeline: [{ $project: { firstName: 1, lastName: 1, email: 1 } }]
      }
    });
    
    const products = await Product.aggregate(pipeline);
    const totalPages = Math.ceil(totalCount / limit);
    
    return NextResponse.json({
      success: true,
      data: {
        products,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        filters: {
          category,
          brand,
          priceRange: { min: minPrice, max: maxPrice },
          inStock,
          featured,
          search
        }
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('GET /api/products error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch products'
    }, { status: 500 });
  }
}

/**
 * POST /api/products - Create a new product
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await connectDB();
    
    const body = await request.json();
    
    // Validate request data
    try {
      await createProductSchema.validate(body);
    } catch (validationError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: (validationError as yup.ValidationError).errors
      }, { status: 400 });
    }
    
    // Check for duplicate SKUs within variants
    const skus = body.variants.map((v: IProductVariant) => v.sku);
    const uniqueSkus = new Set(skus);
    if (skus.length !== uniqueSkus.size) {
      return NextResponse.json({
        success: false,
        error: 'Duplicate SKUs found in variants'
      }, { status: 400 });
    }
    
    // Check if any SKU already exists in database
    const existingProduct = await Product.findOne({
      'variants.sku': { $in: skus }
    });
    if (existingProduct) {
      return NextResponse.json({
        success: false,
        error: 'One or more SKUs already exist'
      }, { status: 409 });
    }
    
    // Create product
    const productData: Partial<IProduct> = {
      ...body,
      category: body.category.toLowerCase(),
      tags: body.tags?.map((tag: string) => tag.toLowerCase()) || []
    };
    
    const product = await Product.create(productData);
    
    // Populate creator info for response
    await product.populate('createdBy', 'firstName lastName email');
    
    return NextResponse.json({
      success: true,
      data: { product },
      message: 'Product created successfully'
    }, { status: 201 });
    
  } catch (error) {
    console.error('POST /api/products error:', error);
    
    if ((error as any).code === 11000) {
      return NextResponse.json({
        success: false,
        error: 'Product with duplicate SKU already exists'
      }, { status: 409 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create product'
    }, { status: 500 });
  }
}

/**
 * GET /api/products/[id] - Get specific product by ID
 * File: app/api/products/[id]/route.ts
 */
export async function getProductById(request: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  try {
    await connectDB();
    
    const { id } = params;
    
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid product ID format'
      }, { status: 400 });
    }
    
    const product = await Product.findById(id)
      .populate('createdBy', 'firstName lastName email')
      .lean();
    
    if (!product) {
      return NextResponse.json({
        success: false,
        error: 'Product not found'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: { product }
    }, { status: 200 });
    
  } catch (error) {
    console.error(`GET /api/products/${params.id} error:`, error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch product'
    }, { status: 500 });
  }
}

/**
 * PATCH /api/products/[id]/variants - Add or update product variant
 * File: app/api/products/[id]/variants/route.ts
 */
export async function updateProductVariant(
  request: NextRequest, 
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    await connectDB();
    
    const { id } = params;
    const body = await request.json();
    const { action, variant } = body; // action: 'add' | 'update' | 'remove'
    
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid product ID format'
      }, { status: 400 });
    }
    
    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({
        success: false,
        error: 'Product not found'
      }, { status: 404 });
    }
    
    switch (action) {
      case 'add':
        try {
          await variantSchema.validate(variant);
          await product.addVariant(variant);
        } catch (error) {
          return NextResponse.json({
            success: false,
            error: (error as Error).message
          }, { status: 400 });
        }
        break;
        
      case 'update':
        const variantIndex = product.variants.findIndex(v => v.sku === variant.sku);
        if (variantIndex === -1) {
          return NextResponse.json({
            success: false,
            error: 'Variant not found'
          }, { status: 404 });
        }
        
        // Update variant fields
        Object.assign(product.variants[variantIndex], variant);
        await product.save();
        break;
        
      case 'remove':
        try {
          await product.removeVariant(variant.sku);
        } catch (error) {
          return NextResponse.json({
            success: false,
            error: (error as Error).message
          }, { status: 400 });
        }
        break;
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Must be add, update, or remove'
        }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      data: { product },
      message: `Variant ${action}ed successfully`
    }, { status: 200 });
    
  } catch (error) {
    console.error(`PATCH /api/products/${params.id}/variants error:`, error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update variant'
    }, { status: 500 });
  }
}

/**
 * POST /api/products/[id]/rating - Add rating to product
 * File: app/api/products/[id]/rating/route.ts
 */
export async function addProductRating(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    await connectDB();
    
    const { id } = params;
    const { rating, userId } = await request.json();
    
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid product ID format'
      }, { status: 400 });
    }
    
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({
        success: false,
        error: 'Rating must be between 1 and 5'
      }, { status: 400 });
    }
    
    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({
        success: false,
        error: 'Product not found'
      }, { status: 404 });
    }
    
    // In a real application, you'd check if user already rated this product
    // and update existing rating instead of adding new one
    
    await product.updateRating(rating);
    
    return NextResponse.json({
      success: true,
      data: { 
        product: {
          _id: product._id,
          name: product.name,
          rating: product.rating
        }
      },
      message: 'Rating added successfully'
    }, { status: 200 });
    
  } catch (error) {
    console.error(`POST /api/products/${params.id}/rating error:`, error);
    return NextResponse.json({
      success: false,
      error: 'Failed to add rating'
    }, { status: 500 });
  }
}

/**
 * GET /api/products/categories - Get all product categories with counts
 * File: app/api/products/categories/route.ts
 */
export async function getProductCategories(request: NextRequest): Promise<NextResponse> {
  try {
    await connectDB();
    
    const categories = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          averagePrice: { $avg: '$basePrice' },
          totalStock: { $sum: '$totalStock' }
        }
      },
      {
        $project: {
          category: '$_id',
          count: 1,
          averagePrice: { $round: ['$averagePrice', 2] },
          totalStock: 1,
          _id: 0
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    return NextResponse.json({
      success: true,
      data: { categories }
    }, { status: 200 });
    
  } catch (error) {
    console.error('GET /api/products/categories error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch categories'
    }, { status: 500 });
  }
}