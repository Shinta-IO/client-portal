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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const estimateId = params.id;

    if (!estimateId) {
      return NextResponse.json({ error: 'Estimate ID is required' }, { status: 400 });
    }

    const client = createAdminSupabaseClient();

    // Check if user is admin
    const { data: profile } = await client
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    const isAdmin = profile?.is_admin || false;

    // Get the estimate
    let query = client
      .from('estimates')
      .select(`
        id,
        user_id,
        title,
        description,
        price_min_cents,
        price_max_cents,
        final_price_cents,
        tax_rate,
        timeline,
        status,
        finalized_at,
        approved_by_user,
        screenshots_urls,
        created_at,
        profiles:user_id (
          id,
          first_name,
          last_name,
          email,
          organization
        )
      `)
      .eq('id', estimateId);

    // If not admin, only allow access to own estimates
    if (!isAdmin) {
      query = query.eq('user_id', userId);
    }

    const { data: estimate, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
      }
      console.error('Error fetching estimate:', error);
      return NextResponse.json({ error: 'Failed to fetch estimate' }, { status: 500 });
    }

    return NextResponse.json(estimate);
  } catch (error) {
    console.error('Error in estimate GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const estimateId = params.id;
    const body = await request.json();

    if (!estimateId) {
      return NextResponse.json({ error: 'Estimate ID is required' }, { status: 400 });
    }

    const client = createAdminSupabaseClient();

    // Check if user is admin
    const { data: profile } = await client
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    const isAdmin = profile?.is_admin || false;

    // Get the current estimate to check permissions and current status
    const { data: currentEstimate } = await client
      .from('estimates')
      .select('user_id, status')
      .eq('id', estimateId)
      .single();

    if (!currentEstimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }

    // Check permissions: owner can edit draft estimates, admin can edit any
    const canEdit = isAdmin || (currentEstimate.user_id === userId && currentEstimate.status === 'draft');
    
    if (!canEdit) {
      return NextResponse.json({ 
        error: 'Unauthorized: You can only edit your own draft estimates' 
      }, { status: 403 });
    }

    const {
      title,
      description,
      price_min_cents,
      price_max_cents,
      final_price_cents,
      tax_rate,
      timeline,
      status,
      approved_by_user,
      screenshots_urls,
    } = body;

    // Validate title if provided
    if (title !== undefined && !title?.trim()) {
      return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
    }

    // Validate price range
    if (price_min_cents && price_max_cents && price_min_cents > price_max_cents) {
      return NextResponse.json({ error: 'Minimum price cannot be greater than maximum price' }, { status: 400 });
    }

    // Prepare update data
    const updateData: any = {};
    
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (price_min_cents !== undefined) updateData.price_min_cents = price_min_cents || null;
    if (price_max_cents !== undefined) updateData.price_max_cents = price_max_cents || null;
    if (timeline !== undefined) updateData.timeline = timeline?.trim() || null;
    if (screenshots_urls !== undefined) updateData.screenshots_urls = screenshots_urls || [];

    // Handle admin-only fields
    if (isAdmin) {
      if (final_price_cents !== undefined) updateData.final_price_cents = final_price_cents || null;
      if (tax_rate !== undefined) updateData.tax_rate = tax_rate || 0;
      if (status !== undefined) {
        updateData.status = status;
        if (status === 'finalized') {
          updateData.finalized_at = new Date().toISOString();
        }
      }
    }

    // Handle user approval (users can approve estimates)
    if (approved_by_user !== undefined && currentEstimate.user_id === userId) {
      updateData.approved_by_user = approved_by_user;
    }

    const { data: estimate, error } = await client
      .from('estimates')
      .update(updateData)
      .eq('id', estimateId)
      .select(`
        id,
        user_id,
        title,
        description,
        price_min_cents,
        price_max_cents,
        final_price_cents,
        tax_rate,
        timeline,
        status,
        finalized_at,
        approved_by_user,
        screenshots_urls,
        created_at,
        profiles:user_id (
          id,
          first_name,
          last_name,
          email,
          organization
        )
      `)
      .single();

    if (error) {
      console.error('Error updating estimate:', error);
      return NextResponse.json({ error: 'Failed to update estimate' }, { status: 500 });
    }

    // Record activity for status changes
    if (status && status !== currentEstimate.status) {
      try {
        let activityType = '';
        let activityDescription = '';

        switch (status) {
          case 'pending':
            activityType = 'estimate_requested';
            activityDescription = `Submitted estimate "${estimate.title}" for review`;
            break;
          case 'finalized':
            activityType = 'estimate_finalized';
            activityDescription = `Finalized estimate "${estimate.title}"`;
            break;
          case 'approved':
            activityType = 'estimate_approved';
            activityDescription = `Approved estimate "${estimate.title}"`;
            break;
        }

        if (activityType) {
          await client
            .from('recent_activity')
            .insert({
              user_id: estimate.user_id,
              activity_type: activityType,
              activity_description: activityDescription,
              metadata: { estimate_id: estimate.id }
            });
        }
      } catch (activityError) {
        console.error('Error recording activity:', activityError);
        // Don't fail the main operation for activity logging issues
      }
    }

    return NextResponse.json(estimate);
  } catch (error) {
    console.error('Error in estimate PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const estimateId = params.id;

    if (!estimateId) {
      return NextResponse.json({ error: 'Estimate ID is required' }, { status: 400 });
    }

    const client = createAdminSupabaseClient();

    // Check if user is admin (only admins can delete estimates)
    const { data: profile } = await client
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    const isAdmin = profile?.is_admin || false;

    if (!isAdmin) {
      return NextResponse.json({ 
        error: 'Unauthorized: Only administrators can delete estimates' 
      }, { status: 403 });
    }

    // Get estimate info before deletion for activity logging
    const { data: estimate } = await client
      .from('estimates')
      .select('title, user_id')
      .eq('id', estimateId)
      .single();

    const { error } = await client
      .from('estimates')
      .delete()
      .eq('id', estimateId);

    if (error) {
      console.error('Error deleting estimate:', error);
      return NextResponse.json({ error: 'Failed to delete estimate' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Estimate deleted successfully' });
  } catch (error) {
    console.error('Error in estimate DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 