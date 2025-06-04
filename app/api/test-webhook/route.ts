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

    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { action, invoiceId, paymentIntentId } = body;

    console.log(`🧪 Test webhook action: ${action} for invoice: ${invoiceId || 'N/A'}`);

    switch (action) {
      case 'mark_paid': {
        if (!invoiceId) {
          return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 });
        }

        // Get invoice details
        const { data: invoice, error: invoiceError } = await client
          .from('invoices')
          .select(`
            id,
            user_id,
            estimate_id,
            final_price_cents,
            status,
            stripe_payment_intent_id,
            paid_at,
            estimates:estimate_id (
              title,
              description
            ),
            profiles:user_id (
              first_name,
              last_name,
              email
            )
          `)
          .eq('id', invoiceId)
          .single();

        if (invoiceError || !invoice) {
          return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        if (invoice.status === 'paid') {
          return NextResponse.json({ 
            message: 'Invoice already paid',
            invoice: {
              id: invoice.id,
              status: invoice.status,
              paid_at: invoice.paid_at
            }
          });
        }

        // Update invoice to paid
        const paidAt = new Date().toISOString();
        const { error: updateError } = await client
          .from('invoices')
          .update({
            status: 'paid',
            paid_at: paidAt,
          })
          .eq('id', invoiceId);

        if (updateError) {
          return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
        }

        // Create project if not exists
        const estimate = Array.isArray(invoice.estimates) ? invoice.estimates[0] : invoice.estimates;
        let project = null;

        const { data: existingProject } = await client
          .from('projects')
          .select('id')
          .eq('invoice_id', invoiceId)
          .single();

        if (!existingProject) {
          const { data: newProject, error: projectError } = await client
            .from('projects')
            .insert({
              invoice_id: invoiceId,
              user_id: invoice.user_id,
              title: estimate.title,
              description: estimate.description,
              status: 'pending',
              screenshots_urls: [],
            })
            .select('id')
            .single();

          if (!projectError) {
            project = newProject;
          }
        } else {
          project = existingProject;
        }

        // Record activity
        await client
          .from('recent_activity')
          .insert({
            user_id: invoice.user_id,
            activity_type: 'invoice_paid',
            activity_description: `paid invoice for "${estimate.title}" (manual test)`,
            metadata: { 
              invoice_id: invoiceId,
              estimate_id: invoice.estimate_id,
              amount: invoice.final_price_cents,
              payment_intent_id: invoice.stripe_payment_intent_id,
              project_id: project?.id,
              test_action: true
            }
          });

        return NextResponse.json({
          success: true,
          message: 'Invoice marked as paid successfully',
          invoice: {
            id: invoiceId,
            status: 'paid',
            paid_at: paidAt,
            amount: invoice.final_price_cents
          },
          project: project ? { id: project.id } : null
        });
      }

      case 'check_status': {
        if (!invoiceId) {
          return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 });
        }

        const { data: invoice, error: invoiceError } = await client
          .from('invoices')
          .select(`
            id,
            status,
            stripe_payment_intent_id,
            final_price_cents,
            paid_at,
            created_at,
            estimates:estimate_id (title)
          `)
          .eq('id', invoiceId)
          .single();

        if (invoiceError || !invoice) {
          return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        // Check Stripe payment intent if exists
        let stripeStatus = null;
        if (invoice.stripe_payment_intent_id) {
          try {
            const paymentIntent = await stripeService.retrievePaymentIntent(invoice.stripe_payment_intent_id);
            stripeStatus = paymentIntent.status;
          } catch (error) {
            stripeStatus = 'error';
          }
        }

        const estimate = Array.isArray(invoice.estimates) ? invoice.estimates[0] : invoice.estimates;

        return NextResponse.json({
          invoice: {
            id: invoice.id,
            status: invoice.status,
            amount: invoice.final_price_cents,
            paid_at: invoice.paid_at,
            created_at: invoice.created_at,
            stripe_payment_intent_id: invoice.stripe_payment_intent_id,
            estimate_title: estimate?.title
          },
          stripe_status: stripeStatus
        });
      }

      case 'list_recent': {
        const { data: invoices, error } = await client
          .from('invoices')
          .select(`
            id,
            status,
            stripe_payment_intent_id,
            final_price_cents,
            paid_at,
            created_at,
            estimates:estimate_id (title),
            profiles:user_id (first_name, last_name, email)
          `)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) {
          return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        return NextResponse.json({
          invoices: invoices.map(invoice => {
            const estimate = Array.isArray(invoice.estimates) ? invoice.estimates[0] : invoice.estimates;
            const profile = Array.isArray(invoice.profiles) ? invoice.profiles[0] : invoice.profiles;
            
            return {
              id: invoice.id,
              status: invoice.status,
              amount: invoice.final_price_cents,
              paid_at: invoice.paid_at,
              created_at: invoice.created_at,
              stripe_payment_intent_id: invoice.stripe_payment_intent_id,
              estimate_title: estimate?.title,
              customer_name: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown',
              customer_email: profile?.email
            };
          })
        });
      }

      case 'sync_payment_intent': {
        if (!invoiceId) {
          return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 });
        }

        const { data: invoice, error: invoiceError } = await client
          .from('invoices')
          .select('id, stripe_payment_intent_id, status')
          .eq('id', invoiceId)
          .single();

        if (invoiceError || !invoice) {
          return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        if (!invoice.stripe_payment_intent_id) {
          return NextResponse.json({ error: 'No payment intent associated with invoice' }, { status: 400 });
        }

        // Check Stripe payment intent status
        try {
          const paymentIntent = await stripeService.retrievePaymentIntent(invoice.stripe_payment_intent_id);
          
          if (paymentIntent.status === 'succeeded' && invoice.status === 'pending') {
            // Manually trigger the webhook logic
            return await this.POST(new NextRequest('http://localhost/api/test-webhook', {
              method: 'POST',
              body: JSON.stringify({ action: 'mark_paid', invoiceId })
            }));
          }

          return NextResponse.json({
            invoice_status: invoice.status,
            stripe_status: paymentIntent.status,
            message: paymentIntent.status === 'succeeded' ? 'Payment succeeded but not yet processed' : 'Payment not yet completed'
          });
        } catch (stripeError) {
          return NextResponse.json({ 
            error: 'Failed to check Stripe payment intent',
            details: stripeError instanceof Error ? stripeError.message : 'Unknown error'
          }, { status: 500 });
        }
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('💥 Test webhook error:', error);
    return NextResponse.json({ 
      error: 'Test webhook failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 