import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createAdminSupabaseClient } from '@/utils/supabase-admin';

// GET - Fetch email preferences for the current user
export async function GET() {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminSupabaseClient();

    // Try to get existing profile with email preferences
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('email_project_updates, email_estimate_notifications, email_invoice_reminders, email_marketing, email_system_notifications')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching email preferences:', error);
      return NextResponse.json({ error: 'Failed to fetch email preferences' }, { status: 500 });
    }

    // Return email preferences with default values if null
    return NextResponse.json({
      projectUpdates: profile.email_project_updates ?? true,
      estimateNotifications: profile.email_estimate_notifications ?? true,
      invoiceReminders: profile.email_invoice_reminders ?? true,
      marketingEmails: profile.email_marketing ?? false,
      systemNotifications: profile.email_system_notifications ?? true,
    });
  } catch (error) {
    console.error('Error in email preferences API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update email preferences for the current user
export async function PUT(request: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      projectUpdates, 
      estimateNotifications, 
      invoiceReminders, 
      marketingEmails, 
      systemNotifications 
    } = body;

    const supabase = createAdminSupabaseClient();

    const { data: profile, error } = await supabase
      .from('profiles')
      .update({
        email_project_updates: projectUpdates,
        email_estimate_notifications: estimateNotifications,
        email_invoice_reminders: invoiceReminders,
        email_marketing: marketingEmails,
        email_system_notifications: systemNotifications,
      })
      .eq('id', user.id)
      .select('email_project_updates, email_estimate_notifications, email_invoice_reminders, email_marketing, email_system_notifications')
      .single();

    if (error) {
      console.error('Error updating email preferences:', error);
      return NextResponse.json({ error: 'Failed to update email preferences' }, { status: 500 });
    }

    return NextResponse.json({
      projectUpdates: profile.email_project_updates,
      estimateNotifications: profile.email_estimate_notifications,
      invoiceReminders: profile.email_invoice_reminders,
      marketingEmails: profile.email_marketing,
      systemNotifications: profile.email_system_notifications,
    });
  } catch (error) {
    console.error('Error updating email preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 