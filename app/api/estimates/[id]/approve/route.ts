import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { stripeService } from '../../../../../services/stripe/stripe-service';

// Default tax rate (8.5% - can be configurable later)
const DEFAULT_TAX_RATE = 8.5;

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
        approved_by_user,
        profiles:user_id (
          id,
          first_name,
          last_name,
          email,
          organization,
          phone
        )
      `)
      .eq('id', estimateId)
      .single();

    if (estimateError || !estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }

    // Verify the user owns this estimate
    if (estimate.user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized: You can only approve your own estimates' }, { status: 403 });
    }

    // Check if estimate is in correct status for approval
    if (estimate.status !== 'finalized') {
      return NextResponse.json({ error: 'Only finalized estimates can be approved' }, { status: 400 });
    }

    // Check if already approved
    if (estimate.approved_by_user) {
      return NextResponse.json({ error: 'Estimate has already been approved' }, { status: 400 });
    }

    // Validate final price exists
    if (!estimate.final_price_cents) {
      return NextResponse.json({ error: 'Estimate must have a final price before approval' }, { status: 400 });
    }

    // Start transaction-like operations
    try {
      // Update estimate to approved
      const { error: updateError } = await client
        .from('estimates')
        .update({ 
          approved_by_user: true,
          status: 'approved'
        })
        .eq('id', estimateId);

      if (updateError) {
        throw new Error('Failed to update estimate status');
      }

      // Calculate invoice amounts
      const preTaxAmount = estimate.final_price_cents;
      const taxRate = DEFAULT_TAX_RATE;
      const taxAmount = Math.round(preTaxAmount * (taxRate / 100));
      const totalAmount = preTaxAmount + taxAmount;

      // Set due date (30 days from now)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      // Get customer profile for Stripe
      const profile = Array.isArray(estimate.profiles) ? estimate.profiles[0] : estimate.profiles;
      
      // Create or get Stripe customer
      const stripeCustomer = await stripeService.getOrCreateCustomer({
        email: profile.email,
        name: `${profile.first_name} ${profile.last_name}`,
        phone: profile.phone,
        metadata: {
          supabase_user_id: estimate.user_id,
          estimate_id: estimateId,
        },
      });

      // Create payment intent
      const paymentIntent = await stripeService.createPaymentIntent({
        amount: totalAmount,
        currency: 'usd',
        customerId: stripeCustomer.id,
        description: `Invoice for "${estimate.title}"`,
        metadata: {
          estimate_id: estimateId,
          user_id: estimate.user_id,
          invoice_type: 'project_payment',
          source: 'estimate_approval',
        },
      });

      // Create invoice with Stripe integration
      const { data: invoice, error: invoiceError } = await client
        .from('invoices')
        .insert({
          estimate_id: estimateId,
          user_id: estimate.user_id,
          final_price_cents: totalAmount, // Total amount including tax
          tax_rate: taxRate,
          status: 'pending',
          due_date: dueDate.toISOString(),
          stripe_payment_intent_id: paymentIntent.id,
          payment_url: null, // Could be updated later with payment page URL
        })
        .select(`
          id,
          estimate_id,
          user_id,
          final_price_cents,
          tax_rate,
          status,
          due_date,
          stripe_payment_intent_id,
          created_at
        `)
        .single();

      if (invoiceError) {
        console.error('Error creating invoice:', invoiceError);
        
        // Rollback estimate approval
        await client
          .from('estimates')
          .update({ 
            approved_by_user: false,
            status: 'finalized'
          })
          .eq('id', estimateId);

        throw new Error('Failed to create invoice');
      }

      // Record activities
      try {
        await Promise.all([
          // Estimate approved activity
          client
            .from('recent_activity')
            .insert({
              user_id: estimate.user_id,
              activity_type: 'estimate_approved',
              activity_description: `approved an estimate for "${estimate.title}"`,
              metadata: { estimate_id: estimateId }
            }),
          
          // Invoice created activity
          client
            .from('recent_activity')
            .insert({
              user_id: estimate.user_id,
              activity_type: 'invoice_created',
              activity_description: `received an invoice for "${estimate.title}"`,
              metadata: { 
                estimate_id: estimateId, 
                invoice_id: invoice.id,
                amount: totalAmount,
                stripe_payment_intent_id: paymentIntent.id
              }
            })
        ]);
      } catch (activityError) {
        console.error('Error recording activity:', activityError);
        // Don't fail the main operation for activity logging issues
      }

      return NextResponse.json({
        message: 'Estimate approved successfully',
        estimate: {
          id: estimateId,
          approved_by_user: true,
          status: 'approved'
        },
        invoice: {
          id: invoice.id,
          pre_tax_amount: preTaxAmount,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          tax_rate: taxRate,
          due_date: invoice.due_date,
          stripe_payment_intent_id: paymentIntent.id,
          client_secret: paymentIntent.client_secret
        }
      });

    } catch (operationError) {
      console.error('Error in approval process:', operationError);
      return NextResponse.json({ 
        error: 'Failed to process estimate approval. Please try again.' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in estimate approval:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 