import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createAdminSupabaseClient } from '@/utils/supabase-admin';

// GET - Fetch tasks for user's own projects only
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client but filter by user_id for security
    const supabase = createAdminSupabaseClient();

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    // First, get the user's projects to ensure they can only see their own tasks
    const { data: userProjects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', user.id);

    if (projectsError) {
      console.error('Error fetching user projects:', projectsError);
      return NextResponse.json({ error: 'Failed to fetch user projects' }, { status: 500 });
    }

    if (!userProjects || userProjects.length === 0) {
      return NextResponse.json([]); // User has no projects, return empty array
    }

    const userProjectIds = userProjects.map(p => p.id);

    // Build the tasks query
    let query = supabase
      .from('tasks')
      .select('*')
      .in('project_id', userProjectIds)
      .order('created_at', { ascending: true });

    // If project_id is specified, filter by it (but only if user owns the project)
    if (projectId) {
      if (userProjectIds.includes(projectId)) {
        query = query.eq('project_id', projectId);
      } else {
        // User doesn't own this project, return unauthorized
        return NextResponse.json({ error: 'Access denied to this project' }, { status: 403 });
      }
    }

    const { data: tasks, error } = await query;

    if (error) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }

    return NextResponse.json(tasks || []);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST, PUT, DELETE are blocked for regular users
// These operations should be done through admin API only
export async function POST() {
  return NextResponse.json({ 
    error: 'Task creation is restricted to administrators' 
  }, { status: 403 });
}

export async function PUT() {
  return NextResponse.json({ 
    error: 'Task updates are restricted to administrators' 
  }, { status: 403 });
}

export async function DELETE() {
  return NextResponse.json({ 
    error: 'Task deletion is restricted to administrators' 
  }, { status: 403 });
} 