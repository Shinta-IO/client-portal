import { NextRequest, NextResponse } from 'next/server';
import { activityService } from '@/services/activity/recent-activity';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const activities = await activityService.getActivityFeed(limit, offset);

    return NextResponse.json(activities);
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity feed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      user_id, 
      activity_type, 
      project_id, 
      project_title, 
      user_name, 
      user_avatar 
    } = body;

    let success = false;

    switch (activity_type) {
      case 'project_created':
        success = await activityService.recordProjectCreated(
          user_id,
          project_id,
          project_title,
          user_name,
          user_avatar
        );
        break;
      case 'project_completed':
        success = await activityService.recordProjectCompleted(
          user_id,
          project_id,
          project_title,
          user_name,
          user_avatar
        );
        break;
      default:
        return NextResponse.json(
          { error: 'Unsupported activity type' },
          { status: 400 }
        );
    }

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Failed to record activity' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error recording activity:', error);
    return NextResponse.json(
      { error: 'Failed to record activity' },
      { status: 500 }
    );
  }
} 