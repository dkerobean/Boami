import { connectDB } from '../mongoose-connection';
import mongoose from 'mongoose';

export interface SeedDashboardDataOptions {
  userId: string;
  userEmail: string;
}

/**
 * Seed sample dashboard data for a specific user
 * Creates sample products, sales, and expenses for testing dashboard functionality
 */
export async function seedDashboardData(options: SeedDashboardDataOptions) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    
    if (!db) {
      throw new Error('Database connection not established');
    }
    
    console.log(`🌱 Seeding dashboard data for user: ${options.userEmail}`);

    // Sample products
    const sampleProducts = [
      {
        _id: new mongoose.Types.ObjectId(),
        title: 'Wireless Headphones',
        description: 'High-quality wireless headphones with noise cancellation',
        price: 199.99,
        qty: 50,
        category: ['Electronics'],
        status: 'publish',
        featured: true,
        userId: options.userId,
        photo: '/images/products/headphones.jpg',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: new mongoose.Types.ObjectId(),
        title: 'Smart Phone Case',
        description: 'Protective case for smartphones with card slots',
        price: 29.99,
        qty: 100,
        category: ['Accessories'],
        status: 'publish',
        featured: false,
        userId: options.userId,
        photo: '/images/products/phone-case.jpg',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: new mongoose.Types.ObjectId(),
        title: 'Bluetooth Speaker',
        description: 'Portable Bluetooth speaker with excellent sound quality',
        price: 79.99,
        qty: 25,
        category: ['Electronics'],
        status: 'publish',
        featured: true,
        userId: options.userId,
        photo: '/images/products/speaker.jpg',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Insert products
    await db.collection('products').insertMany(sampleProducts);
    console.log(`✅ Inserted ${sampleProducts.length} sample products`);

    // Sample sales (recent and historical for growth calculations)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const sampleSales = [
      // Current month sales
      {
        _id: new mongoose.Types.ObjectId(),
        productId: sampleProducts[0]._id.toString(),
        quantity: 2,
        unitPrice: 199.99,
        totalAmount: 399.98,
        date: new Date(currentMonth.getTime() + (5 * 24 * 60 * 60 * 1000)),
        userId: options.userId,
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        status: 'completed',
        paymentMethod: 'credit_card',
        createdAt: new Date(currentMonth.getTime() + (5 * 24 * 60 * 60 * 1000)),
        updatedAt: new Date()
      },
      {
        _id: new mongoose.Types.ObjectId(),
        productId: sampleProducts[1]._id.toString(),
        quantity: 5,
        unitPrice: 29.99,
        totalAmount: 149.95,
        date: new Date(currentMonth.getTime() + (10 * 24 * 60 * 60 * 1000)),
        userId: options.userId,
        customerName: 'Jane Smith',
        customerEmail: 'jane@example.com',
        status: 'completed',
        paymentMethod: 'paypal',
        createdAt: new Date(currentMonth.getTime() + (10 * 24 * 60 * 60 * 1000)),
        updatedAt: new Date()
      },
      {
        _id: new mongoose.Types.ObjectId(),
        productId: sampleProducts[2]._id.toString(),
        quantity: 1,
        unitPrice: 79.99,
        totalAmount: 79.99,
        date: new Date(currentMonth.getTime() + (15 * 24 * 60 * 60 * 1000)),
        userId: options.userId,
        customerName: 'Bob Wilson',
        customerEmail: 'bob@example.com',
        status: 'completed',
        paymentMethod: 'bank_transfer',
        createdAt: new Date(currentMonth.getTime() + (15 * 24 * 60 * 60 * 1000)),
        updatedAt: new Date()
      },
      // Last month sales (for growth comparison)
      {
        _id: new mongoose.Types.ObjectId(),
        productId: sampleProducts[0]._id.toString(),
        quantity: 1,
        unitPrice: 199.99,
        totalAmount: 199.99,
        date: new Date(lastMonth.getTime() + (10 * 24 * 60 * 60 * 1000)),
        userId: options.userId,
        customerName: 'Alice Johnson',
        customerEmail: 'alice@example.com',
        status: 'completed',
        paymentMethod: 'credit_card',
        createdAt: new Date(lastMonth.getTime() + (10 * 24 * 60 * 60 * 1000)),
        updatedAt: new Date()
      },
      // Pending sale
      {
        _id: new mongoose.Types.ObjectId(),
        productId: sampleProducts[1]._id.toString(),
        quantity: 3,
        unitPrice: 29.99,
        totalAmount: 89.97,
        date: now,
        userId: options.userId,
        customerName: 'Mike Brown',
        customerEmail: 'mike@example.com',
        status: 'pending',
        paymentMethod: 'credit_card',
        createdAt: now,
        updatedAt: now
      }
    ];

    // Insert sales
    await db.collection('sales').insertMany(sampleSales);
    console.log(`✅ Inserted ${sampleSales.length} sample sales`);

    // Sample expenses
    const sampleExpenses = [
      {
        _id: new mongoose.Types.ObjectId(),
        description: 'Office Supplies',
        amount: 150.00,
        date: new Date(currentMonth.getTime() + (3 * 24 * 60 * 60 * 1000)),
        userId: options.userId,
        categoryId: 'office_supplies',
        createdAt: new Date(currentMonth.getTime() + (3 * 24 * 60 * 60 * 1000)),
        updatedAt: new Date()
      },
      {
        _id: new mongoose.Types.ObjectId(),
        description: 'Marketing Campaign',
        amount: 500.00,
        date: new Date(currentMonth.getTime() + (7 * 24 * 60 * 60 * 1000)),
        userId: options.userId,
        categoryId: 'marketing',
        createdAt: new Date(currentMonth.getTime() + (7 * 24 * 60 * 60 * 1000)),
        updatedAt: new Date()
      },
      {
        _id: new mongoose.Types.ObjectId(),
        description: 'Website Hosting',
        amount: 29.99,
        date: new Date(lastMonth.getTime() + (15 * 24 * 60 * 60 * 1000)),
        userId: options.userId,
        categoryId: 'technology',
        createdAt: new Date(lastMonth.getTime() + (15 * 24 * 60 * 60 * 1000)),
        updatedAt: new Date()
      }
    ];

    // Insert expenses
    await db.collection('expenses').insertMany(sampleExpenses);
    console.log(`✅ Inserted ${sampleExpenses.length} sample expenses`);

    console.log('🎉 Dashboard data seeding completed successfully!');
    
    return {
      success: true,
      data: {
        products: sampleProducts.length,
        sales: sampleSales.length,
        expenses: sampleExpenses.length
      }
    };

  } catch (error) {
    console.error('❌ Error seeding dashboard data:', error);
    throw error;
  }
}

/**
 * Clear existing dashboard data for a user (useful for re-seeding)
 */
export async function clearUserDashboardData(userId: string) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    
    if (!db) {
      throw new Error('Database connection not established');
    }

    console.log(`🧹 Clearing dashboard data for user: ${userId}`);

    const collections = ['products', 'sales', 'expenses'];
    
    for (const collectionName of collections) {
      const result = await db.collection(collectionName).deleteMany({ userId });
      console.log(`✅ Cleared ${result.deletedCount} documents from ${collectionName}`);
    }

    console.log('🎉 Dashboard data cleared successfully!');
    
  } catch (error) {
    console.error('❌ Error clearing dashboard data:', error);
    throw error;
  }
}