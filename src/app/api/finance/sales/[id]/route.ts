import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/mongoose-connection';
import Sale from '@/lib/database/models/Sale';
import Product from '@/lib/database/models/Product';
import Income from '@/lib/database/models/Income';
import { verifyJWT } from '@/lib/auth/jwt';

/**
 * GET /api/finance/sales/[id]
 * Retrieves a specific sale record
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Find sale record
    const sale = await Sale.findOne({
      _id: params.id,
      userId: decoded.userId
    }).lean();

    if (!sale) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Sale record not found' } },
        { status: 404 }
      );
    }

    // Get product and related income information
    const [product, relatedIncome] = await Promise.all([
      Product.findById(sale.productId).lean(),
      Income.findOne({ saleId: sale._id.toString() }).lean()
    ]);

    const enrichedSale = {
      ...sale,
      product: product || null,
      relatedIncome: relatedIncome || null
    };

    return NextResponse.json({
      success: true,
      data: {
        sale: enrichedSale
      }
    });

  } catch (error) {
    console.error('Sale GET by ID error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve sale record' } },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/finance/sales/[id]
 * Updates a specific sale record (with inventory adjustment)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Find existing sale record
    const existingSale = await Sale.findOne({
      _id: params.id,
      userId: decoded.userId
    });

    if (!existingSale) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Sale record not found' } },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { quantity, unitPrice, date, notes } = body;

    // Get the product for inventory management
    const product = await Product.findById(existingSale.productId);
    if (!product) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Associated product not found' } },
        { status: 400 }
      );
    }

    // Handle quantity changes (inventory adjustment)
    let inventoryAdjustment = null;
    if (quantity !== undefined && quantity !== existingSale.quantity) {
      // Validate quantity
      if (typeof quantity !== 'number' || quantity <= 0 || !Number.isInteger(quantity)) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'Quantity must be a positive integer' } },
          { status: 400 }
        );
      }

      const quantityDifference = quantity - existingSale.quantity;

      // Check if we have enough inventory for increase
      if (quantityDifference > 0 && product.manageStock && product.qty < quantityDifference) {
        return NextResponse.json(
          { success: false, error: { code: 'INSUFFICIENT_INVENTORY', message: `Insufficient inventory for quantity increase. Available: ${product.qty}, Additional needed: ${quantityDifference}` } },
          { status: 400 }
        );
      }

      // Adjust inventory
      if (product.manageStock) {
        const previousQty = product.qty;
        product.qty -= quantityDifference; // Subtract the difference (negative for returns, positive for additional sales)

        // Update stock status
        if (product.qty <= 0) {
          product.stockStatus = product.backordersAllowed ? 'onbackorder' : 'outofstock';
          product.stock = false;
        } else {
          product.stockStatus = 'instock';
          product.stock = true;
        }

        await product.save();

        inventoryAdjustment = {
          productId: product._id,
          previousQuantity: previousQty,
          newQuantity: product.qty,
          quantityDifference,
          stockStatus: product.stockStatus
        };
      }

      existingSale.quantity = quantity;
    }

    // Validate and update unit price
    if (unitPrice !== undefined) {
      if (typeof unitPrice !== 'number' || unitPrice <= 0) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'Unit price must be a positive number' } },
          { status: 400 }
        );
      }
      existingSale.unitPrice = unitPrice;
    }

    // Update other fields
    if (date !== undefined) existingSale.date = new Date(date);
    if (notes !== undefined) existingSale.notes = notes?.trim() || null;

    // Recalculate total amount
    existingSale.totalAmount = Math.round(existingSale.quantity * existingSale.unitPrice * 100) / 100;

    const updatedSale = await existingSale.save();

    // Update related income record if it exists
    const relatedIncome = await Income.findOne({ saleId: existingSale._id?.toString() });
    if (relatedIncome) {
      relatedIncome.amount = updatedSale.totalAmount;
      relatedIncome.description = `Sale of ${updatedSale.quantity}x ${product.title}`;
      if (date !== undefined) relatedIncome.date = updatedSale.date;
      await relatedIncome.save();
    }

    // Return enriched response
    const enrichedSale = {
      ...updatedSale.toJSON(),
      product: product.toJSON(),
      relatedIncome: relatedIncome?.toJSON() || null
    };

    return NextResponse.json({
      success: true,
      data: {
        sale: enrichedSale,
        inventoryAdjustment
      },
      message: 'Sale record updated successfully'
    });

  } catch (error) {
    console.error('Sale PUT error:', error);

    // Handle validation errors
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update sale record' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/finance/sales/[id]
 * Deletes a specific sale record (with inventory restoration)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Find sale record
    const sale = await Sale.findOne({
      _id: params.id,
      userId: decoded.userId
    });

    if (!sale) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Sale record not found' } },
        { status: 404 }
      );
    }

    // Get product for inventory restoration
    const product = await Product.findById(sale.productId);
    let inventoryRestoration = null;

    if (product && product.manageStock) {
      const previousQty = product.qty;
      product.qty += sale.quantity; // Restore inventory

      // Update stock status
      if (product.qty > 0) {
        product.stockStatus = 'instock';
        product.stock = true;
      }

      await product.save();

      inventoryRestoration = {
        productId: product._id,
        previousQuantity: previousQty,
        newQuantity: product.qty,
        restoredQuantity: sale.quantity,
        stockStatus: product.stockStatus
      };
    }

    // Delete related income record if it exists
    const deletedIncome = await Income.findOneAndDelete({ saleId: sale._id?.toString() });

    // Delete the sale record
    await Sale.findByIdAndDelete(sale._id);

    return NextResponse.json({
      success: true,
      message: 'Sale record deleted successfully',
      data: {
        deletedId: params.id,
        inventoryRestoration,
        deletedIncomeRecord: deletedIncome ? true : false
      }
    });

  } catch (error) {
    console.error('Sale DELETE error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete sale record' } },
      { status: 500 }
    );
  }
}