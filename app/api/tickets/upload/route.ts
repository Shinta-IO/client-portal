import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase admin client (bypasses RLS)
const createAdminSupabaseClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
};

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll('attachments') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const client = createAdminSupabaseClient();
    const uploadedUrls: string[] = [];

    // Upload each file to Supabase Storage
    for (const file of files) {
      if (!(file instanceof File)) continue;

      // Validate file type (images only for screenshots)
      if (!file.type.startsWith('image/')) {
        continue; // Skip non-image files
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        continue; // Skip files over 10MB
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Convert File to ArrayBuffer
      const fileBuffer = await file.arrayBuffer();

      // Upload to Supabase Storage
      const { data, error } = await client.storage
        .from('ticket-attachments')
        .upload(fileName, fileBuffer, {
          contentType: file.type,
          upsert: false
        });

      if (error) {
        console.error('Error uploading file:', error);
        continue; // Skip this file and continue with others
      }

      // Get public URL
      const { data: publicUrlData } = client.storage
        .from('ticket-attachments')
        .getPublicUrl(fileName);

      if (publicUrlData?.publicUrl) {
        uploadedUrls.push(publicUrlData.publicUrl);
      }
    }

    if (uploadedUrls.length === 0) {
      return NextResponse.json({ error: 'Failed to upload any files' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Files uploaded successfully',
      uploadedUrls,
      uploadedCount: uploadedUrls.length
    });

  } catch (error) {
    console.error('Error in ticket upload:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileUrl = searchParams.get('fileUrl');

    if (!fileUrl) {
      return NextResponse.json({ error: 'File URL is required' }, { status: 400 });
    }

    const client = createAdminSupabaseClient();

    // Extract file path from URL
    const urlParts = fileUrl.split('/');
    const bucketPath = urlParts.slice(-2).join('/'); // Get userId/filename part

    // Delete from storage
    const { error } = await client.storage
      .from('ticket-attachments')
      .remove([bucketPath]);

    if (error) {
      console.error('Error deleting file:', error);
      return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
    }

    return NextResponse.json({ message: 'File deleted successfully' });

  } catch (error) {
    console.error('Error deleting ticket attachment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 