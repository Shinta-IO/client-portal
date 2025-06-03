import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for admin operations
function createServiceSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Check if user is admin
async function isUserAdmin(userId: string): Promise<boolean> {
  const supabase = createServiceSupabaseClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();

  return profile?.is_admin === true;
}

// GET - Admin can view all messages
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Access denied. Admin privileges required.' }, { status: 403 });
    }

    const supabase = createServiceSupabaseClient();

    // Admin can see all messages with user profile information
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id (
          id,
          first_name,
          last_name,
          email,
          is_admin
        ),
        recipient:recipient_id (
          id,
          first_name,
          last_name,
          email,
          is_admin
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching admin messages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error in GET /api/admin/messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 