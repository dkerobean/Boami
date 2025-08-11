
import { NextRequest, NextResponse } from 'next/server';
import * as yup from 'yup';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth.config';
import User from '@/lib/database/models/User';
import { connectToDatabase } from '@/lib/database/connection';

const userUpdateSchema = yup.object({
  firstName: yup.string().max(50, 'First name cannot exceed 50 characters'),
  lastName: yup.string().max(50, 'Last name cannot exceed 50 characters'),
  designation: yup.string().max(100, 'Designation cannot exceed 100 characters'),
  phone: yup.string().nullable().transform((value) => value || null).test('phone-length', 'Please enter a valid phone number', function(value) {
    if (!value) return true; // Allow empty
    return value.length >= 10 && value.length <= 15; // Basic length validation
  }),
  company: yup.string().max(100, 'Company name cannot exceed 100 characters')
});

/**
 * GET /api/user - Get current user data
 */
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    
    // Get current user from NextAuth session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ 
        success: false,
        message: 'Unauthorized' 
      }, { status: 401 });
    }

    const user = await User.findOne({ email: session.user.email }).select('-password');

    if (!user) {
      return NextResponse.json({ 
        success: false,
        message: 'User not found' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: user
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json({ 
      success: false,
      message: 'Internal Server Error' 
    }, { status: 500 });
  }
}

/**
 * PUT /api/user - Update current user profile
 */
export async function PUT(req: NextRequest) {
  try {
    await connectToDatabase();
    
    // Get current user from NextAuth session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ 
        success: false,
        message: 'Unauthorized' 
      }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = await userUpdateSchema.validate(body);

    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      {
        ...validatedData,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return NextResponse.json({ 
        success: false,
        message: 'User not found' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    }, { status: 200 });

  } catch (error) {
    console.error('Error updating user profile:', error);
    
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
