import mongoose from 'mongoose';
import { connectDB } from './mongoose-connection';
import User, { IUserDocument } from './user-schema';
import Product, { IProductDocument } from './product-schema';

/**
 * Database transaction examples
 * Use transactions for operations that modify multiple collections
 */

/**
 * Example: Create user and initial product in a transaction
 * Ensures both operations succeed or both fail
 * 
 * @param userData - User data to create
 * @param productData - Product data to create
 * @returns Promise<{user: IUserDocument, product: IProductDocument}> - Created documents
 * @throws {Error} When transaction fails
 */
export async function createUserWithProduct(
  userData: Partial<IUserDocument>,
  productData: Partial<IProductDocument>
): Promise<{ user: IUserDocument; product: IProductDocument }> {
  await connectDB();
  
  // Start a session for the transaction
  const session = await mongoose.startSession();
  
  try {
    // Start transaction
    session.startTransaction();
    
    // Create user within transaction
    const userArray = await User.create([userData], { session });
    const user = userArray[0];
    
    // Create product with user as creator
    const productWithCreator = {
      ...productData,
      createdBy: user._id
    };
    const productArray = await Product.create([productWithCreator], { session });
    const product = productArray[0];
    
    // Commit transaction
    await session.commitTransaction();
    
    console.log('✅ User and product created successfully in transaction');
    return { user, product };
    
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    console.error('❌ Transaction failed, rolling back:', error);
    throw error;
  } finally {
    // Clean up session
    await session.endSession();
  }
}

/**
 * Example: Update product stock and create order in transaction
 * Ensures inventory is properly decremented when order is created
 * 
 * @param productId - Product ID to update
 * @param variantSku - Variant SKU to update stock for
 * @param quantity - Quantity to reduce from stock
 * @param orderData - Order data to create
 * @returns Promise<{product: IProductDocument, order: any}> - Updated product and created order
 */
export async function createOrderWithStockUpdate(
  productId: string,
  variantSku: string,
  quantity: number,
  orderData: any
): Promise<{ product: IProductDocument; order: any }> {
  await connectDB();
  
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    // Find and update product stock atomically
    const product = await Product.findOneAndUpdate(
      {
        _id: productId,
        'variants.sku': variantSku,
        'variants.stock': { $gte: quantity } // Ensure sufficient stock
      },
      {
        $inc: { 'variants.$.stock': -quantity }
      },
      {
        new: true,
        session
      }
    );
    
    if (!product) {
      throw new Error('Product not found or insufficient stock');
    }
    
    // Recalculate total stock
    product.totalStock = product.calculateTotalStock();
    await product.save({ session });
    
    // Create order (assuming you have an Order model)
    // const orderArray = await Order.create([orderData], { session });
    // const order = orderArray[0];
    
    // For this example, we'll simulate order creation
    const order = { ...orderData, id: new mongoose.Types.ObjectId() };
    
    await session.commitTransaction();
    
    console.log('✅ Order created and stock updated successfully');
    return { product, order };
    
  } catch (error) {
    await session.abortTransaction();
    console.error('❌ Order transaction failed:', error);
    throw error;
  } finally {
    await session.endSession();
  }
}

/**
 * Example: Bulk update operation with transaction
 * Updates multiple documents while maintaining data consistency
 * 
 * @param updates - Array of update operations
 * @returns Promise<number> - Number of documents updated
 */
export async function bulkUpdateProducts(
  updates: Array<{
    productId: string;
    updateData: Partial<IProductDocument>;
  }>
): Promise<number> {
  await connectDB();
  
  const session = await mongoose.startSession();
  let updatedCount = 0;
  
  try {
    session.startTransaction();
    
    // Process updates in batches for better performance
    const batchSize = 100;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      const bulkOps = batch.map(({ productId, updateData }) => ({
        updateOne: {
          filter: { _id: productId },
          update: { $set: updateData },
          upsert: false
        }
      }));
      
      const result = await Product.bulkWrite(bulkOps, { session });
      updatedCount += result.modifiedCount;
    }
    
    await session.commitTransaction();
    
    console.log(`✅ Bulk update completed: ${updatedCount} products updated`);
    return updatedCount;
    
  } catch (error) {
    await session.abortTransaction();
    console.error('❌ Bulk update transaction failed:', error);
    throw error;
  } finally {
    await session.endSession();
  }
}

/**
 * Example: Complex aggregation with transaction
 * Performs complex data analysis while ensuring consistency
 * 
 * @param startDate - Start date for analysis
 * @param endDate - End date for analysis
 * @returns Promise<any> - Aggregation results
 */
export async function generateSalesReport(
  startDate: Date,
  endDate: Date
): Promise<any> {
  await connectDB();
  
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    // Complex aggregation pipeline
    const salesData = await Product.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          isActive: true
        }
      },
      {
        $unwind: '$variants'
      },
      {
        $group: {
          _id: '$category',
          totalProducts: { $sum: 1 },
          totalRevenue: {
            $sum: { $multiply: ['$variants.price', '$variants.stock'] }
          },
          averagePrice: { $avg: '$variants.price' },
          topBrand: { $first: '$brand' }
        }
      },
      {
        $sort: { totalRevenue: -1 }
      }
    ]).session(session);
    
    // You could also update some analytics collection here
    // await Analytics.create([{ reportDate: new Date(), data: salesData }], { session });
    
    await session.commitTransaction();
    
    console.log('✅ Sales report generated successfully');
    return salesData;
    
  } catch (error) {
    await session.abortTransaction();
    console.error('❌ Sales report transaction failed:', error);
    throw error;
  } finally {
    await session.endSession();
  }
}

/**
 * Utility function to retry transactions with exponential backoff
 * Useful for handling temporary connection issues or write conflicts
 * 
 * @param operation - Async function to execute in transaction
 * @param maxRetries - Maximum number of retry attempts
 * @returns Promise<T> - Result of the operation
 */
export async function retryTransaction<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Check if error is retryable (e.g., write conflict, transient network error)
      if (attempt === maxRetries || !isRetryableError(error as Error)) {
        throw error;
      }
      
      // Exponential backoff: wait 2^attempt * 100ms
      const delay = Math.pow(2, attempt) * 100;
      console.log(`⚠️ Transaction attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Determines if an error is retryable
 * @param error - Error to check
 * @returns boolean - Whether the error is retryable
 */
function isRetryableError(error: Error): boolean {
  const retryableErrors = [
    'WriteConflict',
    'TransientTransactionError',
    'NetworkTimeout',
    'HostUnreachable'
  ];
  
  return retryableErrors.some(errorType => 
    error.message.includes(errorType) || error.name.includes(errorType)
  );
}