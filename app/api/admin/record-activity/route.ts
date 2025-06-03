import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { activityService } from '@/services/activity/recent-activity';

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and is admin
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = user.publicMetadata?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { activity_type, project_id, project_title } = body;

    if (!activity_type || !project_id || !project_title) {
      return NextResponse.json({
        error: 'Missing required fields',
        required: ['activity_type', 'project_id', 'project_title']
      }, { status: 400 });
    }

    const userName = `${user.firstName || 'Admin'} ${user.lastName || 'User'}`;
    let success = false;

    switch (activity_type) {
      case 'project_created':
        success = await activityService.recordProjectCreated(
          user.id,
          project_id,
          project_title,
          userName,
          user.imageUrl
        );
        break;
      case 'project_completed':
        success = await activityService.recordProjectCompleted(
          user.id,
          project_id,
          project_title,
          userName,
          user.imageUrl
        );
        break;
      default:
        return NextResponse.json({
          error: 'Unsupported activity type',
          supported: ['project_created', 'project_completed']
        }, { status: 400 });
    }

    if (success) {
      return NextResponse.json({
        success: true,
        message: `Activity recorded: ${activity_type}`,
        data: {
          user_id: user.id,
          activity_type,
          project_id,
          project_title,
          user_name: userName
        }
      });
    } else {
      return NextResponse.json({
        error: 'Failed to record activity',
        details: 'Activity service returned false'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Record activity error:', error);
    return NextResponse.json({
      error: 'Failed to record activity',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 