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

export async function POST(
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

    // Get the estimate to validate and process
    const { data: estimate, error: estimateError } = await client
      .from('estimates')
      .select(`
        id,
        user_id,
        title,
        description,
        final_price_cents,
        status,
        approved_by_user
      `)
      .eq('id', estimateId)
      .single();

    if (estimateError || !estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }

    // Verify the user owns this estimate
    if (estimate.user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized: You can only reject your own estimates' }, { status: 403 });
    }

    // Check if estimate is in correct status for rejection
    if (estimate.status !== 'finalized') {
      return NextResponse.json({ error: 'Only finalized estimates can be rejected' }, { status: 400 });
    }

    // Check if already approved (can't reject approved estimates)
    if (estimate.approved_by_user) {
      return NextResponse.json({ error: 'Cannot reject an already approved estimate' }, { status: 400 });
    }

    try {
      // Update estimate to rejected
      const { error: updateError } = await client
        .from('estimates')
        .update({ 
          status: 'rejected'
        })
        .eq('id', estimateId);

      if (updateError) {
        throw new Error('Failed to update estimate status');
      }

      // Record activity
      try {
        await client
          .from('recent_activity')
          .insert({
            user_id: estimate.user_id,
            activity_type: 'estimate_approved', // Using same type but different description
            activity_description: `rejected an estimate for "${estimate.title}"`,
            metadata: { estimate_id: estimateId }
          });
      } catch (activityError) {
        console.error('Error recording activity:', activityError);
        // Don't fail the main operation for activity logging issues
      }

      return NextResponse.json({
        message: 'Estimate rejected',
        estimate: {
          id: estimateId,
          approved_by_user: false,
          status: 'rejected'
        }
      });

    } catch (operationError) {
      console.error('Error in rejection process:', operationError);
      return NextResponse.json({ 
        error: 'Failed to process estimate rejection. Please try again.' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in estimate rejection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 