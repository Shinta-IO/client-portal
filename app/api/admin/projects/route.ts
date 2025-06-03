import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createAdminSupabaseClient } from '@/utils/supabase-admin';
import { emailService } from '@/services/email/sendgrid';
import { activityService } from '@/services/activity/recent-activity';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin = user.publicMetadata?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Use admin client (service role) to bypass RLS
    const supabase = createAdminSupabaseClient();
    
    // Quick check to ensure admin client is working
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json({ 
        error: 'Server configuration error', 
        details: 'Missing Supabase credentials' 
      }, { status: 500 });
    }

    // Check if a specific project ID is requested
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('id');

    if (projectId) {
      // Fetch specific project by ID
      const { data: project, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) {
        console.error('Error fetching project:', error);
        return NextResponse.json({ 
          error: 'Failed to fetch project', 
          details: error 
        }, { status: 500 });
      }

      return NextResponse.json([project]); // Return as array to match existing client expectations
    } else {
      // Fetch all projects for admin view
      const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching projects:', error);
        return NextResponse.json({ 
          error: 'Failed to fetch projects', 
          details: error 
        }, { status: 500 });
      }

      return NextResponse.json(projects || []);
    }

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin = user.publicMetadata?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    
    // Use admin client (service role) to bypass RLS
    const supabase = createAdminSupabaseClient();

    // Insert project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert([body])
      .select()
      .single();

    if (projectError) {
      console.error('Project creation error:', projectError);
      return NextResponse.json({ 
        error: 'Failed to create project', 
        details: projectError 
      }, { status: 500 });
    }

    // Get user profile for the assigned user
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name, email, avatar_url')
      .eq('id', project.user_id)
      .single();

    if (!profileError && userProfile) {
      const userName = `${userProfile.first_name} ${userProfile.last_name}`;
      
      // Send email notification (async, don't wait)
      emailService.sendProjectCreatedEmail(
        userProfile.email,
        userName,
        project.title,
        project.description,
        project.deadline
      ).catch(error => console.error('Email sending failed:', error));

      // Record activity (async, don't wait)
      activityService.recordProjectCreated(
        project.user_id,
        project.id,
        project.title,
        userName,
        userProfile.avatar_url
      ).catch(error => console.error('Activity recording failed:', error));
    }

    return NextResponse.json({ project });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin = user.publicMetadata?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    console.log('PATCH request body:', body);
    
    const { id, ...updateData } = body;
    console.log('Project ID:', id);
    console.log('Update data:', updateData);
    
    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Use admin client (service role) to bypass RLS
    const supabase = createAdminSupabaseClient();

    // Quick check to ensure admin client is working
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json({ 
        error: 'Server configuration error', 
        details: 'Missing Supabase credentials' 
      }, { status: 500 });
    }

    // Validate and clean update data
    const validFields = ['title', 'description', 'status', 'deadline', 'live_preview_url', 'repo_url'];
    const cleanedUpdateData: any = {};
    
    for (const [key, value] of Object.entries(updateData)) {
      if (validFields.includes(key)) {
        // Handle empty strings for optional fields
        if (value === '') {
          cleanedUpdateData[key] = null;
        } else {
          cleanedUpdateData[key] = value;
        }
      }
    }
    
    console.log('Cleaned update data:', cleanedUpdateData);

    // Get current project state (without requiring profiles join)
    const { data: currentProject, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching current project:', fetchError);
      return NextResponse.json({ 
        error: 'Failed to fetch project', 
        details: fetchError 
      }, { status: 500 });
    }

    // Update project
    const { data: project, error: updateError } = await supabase
      .from('projects')
      .update(cleanedUpdateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Project update error:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update project', 
        details: updateError 
      }, { status: 500 });
    }

    // If status changed to completed, send completion email and record activity
    if (cleanedUpdateData.status === 'completed' && currentProject.status !== 'completed') {
      // Get user profile for notifications
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, avatar_url')
        .eq('id', project.user_id)
        .single();

      if (userProfile) {
        const userName = `${userProfile.first_name} ${userProfile.last_name}`;
        
        // Send completion email (async, don't wait)
        try {
          emailService.sendProjectCompletedEmail(
            userProfile.email,
            userName,
            project.title,
            project.description
          ).catch(error => console.error('Completion email sending failed:', error));
        } catch (emailError) {
          console.error('Email service error:', emailError);
        }

        // Send review request email after a delay (async, don't wait)
        try {
          // Send review request email after 24 hours
          setTimeout(() => {
            emailService.sendReviewRequestEmail(
              userProfile.email,
              userName,
              project.title
            ).catch(error => console.error('Review request email sending failed:', error));
          }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds
        } catch (emailError) {
          console.error('Review request email service error:', emailError);
        }

        // Record completion activity (async, don't wait)
        try {
          activityService.recordProjectCompleted(
            project.user_id,
            project.id,
            project.title,
            userName,
            userProfile.avatar_url
          ).catch(error => console.error('Completion activity recording failed:', error));
        } catch (activityError) {
          console.error('Activity service error:', activityError);
        }
      }
    }

    return NextResponse.json({ project });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 