import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { emailService } from '@/services/email/sendgrid';

// Create Supabase client for user operations (with RLS)
const createUserSupabaseClient = (userId: string) => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      db: {
        schema: 'public',
      },
    }
  );
};

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

    // Check if user is admin
    const adminClient = createAdminSupabaseClient();
    const { data: profile } = await adminClient
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    const isAdmin = profile?.is_admin || false;
    
    // Use admin client to get all data without RLS restrictions
    const client = createAdminSupabaseClient();
    
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
      .order('created_at', { ascending: false });

    // If not admin, only show user's own estimates
    if (!isAdmin) {
      query = query.eq('user_id', userId);
    }

    const { data: estimates, error } = await query;

    if (error) {
      console.error('Error fetching estimates:', error);
      return NextResponse.json({ error: 'Failed to fetch estimates' }, { status: 500 });
    }

    return NextResponse.json(estimates || []);
  } catch (error) {
    console.error('Error in estimates GET:', error);
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
    const {
      title,
      description,
      price_min_cents,
      price_max_cents,
      final_price_cents,
      tax_rate,
      timeline,
      screenshots_urls = [],
      user_id, // This is the selected user ID when admin creates estimate
      status,
    } = body;

    // Validate required fields
    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const client = createAdminSupabaseClient();
    
    // Check if current user is admin
    const { data: profile } = await client
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    const isAdmin = profile?.is_admin || false;

    // Determine who the estimate is for
    let estimateUserId: string;
    
    if (isAdmin && user_id) {
      // Admin creating estimate for selected user
      estimateUserId = user_id;
    } else {
      // Regular user creating their own estimate
      estimateUserId = userId;
    }

    let estimateData: any = {
      user_id: estimateUserId, // Set this immediately and clearly
      title: title.trim(),
      description: description?.trim() || null,
      timeline: timeline?.trim() || null,
      screenshots_urls: screenshots_urls || [],
      approved_by_user: false,
    };

    if (isAdmin && user_id) {
      // Admin creating finalized estimate for another user
      if (!final_price_cents) {
        return NextResponse.json({ error: 'Final price is required for admin estimates' }, { status: 400 });
      }
      
      estimateData.final_price_cents = final_price_cents;
      estimateData.tax_rate = tax_rate || 0;
      estimateData.status = 'finalized';
      estimateData.finalized_at = new Date().toISOString();
    } else {
      // User creating estimate request
      estimateData.status = status || 'pending';
      
      if (price_min_cents) estimateData.price_min_cents = price_min_cents;
      if (price_max_cents) estimateData.price_max_cents = price_max_cents;
      
      // Validate price range for user requests
      if (price_min_cents && price_max_cents && price_min_cents > price_max_cents) {
        return NextResponse.json({ error: 'Minimum price cannot be greater than maximum price' }, { status: 400 });
      }
    }

    const { data: estimate, error } = await client
      .from('estimates')
      .insert(estimateData)
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
      console.error('Error creating estimate:', error);
      return NextResponse.json({ error: 'Failed to create estimate' }, { status: 500 });
    }

    // Record activity
    try {
      let activityType = '';
      let activityDescription = '';

      if (isAdmin && user_id) {
        // Get admin's profile (the person creating the estimate)
        const { data: adminProfile } = await client
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', userId)
          .single();

        // Get the selected user's profile (who the estimate is for)
        const { data: selectedUserProfile } = await client
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('id', estimateUserId)
          .single();

        const userName = selectedUserProfile ? 
          `${selectedUserProfile.first_name} ${selectedUserProfile.last_name}` : 
          'User';
        const adminName = adminProfile ? 
          `${adminProfile.first_name} ${adminProfile.last_name}` : 
          'Admin';

        activityType = 'estimate_finalized';
        activityDescription = `was sent an estimate by ${adminName} for "${title.trim()}"`;
        
        console.log('Activity description:', activityDescription);

        // Send estimate creation email (async, don't wait)
        if (selectedUserProfile?.email) {
          try {
            emailService.sendEstimateCreatedEmail(
              selectedUserProfile.email,
              userName,
              title.trim(),
              description?.trim() || '',
              final_price_cents || 0,
              `${process.env.NEXT_PUBLIC_APP_URL}/estimates`
            ).catch(error => console.error('Estimate creation email sending failed:', error));
          } catch (emailError) {
            console.error('Estimate creation email service error:', emailError);
          }
        }
      } else {
        activityType = 'estimate_requested';
        activityDescription = `Requested estimate for "${title.trim()}"`;
      }

      await client
        .from('recent_activity')
        .insert({
          user_id: estimateUserId, // Activity goes to the user the estimate is for
          activity_type: activityType,
          activity_description: activityDescription,
          metadata: { estimate_id: estimate.id }
        });
    } catch (activityError) {
      console.error('Error recording activity:', activityError);
      // Don't fail the main operation for activity logging issues
    }

    return NextResponse.json(estimate, { status: 201 });
  } catch (error) {
    console.error('Error in estimates POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 