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

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = createAdminSupabaseClient();
    
    // Check if current user is admin
    const { data: profile } = await client
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    const isAdmin = profile?.is_admin || false;

    if (!isAdmin) {
      return NextResponse.json({ error: 'Access denied - admin only' }, { status: 403 });
    }
    
    // Fetch all announcements for admin (including expired ones)
    const { data: announcements, error } = await client
      .from('announcements')
      .select(`
        id,
        title,
        content,
        image_url,
        expires_at,
        created_at,
        profiles:admin_id (
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching announcements:', error);
      return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
    }

    return NextResponse.json(announcements || []);
  } catch (error) {
    console.error('Error in admin announcements GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, image_url, expires_at } = body;

    // Validate required fields
    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const client = createAdminSupabaseClient();
    
    // Check if current user is admin
    const { data: profile } = await client
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    const isAdmin = profile?.is_admin || false;

    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins can create announcements' }, { status: 403 });
    }

    const announcementData = {
      admin_id: userId,
      title: title.trim(),
      content: content.trim(),
      image_url: image_url || null,
      expires_at: expires_at || null,
    };

    const { data: announcement, error } = await client
      .from('announcements')
      .insert(announcementData)
      .select(`
        id,
        title,
        content,
        image_url,
        expires_at,
        created_at,
        profiles:admin_id (
          first_name,
          last_name
        )
      `)
      .single();

    if (error) {
      console.error('Error creating announcement:', error);
      return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 });
    }

    return NextResponse.json(announcement, { status: 201 });
  } catch (error) {
    console.error('Error in admin announcements POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, title, content, image_url, expires_at } = body;

    // Validate required fields
    if (!id || !title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: 'ID, title, and content are required' }, { status: 400 });
    }

    const client = createAdminSupabaseClient();
    
    // Check if current user is admin
    const { data: profile } = await client
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    const isAdmin = profile?.is_admin || false;

    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins can update announcements' }, { status: 403 });
    }

    const updateData = {
      title: title.trim(),
      content: content.trim(),
      image_url: image_url || null,
      expires_at: expires_at || null,
    };

    const { data: announcement, error } = await client
      .from('announcements')
      .update(updateData)
      .eq('id', id)
      .select(`
        id,
        title,
        content,
        image_url,
        expires_at,
        created_at,
        profiles:admin_id (
          first_name,
          last_name
        )
      `)
      .single();

    if (error) {
      console.error('Error updating announcement:', error);
      return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 });
    }

    return NextResponse.json(announcement);
  } catch (error) {
    console.error('Error in admin announcements PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Announcement ID is required' }, { status: 400 });
    }

    const client = createAdminSupabaseClient();
    
    // Check if current user is admin
    const { data: profile } = await client
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    const isAdmin = profile?.is_admin || false;

    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins can delete announcements' }, { status: 403 });
    }

    // Get the announcement to check if it has an image
    const { data: announcement } = await client
      .from('announcements')
      .select('image_url')
      .eq('id', id)
      .single();

    // Delete the announcement
    const { error } = await client
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting announcement:', error);
      return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 });
    }

    // Delete associated image if it exists
    if (announcement?.image_url) {
      try {
        const urlParts = announcement.image_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `announcement-images/${fileName}`;
        
        await client.storage
          .from('announcements')
          .remove([filePath]);
      } catch (storageError) {
        console.warn('Failed to delete announcement image from storage:', storageError);
        // Don't fail the request if image deletion fails
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in admin announcements DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 