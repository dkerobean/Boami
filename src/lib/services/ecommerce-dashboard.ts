import { connectDB } from '@/lib/database/mongoose-connection';
import mongoose from 'mongoose';

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  revenueGrowth: number;
  ordersGrowth: number;
  productsGrowth: number;
  customersGrowth: number;
  averageOrderValue: number;
  pendingOrders: number;
  completedOrders: number;
  totalExpenses: number;
  netProfit: number;
  lowStockProducts: number;
}

export interface SalesData {
  date: string;
  revenue: number;
  orders: number;
}

export interface ProductPerformance {
  _id: string;
  title: string;
  category: string;
  price: number;
  stock: number;
  sales: number;
  revenue: number;
  image: string;
}

export interface RecentTransaction {
  _id: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  date: Date;
  products: string[];
}

export interface PaymentGatewayStats {
  gateway: string;
  percentage: number;
  amount: number;
  transactions: number;
}

/**
 * Ecommerce Dashboard Data Service
 * Fetches and processes data from MongoDB for dashboard display
 */
export class EcommerceDashboardService {

  /**
   * Get dashboard overview statistics
   */
  static async getDashboardStats(): Promise<DashboardStats> {
    try {
      await connectDB();
      const db = mongoose.connection.db;

      // Get current month data
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const lastMonth = new Date(currentMonth);
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      // Total Revenue from sales
      const totalRevenueResult = await db.collection('sales').aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]).toArray();
      const totalRevenue = totalRevenueResult[0]?.total || 0;

      // Revenue growth (current vs last month) from sales
      const currentMonthRevenue = await db.collection('sales').aggregate([
        { 
          $match: { 
            createdAt: { $gte: currentMonth },
            status: 'completed'
          } 
        },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]).toArray();

      const lastMonthRevenue = await db.collection('sales').aggregate([
        { 
          $match: {
            createdAt: {
              $gte: lastMonth,
              $lt: currentMonth
            },
            status: 'completed'
          }
        },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]).toArray();

      const currentRev = currentMonthRevenue[0]?.total || 0;
      const lastRev = lastMonthRevenue[0]?.total || 1;
      const revenueGrowth = ((currentRev - lastRev) / lastRev) * 100;

      // Total Products
      const totalProducts = await db.collection('products').countDocuments();

      // Products growth (new products this month vs last month)
      const currentMonthProducts = await db.collection('products').countDocuments({
        createdAt: { $gte: currentMonth }
      });

      const lastMonthProducts = await db.collection('products').countDocuments({
        createdAt: { $gte: lastMonth, $lt: currentMonth }
      });

      const productsGrowth = lastMonthProducts > 0
        ? ((currentMonthProducts - lastMonthProducts) / lastMonthProducts) * 100
        : currentMonthProducts > 0 ? 100 : 0;

      // Total Customers (users)
      const totalCustomers = await db.collection('users').countDocuments();

      // Customer growth
      const currentMonthCustomers = await db.collection('users').countDocuments({
        createdAt: { $gte: currentMonth }
      });

      const lastMonthCustomers = await db.collection('users').countDocuments({
        createdAt: { $gte: lastMonth, $lt: currentMonth }
      });

      const customersGrowth = lastMonthCustomers > 0
        ? ((currentMonthCustomers - lastMonthCustomers) / lastMonthCustomers) * 100
        : currentMonthCustomers > 0 ? 100 : 0;

      // Total Orders (using sales collection or financial transactions)
      const totalOrders = await db.collection('sales').countDocuments();

      // Orders growth
      const currentMonthOrders = await db.collection('sales').countDocuments({
        createdAt: { $gte: currentMonth }
      });

      const lastMonthOrders = await db.collection('sales').countDocuments({
        createdAt: { $gte: lastMonth, $lt: currentMonth }
      });

      const ordersGrowth = lastMonthOrders > 0
        ? ((currentMonthOrders - lastMonthOrders) / lastMonthOrders) * 100
        : currentMonthOrders > 0 ? 100 : 0;

      // Calculate additional metrics
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      
      // Order status counts
      const pendingOrders = await db.collection('sales').countDocuments({ status: 'pending' });
      const completedOrders = await db.collection('sales').countDocuments({ status: 'completed' });
      
      // Total expenses
      const totalExpensesResult = await db.collection('expenses').aggregate([
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).toArray();
      const totalExpenses = totalExpensesResult[0]?.total || 0;
      
      // Net profit (revenue - expenses)
      const netProfit = totalRevenue - totalExpenses;
      
      // Low stock products (stock <= lowStockThreshold or qty <= 5)
      const lowStockProducts = await db.collection('products').countDocuments({
        $or: [
          { qty: { $lte: 5 } },
          { $expr: { $lte: ['$qty', '$lowStockThreshold'] } }
        ]
      });

      return {
        totalRevenue,
        totalOrders,
        totalProducts,
        totalCustomers,
        revenueGrowth: Math.round(revenueGrowth * 100) / 100,
        ordersGrowth: Math.round(ordersGrowth * 100) / 100,
        productsGrowth: Math.round(productsGrowth * 100) / 100,
        customersGrowth: Math.round(customersGrowth * 100) / 100,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        pendingOrders,
        completedOrders,
        totalExpenses,
        netProfit: Math.round(netProfit * 100) / 100,
        lowStockProducts,
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Return default values on error
      return {
        totalRevenue: 0,
        totalOrders: 0,
        totalProducts: 0,
        totalCustomers: 0,
        revenueGrowth: 0,
        ordersGrowth: 0,
        productsGrowth: 0,
        customersGrowth: 0,
        averageOrderValue: 0,
        pendingOrders: 0,
        completedOrders: 0,
        totalExpenses: 0,
        netProfit: 0,
        lowStockProducts: 0,
      };
    }
  }

