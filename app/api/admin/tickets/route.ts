import { NextRequest, NextResponse } from 'next/server';
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

// GET - Admin can view all tickets
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

    // Admin can see all tickets with user profile information
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select(`
        *,
        profiles:user_id (
          id,
          first_name,
          last_name,
          email,
          organization
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tickets:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tickets' },
        { status: 500 }
      );
    }

    return NextResponse.json(tickets);
  } catch (error) {
    console.error('Error in GET /api/admin/tickets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Admin can respond to tickets
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Access denied. Admin privileges required.' }, { status: 403 });
    }

    const body = await request.json();
    const { ticketId, response } = body;

    if (!ticketId || !response) {
      return NextResponse.json(
        { error: 'Ticket ID and response are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceSupabaseClient();

    // Update ticket with admin response
    const { data: ticket, error } = await supabase
      .from('tickets')
      .update({
        response,
        response_at: new Date().toISOString(),
        status: 'resolved',
        admin_id: userId
      })
      .eq('id', ticketId)
      .select()
      .single();

    if (error) {
      console.error('Error updating ticket:', error);
      return NextResponse.json(
        { error: 'Failed to update ticket' },
        { status: 500 }
      );
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error('Error in PUT /api/admin/tickets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 