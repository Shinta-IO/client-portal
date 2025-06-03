import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { stripeService } from '../../../../../services/stripe/stripe-service';

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
    
    console.log('💳 Payment endpoint called for user:', userId);
    
    if (!userId) {
      console.error('❌ No userId in payment request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invoiceId = params.id;
    console.log('💳 Requested invoice ID:', invoiceId);

    if (!invoiceId) {
      console.error('❌ No invoice ID provided');
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    const client = createAdminSupabaseClient();

    // Get the invoice with user profile
    console.log('🔍 Fetching invoice details...');
    const { data: invoice, error: invoiceError } = await client
      .from('invoices')
      .select(`
        id,
        user_id,
        estimate_id,
        final_price_cents,
        tax_rate,
        status,
        stripe_payment_intent_id,
        due_date,
        paid_at,
        created_at,
        profiles:user_id (
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        estimates:estimate_id (
          id,
          title,
          description
        )
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError) {
      console.error('❌ Database error fetching invoice:', invoiceError);
      return NextResponse.json({ error: 'Database error', details: invoiceError }, { status: 500 });
    }

    if (!invoice) {
      console.error('❌ Invoice not found:', invoiceId);
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    console.log('📋 Found invoice:', {
      id: invoice.id,
      status: invoice.status,
      user_id: invoice.user_id,
      amount: invoice.final_price_cents,
      stripe_payment_intent_id: invoice.stripe_payment_intent_id
    });

    // Check if user owns this invoice (or is admin)
    console.log('🔐 Checking user permissions...');
    const { data: profile } = await client
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    const isAdmin = profile?.is_admin || false;
    const canAccess = isAdmin || invoice.user_id === userId;

    console.log('🔐 Permission check:', {
      userId,
      invoiceUserId: invoice.user_id,
      isAdmin,
      canAccess
    });

    if (!canAccess) {
      console.error('❌ User cannot access this invoice');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if invoice is payable
    console.log('📊 Checking invoice status:', invoice.status);
    if (invoice.status !== 'pending') {
      console.error('❌ Invoice is not payable. Status:', invoice.status);
      return NextResponse.json({ 
        error: `Invoice cannot be paid. Current status: ${invoice.status}`,
        currentStatus: invoice.status,
        paidAt: invoice.paid_at
      }, { status: 400 });
    }

    // Get or create payment intent
    let clientSecret: string;

    if (invoice.stripe_payment_intent_id) {
      console.log('💰 Existing payment intent found:', invoice.stripe_payment_intent_id);
      // Retrieve existing payment intent
      try {
        const paymentIntent = await stripeService.retrievePaymentIntent(invoice.stripe_payment_intent_id);
        
        console.log('💰 Payment intent status:', paymentIntent.status);
        
        if (paymentIntent.status === 'succeeded') {
          console.error('❌ Payment intent already succeeded');
          return NextResponse.json({ 
            error: 'Invoice has already been paid',
            paymentIntentStatus: paymentIntent.status
          }, { status: 400 });
        }

        if (paymentIntent.status === 'canceled') {
          console.log('⚠️ Payment intent was canceled, creating new one');
          throw new Error('Payment intent was canceled');
        }

        clientSecret = paymentIntent.client_secret!;
        console.log('✅ Using existing payment intent');
      } catch (error) {
        console.error('⚠️ Error retrieving payment intent:', error);
        // If payment intent is invalid, create a new one
        const profile = Array.isArray(invoice.profiles) ? invoice.profiles[0] : invoice.profiles;
        const estimate = Array.isArray(invoice.estimates) ? invoice.estimates[0] : invoice.estimates;

        console.log('🔄 Creating new payment intent...');

        // Create or get Stripe customer
        const stripeCustomer = await stripeService.getOrCreateCustomer({
          email: profile.email,
          name: `${profile.first_name} ${profile.last_name}`,
          phone: profile.phone,
          metadata: {
            supabase_user_id: invoice.user_id,
            estimate_id: invoice.estimate_id,
          },
        });

        // Create new payment intent
        const paymentIntent = await stripeService.createPaymentIntent({
          amount: invoice.final_price_cents,
          currency: 'usd',
          customerId: stripeCustomer.id,
          description: `Invoice for "${estimate.title}"`,
          metadata: {
            invoice_id: invoice.id,
            estimate_id: invoice.estimate_id,
            user_id: invoice.user_id,
            invoice_type: 'project_payment',
          },
        });

        // Update invoice with new payment intent ID
        await client
          .from('invoices')
          .update({ stripe_payment_intent_id: paymentIntent.id })
          .eq('id', invoiceId);

        clientSecret = paymentIntent.client_secret!;
        console.log('✅ Created new payment intent:', paymentIntent.id);
      }
    } else {
      console.log('🆕 No payment intent found, creating new one...');
      // Create new payment intent
      const profile = Array.isArray(invoice.profiles) ? invoice.profiles[0] : invoice.profiles;
      const estimate = Array.isArray(invoice.estimates) ? invoice.estimates[0] : invoice.estimates;

      // Create or get Stripe customer
      const stripeCustomer = await stripeService.getOrCreateCustomer({
        email: profile.email,
        name: `${profile.first_name} ${profile.last_name}`,
        phone: profile.phone,
        metadata: {
          supabase_user_id: invoice.user_id,
          estimate_id: invoice.estimate_id,
        },
      });

      // Create payment intent
      const paymentIntent = await stripeService.createPaymentIntent({
        amount: invoice.final_price_cents,
        currency: 'usd',
        customerId: stripeCustomer.id,
        description: `Invoice for "${estimate.title}"`,
        metadata: {
          invoice_id: invoice.id,
          estimate_id: invoice.estimate_id,
          user_id: invoice.user_id,
          invoice_type: 'project_payment',
        },
      });

      // Update invoice with payment intent ID
      await client
        .from('invoices')
        .update({ stripe_payment_intent_id: paymentIntent.id })
        .eq('id', invoiceId);

      clientSecret = paymentIntent.client_secret!;
      console.log('✅ Created new payment intent:', paymentIntent.id);
    }

    console.log('🎉 Payment endpoint successful, returning client secret');
    return NextResponse.json({
      client_secret: clientSecret,
      invoice: {
        id: invoice.id,
        amount: invoice.final_price_cents,
        currency: 'usd',
        status: invoice.status,
      }
    });

  } catch (error) {
    console.error('💥 Error in invoice payment GET:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 