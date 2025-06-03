import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';
import { stripeService } from '../../../services/stripe/stripe-service';

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

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = createAdminSupabaseClient();

    // Check if user is admin
    const { data: profile } = await client
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    const isAdmin = profile?.is_admin || false;
    
    console.log(`🔄 Starting invoice status sync for user: ${userId} (admin: ${isAdmin})`);

    // Get pending invoices with payment intents
    // If admin: get all invoices, if user: get only their invoices
    const invoiceQuery = client
      .from('invoices')
      .select(`
        id,
        user_id,
        estimate_id,
        status,
        stripe_payment_intent_id,
        final_price_cents,
        estimates:estimate_id (
          title,
          description
        )
      `)
      .eq('status', 'pending')
      .not('stripe_payment_intent_id', 'is', null);

    // If not admin, only get user's own invoices
    if (!isAdmin) {
      invoiceQuery.eq('user_id', userId);
    }

    const { data: invoices, error } = await invoiceQuery;

    if (error) {
      console.error('❌ Error fetching invoices:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    console.log(`📋 Found ${invoices.length} pending invoices with payment intents ${isAdmin ? '(all users)' : '(your invoices)'}`);

    const syncResults = [];

    for (const invoice of invoices) {
      try {
        console.log(`🔍 Checking payment intent: ${invoice.stripe_payment_intent_id}`);
        
        // Check Stripe payment intent status
        const paymentIntent = await stripeService.retrievePaymentIntent(invoice.stripe_payment_intent_id);
        
        console.log(`💰 Payment intent ${paymentIntent.id} status: ${paymentIntent.status}`);

        if (paymentIntent.status === 'succeeded') {
          console.log(`✅ Payment succeeded, updating invoice ${invoice.id} to paid`);
          
          // Update invoice status to paid
          const { error: updateError } = await client
            .from('invoices')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString(),
            })
            .eq('id', invoice.id);

          if (updateError) {
            console.error(`❌ Error updating invoice ${invoice.id}:`, updateError);
            syncResults.push({
              invoiceId: invoice.id,
              status: 'error',
              error: updateError.message
            });
            continue;
          }

          // Create project automatically
          const estimate = Array.isArray(invoice.estimates) ? invoice.estimates[0] : invoice.estimates;
          
          const { data: project, error: projectError } = await client
            .from('projects')
            .insert({
              invoice_id: invoice.id,
              user_id: invoice.user_id,
              title: estimate.title,
              description: estimate.description,
              status: 'pending',
              screenshots_urls: [],
            })
            .select('id')
            .single();

          if (projectError) {
            console.error(`⚠️ Error creating project for invoice ${invoice.id}:`, projectError);
          } else {
            console.log(`🚀 Project created: ${project.id}`);
          }

          // Record activity
          try {
            await client
              .from('recent_activity')
              .insert({
                user_id: invoice.user_id,
                activity_type: 'invoice_paid',
                activity_description: `paid invoice for "${estimate.title}" (synced)`,
                metadata: { 
                  invoice_id: invoice.id,
                  estimate_id: invoice.estimate_id,
                  amount: invoice.final_price_cents,
                  payment_intent_id: paymentIntent.id,
                  project_id: project?.id,
                  sync_source: isAdmin ? 'admin_sync' : 'user_sync'
                }
              });
          } catch (activityError) {
            console.error('⚠️ Error recording activity:', activityError);
          }

          syncResults.push({
            invoiceId: invoice.id,
            paymentIntentId: paymentIntent.id,
            status: 'synced',
            amount: invoice.final_price_cents,
            projectCreated: !!project
          });

        } else {
          console.log(`ℹ️ Payment intent ${paymentIntent.id} status: ${paymentIntent.status} - no action needed`);
          syncResults.push({
            invoiceId: invoice.id,
            paymentIntentId: paymentIntent.id,
            status: 'no_action',
            paymentIntentStatus: paymentIntent.status
          });
        }

      } catch (stripeError) {
        console.error(`❌ Error checking payment intent for invoice ${invoice.id}:`, stripeError);
        syncResults.push({
          invoiceId: invoice.id,
          status: 'stripe_error',
          error: stripeError instanceof Error ? stripeError.message : 'Unknown Stripe error'
        });
      }
    }

    const syncedCount = syncResults.filter(r => r.status === 'synced').length;
    const errorCount = syncResults.filter(r => r.status === 'error' || r.status === 'stripe_error').length;

    console.log(`🎉 Sync complete: ${syncedCount} synced, ${errorCount} errors`);

    return NextResponse.json({
      message: `Invoice status sync completed ${isAdmin ? '(admin)' : '(user)'}`,
      userType: isAdmin ? 'admin' : 'user',
      totalInvoices: invoices.length,
      synced: syncedCount,
      errors: errorCount,
      results: syncResults
    });

  } catch (error) {
    console.error('💥 Sync error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 