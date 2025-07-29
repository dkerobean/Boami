import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Invoice item interface for individual line items
 */
export interface IInvoiceItem {
  productId?: string;
  itemName: string;
  sku?: string;
  description?: string;
  unitPrice: number;
  units: number;
  unitTotalPrice: number;
  image?: string;
}

/**
 * Invoice interface for invoice management system
 */
export interface IInvoice {
  invoiceNumber: string;

  // Billing details
  billFrom: string;
  billFromEmail: string;
  billFromAddress?: string;
  billFromPhone?: number;
  billFromFax?: number;

  billTo: string;
  billToEmail: string;
  billToAddress?: string;
  billToPhone?: number;
  billToFax?: number;

  // Invoice items
  orders: IInvoiceItem[];

  // Dates and financial details
  orderDate: Date;
  dueDate?: Date;
  totalCost: number;
  vat: number;
  vatRate: number;
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  grandTotal: number;

  // Status and metadata
  status: 'Draft' | 'Pending' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
  completed: boolean;
  notes?: string;
  terms?: string;

  // User and audit fields
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * Invoice document interface extending Mongoose Document
 */
export interface IInvoiceDocument extends IInvoice, Document {
  calculateSubtotal(): number;
  calculateVat(): number;
  calculateGrandTotal(): number;
  isOverdue(): boolean;
  markAsPaid(): Promise<void>;
  markAsOverdue(): Promise<void>;
  generateInvoiceNumber(): string;
}

/**
 * Invoice model interface with static methods
 */
export interface IInvoiceModel extends Model<IInvoiceDocument> {
  findByInvoiceNumber(invoiceNumber: string): Promise<IInvoiceDocument | null>;
  findByUser(userId: string): Promise<IInvoiceDocument[]>;
  findOverdueInvoices(): Promise<IInvoiceDocument[]>;
  findInvoicesByStatus(status: string): Promise<IInvoiceDocument[]>;
  findInvoicesInDateRange(startDate: Date, endDate: Date): Promise<IInvoiceDocument[]>;
  getNextInvoiceNumber(): Promise<string>;
}

/**
 * Invoice item schema
 */
const invoiceItemSchema = new Schema<IInvoiceItem>({
  productId: {
    type: String,
    ref: 'Product'
  },
  itemName: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true
  },
  sku: {
    type: String,
    trim: true,
    uppercase: true
  },
  description: {
    type: String,
    trim: true
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price must be positive']
  },
  units: {
    type: Number,
    required: [true, 'Units are required'],
    min: [0.01, 'Units must be positive']
  },
  unitTotalPrice: {
    type: Number,
    required: [true, 'Unit total price is required'],
    min: [0, 'Unit total price must be positive']
  },
  image: {
    type: String,
    trim: true
  }
}, { _id: false });

/**
 * Invoice schema definition with validation and middleware
 */
const invoiceSchema = new Schema<IInvoiceDocument, IInvoiceModel>({
  invoiceNumber: {
    type: String,
    unique: true,
    trim: true,
    uppercase: true,
    sparse: true // Allow multiple null values during creation
  },

  // Billing From details
  billFrom: {
    type: String,
    required: [true, 'Bill from name is required'],
    trim: true
  },
  billFromEmail: {
    type: String,
    required: [true, 'Bill from email is required'],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  billFromAddress: {
    type: String,
    trim: true
  },
  billFromPhone: {
    type: Number
  },
  billFromFax: {
    type: Number
  },

  // Billing To details
  billTo: {
    type: String,
    required: [true, 'Bill to name is required'],
    trim: true
  },
  billToEmail: {
    type: String,
    required: [true, 'Bill to email is required'],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  billToAddress: {
    type: String,
    trim: true
  },
  billToPhone: {
    type: Number
  },
  billToFax: {
    type: Number
  },

  // Invoice items
  orders: {
    type: [invoiceItemSchema],
    required: [true, 'At least one order item is required'],
    validate: {
      validator: function(orders: IInvoiceItem[]) {
        return orders && orders.length > 0;
      },
      message: 'Invoice must contain at least one item'
    }
  },

  // Dates
  orderDate: {
    type: Date,
    required: [true, 'Order date is required'],
    default: Date.now
  },
  dueDate: {
    type: Date,
    validate: {
      validator: function(dueDate: Date) {
        if (!dueDate) return true; // Optional field
        return dueDate > this.orderDate;
      },
      message: 'Due date must be after order date'
    }
  },

  // Financial details
  totalCost: {
    type: Number,
    required: [true, 'Total cost is required'],
    min: [0, 'Total cost must be positive']
  },
  vat: {
    type: Number,
    min: [0, 'VAT must be positive'],
    default: 0
  },
  vatRate: {
    type: Number,
    required: [true, 'VAT rate is required'],
    min: [0, 'VAT rate must be positive'],
    max: [100, 'VAT rate cannot exceed 100%'],
    default: 10
  },
  discount: {
    type: Number,
    min: [0, 'Discount cannot be negative'],
    default: 0
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    default: 'percentage'
  },
  grandTotal: {
    type: Number,
    required: [true, 'Grand total is required'],
    min: [0, 'Grand total must be positive']
  },

  // Status and metadata
  status: {
    type: String,
    enum: ['Draft', 'Pending', 'Sent', 'Paid', 'Overdue', 'Cancelled'],
    default: 'Draft'
  },
  completed: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    trim: true
  },
  terms: {
    type: String,
    trim: true
  },

  // User and audit fields
  userId: {
    type: String,
    required: [true, 'User ID is required']
  },
  createdBy: {
    type: String,
    trim: true
  },
  updatedBy: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete (ret as any).__v;
      return ret;
    }
  }
});

