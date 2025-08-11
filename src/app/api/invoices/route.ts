import { NextRequest, NextResponse } from 'next/server';
import * as yup from 'yup';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/database/connection';
import Invoice, { IInvoice } from '@/lib/database/models/Invoice';

// Validation schema for invoice creation/update
const invoiceItemSchema = yup.object({
  productId: yup.string().optional(),
  itemName: yup.string().required('Item name is required'),
  sku: yup.string().optional(),
  description: yup.string().optional(),
  unitPrice: yup.number().min(0, 'Unit price must be positive').required('Unit price is required'),
  units: yup.number().min(0.01, 'Units must be positive').required('Units are required'),
  unitTotalPrice: yup.number().min(0, 'Unit total price must be positive').required('Unit total price is required'),
  image: yup.string().optional()
});

const invoiceSchema = yup.object({
  // invoiceNumber is auto-generated, so exclude from validation
  billFrom: yup.string().required('Bill from name is required'),
  billFromEmail: yup.string().email('Invalid email format').required('Bill from email is required'),
  billFromAddress: yup.string().optional(),
  billFromPhone: yup.number().optional(),
  billFromFax: yup.number().optional(),
  
  billTo: yup.string().required('Bill to name is required'),
  billToEmail: yup.string().email('Invalid email format').required('Bill to email is required'),
  billToAddress: yup.string().optional(),
  billToPhone: yup.number().optional(),
  billToFax: yup.number().optional(),
  
  orders: yup.array().of(invoiceItemSchema).min(1, 'At least one item is required'),
  
  orderDate: yup.date().required('Order date is required'),
  dueDate: yup.date().optional(),
  
  // Financial fields that will be calculated by schema middleware
  totalCost: yup.number().min(0).required('Total cost is required'),
  vat: yup.number().min(0).default(0),
  vatRate: yup.number().min(0).max(100).default(10),
  discount: yup.number().min(0).default(0),
  discountType: yup.string().oneOf(['percentage', 'fixed']).default('percentage'),
  grandTotal: yup.number().min(0).required('Grand total is required'),
  
  status: yup.string().oneOf(['Draft', 'Pending', 'Sent', 'Paid', 'Overdue', 'Cancelled']).default('Draft'),
  completed: yup.boolean().default(false),
  notes: yup.string().optional(),
  terms: yup.string().optional()
});

/**
 * GET /api/invoices - Get all invoices for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        success: false,
        message: 'Unauthorized' 
      }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build query
    let query: any = { userId: session.user.id };
    
    if (status && status !== 'all') {
      query.status = status;
    }

    // Get invoices with pagination
    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Invoice.countDocuments(query)
    ]);

    return NextResponse.json({
      success: true,
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ 
      success: false,
      message: 'Internal Server Error' 
    }, { status: 500 });
  }
}

/**
 * POST /api/invoices - Create a new invoice
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        success: false,
        message: 'Unauthorized' 
      }, { status: 401 });
    }

    await connectToDatabase();

    const body = await req.json();
    const validatedData = await invoiceSchema.validate(body);

    // Create invoice with user data  
    const invoiceData = {
      ...validatedData,
      userId: session.user.id,
      createdBy: session.user.email
    };

    const invoice = new Invoice(invoiceData);
    await invoice.save();

    return NextResponse.json({
      success: true,
      message: 'Invoice created successfully',
      data: invoice
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating invoice:', error);
    
    if (error instanceof yup.ValidationError) {
      return NextResponse.json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({ 
      success: false,
      message: 'Internal Server Error' 
    }, { status: 500 });
  }
}