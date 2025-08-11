import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/connection';
import User from '@/lib/database/models/User';

/**
 * POST /api/admin/migrate-images - Migrate profile images from local paths
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Find all users with local profile image paths
    const usersWithLocalImages = await User.find({
      $or: [
        { profileImage: { $regex: '^/uploads/' } },
        { avatar: { $regex: '^/uploads/' } }
      ]
    });

    console.log(`📊 Found ${usersWithLocalImages.length} users with local image paths`);

    if (usersWithLocalImages.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No migration needed - all users already have valid image paths',
        data: { migratedCount: 0 }
      });
    }

    // Update users to remove local paths (they'll fallback to default image)
    const updateResult = await User.updateMany(
      {
        $or: [
          { profileImage: { $regex: '^/uploads/' } },
          { avatar: { $regex: '^/uploads/' } }
        ]
      },
      {
        $unset: {
          profileImage: "",
          avatar: ""
        }
      }
    );

    return NextResponse.json({
      success: true,
      message: `Migration complete: Updated ${updateResult.modifiedCount} users`,
      data: { 
        migratedCount: updateResult.modifiedCount,
        usersFound: usersWithLocalImages.length
      }
    });

  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to migrate profile images'
    }, { status: 500 });
  }
}