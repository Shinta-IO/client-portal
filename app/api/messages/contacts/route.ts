import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering for this route
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Use service role for admin operations
function createServiceSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET - Fetch admin contacts for messaging
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceSupabaseClient();

    // Get all admin users as potential contacts
    const { data: admins, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('is_admin', true)
      .order('first_name');

    if (error) {
      console.error('Error fetching admin contacts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch contacts' },
        { status: 500 }
      );
    }

    // Format for frontend
    const contacts = admins.map(admin => ({
      id: admin.id,
      name: `${admin.first_name} ${admin.last_name}`,
      email: admin.email,
      type: 'admin',
      online: true // We'll assume admins are always available
    }));

    return NextResponse.json(contacts);
  } catch (error) {
    console.error('Error in GET /api/messages/contacts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 