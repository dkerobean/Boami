import { NextRequest, NextResponse } from 'next/server';
import * as yup from 'yup';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/database/connection';
import Invoice from '@/lib/database/models/Invoice';
import mongoose from 'mongoose';

// Validation schema for invoice updates
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

const updateInvoiceSchema = yup.object({
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
  
  vatRate: yup.number().min(0).max(100),
  discount: yup.number().min(0).default(0),
  discountType: yup.string().oneOf(['percentage', 'fixed']),
  
  status: yup.string().oneOf(['Draft', 'Pending', 'Sent', 'Paid', 'Overdue', 'Cancelled']),
  notes: yup.string().optional(),
  terms: yup.string().optional()
});

/**
 * GET /api/invoices/[id] - Get a specific invoice by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid invoice ID'
      }, { status: 400 });
    }

    // Find invoice and ensure it belongs to the current user
    const invoice = await Invoice.findOne({ 
      _id: id, 
      userId: (currentUser as any)?.id 
    }).lean();

    if (!invoice) {
      return NextResponse.json({
        success: false,
        message: 'Invoice not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: invoice
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json({ 
      success: false,
      message: 'Internal Server Error' 
    }, { status: 500 });
  }
}

/**
 * PUT /api/invoices/[id] - Update a specific invoice
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid invoice ID'
      }, { status: 400 });
    }

    const body = await req.json();
    const validatedData = await updateInvoiceSchema.validate(body);

    // Find and update invoice, ensuring it belongs to the current user
    const invoice = await Invoice.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { 
        ...validatedData,
        updatedBy: session.user.email
      },
      { new: true, runValidators: true }
    );

    if (!invoice) {
      return NextResponse.json({
        success: false,
        message: 'Invoice not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Invoice updated successfully',
      data: invoice
    }, { status: 200 });

  } catch (error) {
    console.error('Error updating invoice:', error);
    
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

/**
 * DELETE /api/invoices/[id] - Delete a specific invoice
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid invoice ID'
      }, { status: 400 });
    }

    // Find and delete invoice, ensuring it belongs to the current user
    const invoice = await Invoice.findOneAndDelete({ 
      _id: id, 
      userId: (currentUser as any)?.id 
    });

    if (!invoice) {
      return NextResponse.json({
        success: false,
        message: 'Invoice not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Invoice deleted successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json({ 
      success: false,
      message: 'Internal Server Error' 
    }, { status: 500 });
  }
}