  /**
   * Get sales data for charts (last 30 days)
   */
  static async getSalesData(): Promise<SalesData[]> {
    try {
      await connectDB();
      const db = mongoose.connection.db;

      // Get last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const salesData = await db.collection('sales').aggregate([
        {
          $match: {
            createdAt: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt"
              }
            },
            revenue: { $sum: '$total' },
            orders: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        },
        {
          $project: {
            date: '$_id',
            revenue: 1,
            orders: 1,
            _id: 0
          }
        }
      ]).toArray();

      // Fill in missing dates with zero values for better chart display
      const filledData: SalesData[] = [];
      const currentDate = new Date(thirtyDaysAgo);
      const endDate = new Date();
      
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const existingData = salesData.find(d => d.date === dateStr);
        
        filledData.push({
          date: dateStr,
          revenue: existingData?.revenue || 0,
          orders: existingData?.orders || 0
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return filledData;
    } catch (error) {
      console.error('Error fetching sales data:', error);
      return [];
    }
  }

  /**
   * Get top performing products
   */
  static async getProductPerformance(): Promise<ProductPerformance[]> {
    try {
      await connectDB();
      const db = mongoose.connection.db;

      const products = await db.collection('products').aggregate([
        {
          $lookup: {
            from: 'sales',
            let: { productId: { $toString: '$_id' } },
            pipeline: [
              { $unwind: '$products' },
              { $match: { $expr: { $eq: ['$products.productId', '$$productId'] } } },
              {
                $group: {
                  _id: null,
                  totalQuantity: { $sum: '$products.quantity' },
                  totalRevenue: { $sum: '$products.total' },
                  orderCount: { $sum: 1 }
                }
              }
            ],
            as: 'salesData'
          }
        },
        {
          $addFields: {
            salesInfo: { $arrayElemAt: ['$salesData', 0] },
            sales: { $ifNull: [{ $arrayElemAt: ['$salesData.totalQuantity', 0] }, 0] },
            revenue: { $ifNull: [{ $arrayElemAt: ['$salesData.totalRevenue', 0] }, 0] },
            orderCount: { $ifNull: [{ $arrayElemAt: ['$salesData.orderCount', 0] }, 0] }
          }
        },
        {
          $project: {
            title: 1,
            category: { $arrayElemAt: ['$category', 0] },
            price: 1,
            qty: 1,
            photo: 1,
            sales: 1,
            revenue: 1,
            orderCount: 1,
            stock: '$qty'
          }
        },
        {
          $sort: { revenue: -1 }
        },
        {
          $limit: 10
        }
      ]).toArray();

      return products.map(product => ({
        _id: product._id.toString(),
        title: product.title,
        category: product.category || 'Uncategorized',
        price: product.price,
        stock: product.stock || 0,
        sales: product.sales || 0,
        revenue: product.revenue || 0,
        image: product.photo || '/images/products/default.jpg'
      }));
    } catch (error) {
      console.error('Error fetching product performance:', error);
      return [];
    }
  }

  /**
   * Get recent transactions
   */
  static async getRecentTransactions(): Promise<RecentTransaction[]> {
    try {
      await connectDB();
      const db = mongoose.connection.db;

      // Get recent sales as transactions
      const transactions = await db.collection('sales').aggregate([
        {
          $sort: { createdAt: -1 }
        },
        {
          $limit: 10
        },
        {
          $project: {
            customerName: 1,
            customerEmail: 1,
            amount: '$total',
            status: 1,
            date: '$createdAt',
            products: {
              $map: {
                input: '$products',
                as: 'product',
                in: '$$product.title'
              }
            },
            orderId: 1,
            paymentMethod: 1
          }
        }
      ]).toArray();

      return transactions.map(transaction => ({
        _id: transaction._id.toString(),
        customerName: transaction.customerName || 'Unknown Customer',
        customerEmail: transaction.customerEmail || 'unknown@example.com',
        amount: transaction.amount || 0,
        status: transaction.status || 'pending',
        date: transaction.date,
        products: transaction.products || []
      }));
    } catch (error) {
      console.error('Error fetching recent transactions:', error);
      return [];
    }
  }

  /**
   * Get payment gateway statistics
   */
  static async getPaymentGatewayStats(): Promise<PaymentGatewayStats[]> {
    try {
      await connectDB();
      const db = mongoose.connection.db;

      // Get payment method statistics from sales
      const paymentStats = await db.collection('sales').aggregate([
        {
          $match: { status: 'completed' }
        },
        {
          $group: {
            _id: '$paymentMethod',
            totalAmount: { $sum: '$total' },
            transactionCount: { $sum: 1 }
          }
        },
        {
          $sort: { totalAmount: -1 }
        }
      ]).toArray();

      // Calculate total revenue for percentage calculation
      const totalRevenue = paymentStats.reduce((sum, stat) => sum + stat.totalAmount, 0) || 1;

      return paymentStats.map(stat => ({
        gateway: stat._id || 'Unknown',
        percentage: Math.round((stat.totalAmount / totalRevenue) * 100 * 100) / 100,
        amount: stat.totalAmount,
        transactions: stat.transactionCount
      }));
    } catch (error) {
      console.error('Error fetching payment gateway stats:', error);
      return [];
    }
  }
}