// Indexes for better query performance
invoiceSchema.index({ userId: 1, status: 1 });
// invoiceNumber unique index is handled by the schema field definition
invoiceSchema.index({ orderDate: -1 });
invoiceSchema.index({ dueDate: 1, status: 1 });
invoiceSchema.index({ status: 1, createdAt: -1 });
invoiceSchema.index({ billToEmail: 1 });

/**
 * Pre-save middleware to calculate totals and generate invoice number
 */
invoiceSchema.pre('save', async function(next) {
  // Generate invoice number if not provided
  if (!this.invoiceNumber) {
    this.invoiceNumber = await (this.constructor as IInvoiceModel).getNextInvoiceNumber();
  }

  // Calculate totals
  this.totalCost = this.calculateSubtotal();
  this.vat = this.calculateVat();
  this.grandTotal = this.calculateGrandTotal();

  // Check if invoice is overdue
  if (this.dueDate && this.dueDate < new Date() && this.status === 'Sent') {
    this.status = 'Overdue';
  }

  next();
});

/**
 * Instance method to calculate subtotal
 */
invoiceSchema.methods.calculateSubtotal = function(): number {
  return this.orders.reduce((total: number, item: IInvoiceItem) => {
    return total + item.unitTotalPrice;
  }, 0);
};

/**
 * Instance method to calculate VAT amount
 */
invoiceSchema.methods.calculateVat = function(): number {
  const subtotal = this.calculateSubtotal();
  let discountAmount = 0;

  if (this.discount > 0) {
    if (this.discountType === 'percentage') {
      discountAmount = subtotal * (this.discount / 100);
    } else {
      discountAmount = this.discount;
    }
  }

  const discountedSubtotal = subtotal - discountAmount;
  return discountedSubtotal * (this.vatRate / 100);
};

/**
 * Instance method to calculate grand total
 */
invoiceSchema.methods.calculateGrandTotal = function(): number {
  const subtotal = this.calculateSubtotal();
  const vat = this.calculateVat();
  let discountAmount = 0;

  if (this.discount > 0) {
    if (this.discountType === 'percentage') {
      discountAmount = subtotal * (this.discount / 100);
    } else {
      discountAmount = this.discount;
    }
  }

  return subtotal + vat - discountAmount;
};

/**
 * Instance method to check if invoice is overdue
 */
invoiceSchema.methods.isOverdue = function(): boolean {
  return this.dueDate ? this.dueDate < new Date() && this.status !== 'Paid' : false;
};

/**
 * Instance method to mark invoice as paid
 */
invoiceSchema.methods.markAsPaid = async function(): Promise<void> {
  this.status = 'Paid';
  this.completed = true;
  await this.save();
};

/**
 * Instance method to mark invoice as overdue
 */
invoiceSchema.methods.markAsOverdue = async function(): Promise<void> {
  if (this.isOverdue()) {
    this.status = 'Overdue';
    await this.save();
  }
};

/**
 * Instance method to generate invoice number
 */
invoiceSchema.methods.generateInvoiceNumber = function(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `INV-${year}${month}-${random}`;
};

/**
 * Static method to find invoice by invoice number
 */
invoiceSchema.statics.findByInvoiceNumber = function(invoiceNumber: string) {
  return this.findOne({ invoiceNumber: invoiceNumber.toUpperCase() });
};

/**
 * Static method to find invoices by user
 */
invoiceSchema.statics.findByUser = function(userId: string) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

/**
 * Static method to find overdue invoices
 */
invoiceSchema.statics.findOverdueInvoices = function() {
  const now = new Date();
  return this.find({
    dueDate: { $lt: now },
    status: { $nin: ['Paid', 'Cancelled'] }
  }).sort({ dueDate: 1 });
};

/**
 * Static method to find invoices by status
 */
invoiceSchema.statics.findInvoicesByStatus = function(status: string) {
  return this.find({ status }).sort({ createdAt: -1 });
};

/**
 * Static method to find invoices in date range
 */
invoiceSchema.statics.findInvoicesInDateRange = function(startDate: Date, endDate: Date) {
  return this.find({
    orderDate: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ orderDate: -1 });
};

/**
 * Static method to get next invoice number
 */
invoiceSchema.statics.getNextInvoiceNumber = async function(): Promise<string> {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const prefix = `INV-${year}${month}`;

  // Find the latest invoice number for this month
  const latestInvoice = await this.findOne({
    invoiceNumber: { $regex: `^${prefix}` }
  }).sort({ invoiceNumber: -1 });

  let nextNumber = 1;
  if (latestInvoice) {
    const lastNumber = parseInt(latestInvoice.invoiceNumber.split('-')[2]);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}-${nextNumber.toString().padStart(3, '0')}`;
};

// Prevent model re-compilation during development
const Invoice = (mongoose.models.Invoice ||
  mongoose.model<IInvoiceDocument, IInvoiceModel>('Invoice', invoiceSchema)) as IInvoiceModel;

export default Invoice;
export { Invoice };