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
    const client = createAdminSupabaseClient();
    
    // Fetch active announcements (not expired)
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
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching announcements:', error);
      return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
    }

    return NextResponse.json(announcements || []);
  } catch (error) {
    console.error('Error in announcements GET:', error);
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
    console.error('Error in announcements POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 