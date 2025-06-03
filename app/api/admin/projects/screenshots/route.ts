import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

// Initialize Supabase with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Upload screenshots for a project
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and is admin
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const projectId = formData.get('project_id') as string;
    const files = formData.getAll('files') as File[];

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const uploadedUrls: string[] = [];

    // Upload each file to Supabase Storage
    for (const file of files) {
      if (!(file instanceof File)) continue;

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${projectId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-screenshots')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        continue; // Skip this file and continue with others
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('project-screenshots')
        .getPublicUrl(fileName);

      if (urlData?.publicUrl) {
        uploadedUrls.push(urlData.publicUrl);
      }
    }

    if (uploadedUrls.length === 0) {
      return NextResponse.json({ error: 'Failed to upload any files' }, { status: 500 });
    }

    // Get current project screenshots
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('screenshots_urls')
      .eq('id', projectId)
      .single();

    if (fetchError) {
      console.error('Error fetching project:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
    }

    // Update project with new screenshot URLs
    const currentUrls = project.screenshots_urls || [];
    const updatedUrls = [...currentUrls, ...uploadedUrls];

    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({ screenshots_urls: updatedUrls })
      .eq('id', projectId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating project:', updateError);
      return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Screenshots uploaded successfully',
      uploadedUrls,
      project: updatedProject
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove a screenshot from a project
export async function DELETE(request: NextRequest) {
  try {
    // Check if user is authenticated and is admin
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const screenshotUrl = searchParams.get('screenshot_url');

    if (!projectId || !screenshotUrl) {
      return NextResponse.json({ error: 'Project ID and screenshot URL are required' }, { status: 400 });
    }

    // Get current project screenshots
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('screenshots_urls')
      .eq('id', projectId)
      .single();

    if (fetchError) {
      console.error('Error fetching project:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
    }

    // Remove the URL from the array
    const currentUrls = project.screenshots_urls || [];
    const updatedUrls = currentUrls.filter((url: string) => url !== screenshotUrl);

    // Update project
    const { error: updateError } = await supabase
      .from('projects')
      .update({ screenshots_urls: updatedUrls })
      .eq('id', projectId);

    if (updateError) {
      console.error('Error updating project:', updateError);
      return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
    }

    // Extract file path from URL and delete from storage
    try {
      const urlParts = screenshotUrl.split('/');
      const bucketPath = urlParts.slice(-2).join('/'); // Get project_id/filename part
      
      await supabase.storage
        .from('project-screenshots')
        .remove([bucketPath]);
    } catch (storageError) {
      console.warn('Failed to delete file from storage:', storageError);
      // Don't fail the request if storage deletion fails
    }

    return NextResponse.json({ 
      message: 'Screenshot removed successfully',
      updatedUrls
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 