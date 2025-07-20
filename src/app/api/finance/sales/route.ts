import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/mongoose-connection';
import Sale from '@/lib/database/models/Sale';
import Income from '@/lib/database/models/Income';
import IncomeCategory from '@/lib/database/models/IncomeCategory';
import Product from '@/lib/database/models/Product';
import { verifyJWT } from '@/lib/auth/jwt';

/**
 * GET /api/finance/sales
 * Retrieves sales records for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid authentication token' } },
        { status: 401 }
      );
    }

    await connectDB();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const productId = searchParams.get('productId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query
    const query: any = { userId: decoded.userId };

    if (productId) {
      query.productId = productId;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [sales, total] = await Promise.all([
      Sale.find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Sale.countDocuments(query)
    ]);

    // Get product information for the sales
    const productIds = Array.from(new Set(sales.map(sale => sale.productId)));
    const products = await Product.find({
      _id: { $in: productIds }
    }).lean();

    const productMap = products.reduce((map, product) => {
      map[product._id.toString()] = product;
      return map;
    }, {} as any);

    // Enrich sales data with product information
    const enrichedSales = sales.map(sale => ({
      ...sale,
      product: productMap[sale.productId] || null
    }));

    // Calculate analytics
    const analytics = await Sale.getSalesAnalytics(decoded.userId);

    return NextResponse.json({
      success: true,
      data: {
        sales: enrichedSales,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        analytics
      }
    });

  } catch (error) {
    console.error('Sales GET error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve sales records' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/finance/sales
 * Creates a new sale record with inventory integration
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid authentication token' } },
        { status: 401 }
      );
    }

    await connectDB();

    // Parse request body
    const body = await request.json();
    const { productId, quantity, unitPrice, date, notes, createIncomeRecord = true } = body;

    // Validate required fields
    if (!productId || !quantity || !unitPrice) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Product ID, quantity, and unit price are required' } },
        { status: 400 }
      );
    }

    // Validate numeric fields
    if (typeof quantity !== 'number' || quantity <= 0 || !Number.isInteger(quantity)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Quantity must be a positive integer' } },
        { status: 400 }
      );
    }

    if (typeof unitPrice !== 'number' || unitPrice <= 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Unit price must be a positive number' } },
        { status: 400 }
      );
    }

    // Find and validate product
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Product not found' } },
        { status: 400 }
      );
    }

    // Check inventory availability
    if (product.manageStock && product.qty < quantity) {
      return NextResponse.json(
        { success: false, error: { code: 'INSUFFICIENT_INVENTORY', message: `Insufficient inventory. Available: ${product.qty}, Requested: ${quantity}` } },
        { status: 400 }
      );
    }

    // Calculate total amount
    const totalAmount = Math.round(quantity * unitPrice * 100) / 100;

    // Create sale record
    const saleData = {
      productId,
      quantity,
      unitPrice,
      totalAmount,
      date: date ? new Date(date) : new Date(),
      notes: notes?.trim() || null,
      userId: decoded.userId
    };

    const sale = new Sale(saleData);
    const savedSale = await sale.save();

    // Update product inventory
    if (product.manageStock) {
      product.qty -= quantity;

      // Update stock status based on new quantity
      if (product.qty <= 0) {
        product.stockStatus = product.backordersAllowed ? 'onbackorder' : 'outofstock';
        product.stock = false;
      } else if (product.qty <= (product.lowStockThreshold || 0)) {
        product.stockStatus = 'instock'; // Still in stock but low
      }

      await product.save();
    }

    // Create income record if requested
    let incomeRecord = null;
    if (createIncomeRecord) {
      try {
        // Find or create "Product Sales" category
        let productSalesCategory = await IncomeCategory.findOne({
          name: 'Product Sales',
          userId: decoded.userId
        });

        if (!productSalesCategory) {
          productSalesCategory = new IncomeCategory({
            name: 'Product Sales',
            description: 'Revenue from product sales',
            userId: decoded.userId,
            isDefault: false
          });
          await productSalesCategory.save();
        }

        // Create income record
        const incomeData = {
          amount: totalAmount,
          description: `Sale of ${quantity}x ${product.title}`,
          date: saleData.date,
          categoryId: productSalesCategory._id?.toString(),
          saleId: savedSale._id?.toString(),
          isRecurring: false,
          userId: decoded.userId
        };

        const income = new Income(incomeData);
        incomeRecord = await income.save();
      } catch (incomeError) {
        console.error('Failed to create income record:', incomeError);
        // Don't fail the sale if income creation fails
      }
    }

    // Return enriched sale data
    const enrichedSale = {
      ...savedSale.toJSON(),
      product: product.toJSON(),
      incomeRecord: incomeRecord?.toJSON() || null
    };

    return NextResponse.json({
      success: true,
      data: {
        sale: enrichedSale,
        inventoryUpdate: {
          productId: product._id,
          previousQuantity: product.qty + quantity,
          newQuantity: product.qty,
          stockStatus: product.stockStatus
        }
      },
      message: 'Sale recorded successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Sales POST error:', error);

    // Handle validation errors
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create sale record' } },
      { status: 500 }
    );
  }
}