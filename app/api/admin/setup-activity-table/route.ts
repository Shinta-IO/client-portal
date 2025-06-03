import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createAdminSupabaseClient } from '@/utils/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and is admin
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = user.publicMetadata?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const supabase = createAdminSupabaseClient();

    // SQL to create the recent_activity table with proper RLS policies
    const createTableSQL = `
      -- Create recent_activity table for the community activity feed
      CREATE TABLE IF NOT EXISTS recent_activity (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        activity_type TEXT NOT NULL CHECK (activity_type IN (
          'project_created', 
          'project_completed', 
          'estimate_requested', 
          'estimate_finalized', 
          'estimate_approved', 
          'invoice_created', 
          'invoice_paid'
        )),
        activity_description TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_recent_activity_user_id ON recent_activity(user_id);
      CREATE INDEX IF NOT EXISTS idx_recent_activity_type ON recent_activity(activity_type);
      CREATE INDEX IF NOT EXISTS idx_recent_activity_created_at ON recent_activity(created_at DESC);

      -- Enable RLS (Row Level Security)
      ALTER TABLE recent_activity ENABLE ROW LEVEL SECURITY;

      -- Drop existing policies to avoid conflicts
      DROP POLICY IF EXISTS "Anyone can view all activity" ON recent_activity;
      DROP POLICY IF EXISTS "Block user modifications" ON recent_activity;
      DROP POLICY IF EXISTS "Block user updates" ON recent_activity;
      DROP POLICY IF EXISTS "Block user deletes" ON recent_activity;

      -- Create RLS policies
      -- This is the ONLY table where all users can see all data (like a public feed)
      CREATE POLICY "Anyone can view all activity" ON recent_activity
        FOR SELECT TO authenticated 
        USING (true);

      -- Only allow service role to insert/update/delete activity records
      -- (Regular users cannot create their own activity records directly)
      CREATE POLICY "Block user modifications" ON recent_activity
        FOR INSERT TO authenticated 
        WITH CHECK (false);

      CREATE POLICY "Block user updates" ON recent_activity
        FOR UPDATE TO authenticated 
        USING (false);

      CREATE POLICY "Block user deletes" ON recent_activity
        FOR DELETE TO authenticated 
        USING (false);
    `;

    console.log('Creating recent_activity table...');
    const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });

    if (createError) {
      console.error('Error creating table:', createError);
      // Try alternative approach - use direct SQL execution
      try {
        // Create table using raw SQL
        const { error: tableError } = await supabase
          .from('recent_activity')
          .select('id')
          .limit(1);

        if (tableError && tableError.message.includes('relation "recent_activity" does not exist')) {
          return NextResponse.json({
            error: 'Failed to create table',
            details: 'Table does not exist and could not be created. Please run the SQL script manually.',
            sql: createTableSQL
          }, { status: 500 });
        }
      } catch (testError) {
        console.error('Table test error:', testError);
      }
    }

    // Test if table is accessible
    const { data: testData, error: testError } = await supabase
      .from('recent_activity')
      .select('count(*)', { count: 'exact' })
      .limit(1);

    if (testError) {
      console.error('Table access test failed:', testError);
      return NextResponse.json({
        error: 'Table setup verification failed',
        details: testError
      }, { status: 500 });
    }

    // Try to insert a test record
    const testActivityData = {
      user_id: user.id,
      activity_type: 'project_created',
      activity_description: 'Test activity to verify table setup',
      metadata: {
        project_id: 'test',
        project_title: 'Test Project',
        user_name: `${user.firstName} ${user.lastName}`,
        user_avatar: user.imageUrl
      }
    };

    const { data: insertedActivity, error: insertError } = await supabase
      .from('recent_activity')
      .insert(testActivityData)
      .select()
      .single();

    if (insertError) {
      console.error('Test insert failed:', insertError);
      return NextResponse.json({
        error: 'Test insert failed',
        details: insertError,
        note: 'Table exists but insert permissions may be incorrect'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Activity table setup completed successfully',
      testActivity: insertedActivity,
      tableExists: true
    });

  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({
      error: 'Setup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 