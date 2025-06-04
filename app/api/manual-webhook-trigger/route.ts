import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';
import { stripeService } from '../../../services/stripe/stripe-service';
import { emailService } from '@/services/email/sendgrid';

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

    // Check if user is admin
    const client = createAdminSupabaseClient();
    const { data: profile } = await client
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { invoice_id, payment_intent_id } = body;

    console.log('🔄 Manual webhook trigger started by admin:', userId);
    console.log('📋 Processing invoice:', invoice_id);
    console.log('💳 Payment intent:', payment_intent_id);

    let invoice;

    // Find invoice either by ID or payment intent ID
    if (invoice_id) {
      const { data, error } = await client
        .from('invoices')
        .select(`
          id,
          user_id,
          estimate_id,
          final_price_cents,
          status,
          stripe_payment_intent_id,
          paid_at,
          created_at,
          estimates:estimate_id (
            title,
            description,
            user_id
          ),
          profiles:user_id (
            first_name,
            last_name,
            email
          )
        `)
        .eq('id', invoice_id)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }
      invoice = data;
    } else if (payment_intent_id) {
      const { data, error } = await client
        .from('invoices')
        .select(`
          id,
          user_id,
          estimate_id,
          final_price_cents,
          status,
          stripe_payment_intent_id,
          paid_at,
          created_at,
          estimates:estimate_id (
            title,
            description,
            user_id
          ),
          profiles:user_id (
            first_name,
            last_name,
            email
          )
        `)
        .eq('stripe_payment_intent_id', payment_intent_id)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'Invoice not found by payment intent' }, { status: 404 });
      }
      invoice = data;
    } else {
      return NextResponse.json({ error: 'invoice_id or payment_intent_id required' }, { status: 400 });
    }

    console.log('📋 Found invoice:', {
      id: invoice.id,
      status: invoice.status,
      amount: invoice.final_price_cents,
      user_id: invoice.user_id
    });

    // Check if already paid
    if (invoice.status === 'paid' && invoice.paid_at) {
      console.log('ℹ️ Invoice already marked as paid:', invoice.id);
      return NextResponse.json({ 
        message: 'Invoice already paid',
        invoice_id: invoice.id,
        paid_at: invoice.paid_at 
      });
    }

    // Verify payment intent in Stripe if available
    let stripeVerification = null;
    if (invoice.stripe_payment_intent_id) {
      try {
        const paymentIntent = await stripeService.retrievePaymentIntent(invoice.stripe_payment_intent_id);
        stripeVerification = {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          created: paymentIntent.created
        };
        console.log('✅ Stripe verification:', stripeVerification);
      } catch (error) {
        console.warn('⚠️ Could not verify payment intent in Stripe:', error);
      }
    }

    // Update invoice status to paid (same logic as webhook)
    console.log('🔄 Updating invoice status to paid...');
    const paidAt = new Date().toISOString();
    const { error: updateError, data: updatedInvoice } = await client
      .from('invoices')
      .update({
        status: 'paid',
        paid_at: paidAt,
      })
      .eq('id', invoice.id)
      .eq('status', 'pending') // Only update if still pending (prevents race conditions)
      .select('id, status, paid_at')
      .single();

    if (updateError) {
      console.error('❌ Error updating invoice status:', updateError);
      return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
    }

    if (!updatedInvoice) {
      console.warn('⚠️ Invoice was not updated - may have already been processed');
      return NextResponse.json({ 
        message: 'Invoice may have already been processed',
        invoice_id: invoice.id 
      });
    }

    console.log('✅ Invoice status updated to paid successfully!', {
      invoice_id: updatedInvoice.id,
      status: updatedInvoice.status,
      paid_at: updatedInvoice.paid_at
    });

    // Create project automatically after payment (same logic as webhook)
    try {
      console.log('🚀 Creating project for invoice:', invoice.id);
      
      const estimate = Array.isArray(invoice.estimates) ? invoice.estimates[0] : invoice.estimates;
      
      if (!estimate) {
        throw new Error('Estimate not found for invoice');
      }

      const { data: project, error: projectError } = await client
        .from('projects')
        .insert({
          title: estimate.title,
          description: estimate.description,
          user_id: invoice.user_id,
          estimate_id: invoice.estimate_id,
          status: 'active',
          created_at: new Date().toISOString(),
        })
        .select('id, title, user_id')
        .single();

      if (projectError) {
        console.error('❌ Error creating project:', projectError);
        // Don't fail the payment processing if project creation fails
      } else {
        console.log('✅ Project created successfully:', project?.id);
      }
    } catch (projectError) {
      console.error('❌ Project creation failed:', projectError);
    }

    // Record activity (same logic as webhook)
    try {
      console.log('📝 Recording payment activity...');
      
      const { error: activityError } = await client
        .from('activity_feed')
        .insert({
          user_id: invoice.user_id,
          type: 'payment',
          title: 'Payment Received',
          description: `Payment of $${(invoice.final_price_cents / 100).toFixed(2)} received for "${Array.isArray(invoice.estimates) ? invoice.estimates[0]?.title : invoice.estimates?.title}"`,
          metadata: {
            invoice_id: invoice.id,
            amount_cents: invoice.final_price_cents,
            payment_intent_id: invoice.stripe_payment_intent_id,
            triggered_manually: true,
            triggered_by_admin: userId
          },
          created_at: new Date().toISOString(),
        });

      if (activityError) {
        console.error('❌ Error recording activity:', activityError);
      } else {
        console.log('✅ Payment activity recorded successfully');
      }
    } catch (activityError) {
      console.error('❌ Activity recording failed:', activityError);
    }

    // Send payment confirmation email (same logic as webhook)
    try {
      console.log('📧 Sending payment confirmation email...');
      
      const profile = Array.isArray(invoice.profiles) ? invoice.profiles[0] : invoice.profiles;
      const estimate = Array.isArray(invoice.estimates) ? invoice.estimates[0] : invoice.estimates;
      
      if (profile?.email) {
        await emailService.sendPaymentConfirmationEmail(
          profile.email,
          `${profile.first_name} ${profile.last_name}`,
          estimate?.title || 'Project',
          invoice.final_price_cents,
          invoice.id
        );
        console.log('✅ Payment confirmation email sent to:', profile.email);
      }
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'Invoice manually processed successfully',
      invoice: {
        id: updatedInvoice.id,
        status: updatedInvoice.status,
        paid_at: updatedInvoice.paid_at,
      },
      stripe_verification: stripeVerification,
      triggered_by: userId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Manual webhook trigger error:', error);
    return NextResponse.json({ 
      error: 'Manual webhook processing failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 