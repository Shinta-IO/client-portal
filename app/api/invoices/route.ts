import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
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
      .from('invoices')
      .select(`
        id,
        estimate_id,
        user_id,
        invoice_pdf_url,
        final_price_cents,
        tax_rate,
        status,
        payment_url,
        stripe_payment_intent_id,
        due_date,
        paid_at,
        created_at,
        profiles:user_id (
          id,
          first_name,
          last_name,
          email,
          organization
        ),
        estimates:estimate_id (
          id,
          title,
          description,
          final_price_cents
        )
      `)
      .order('created_at', { ascending: false });

    // If not admin, only show user's own invoices
    if (!isAdmin) {
      query = query.eq('user_id', userId);
    }

    const { data: invoices, error } = await query;

    if (error) {
      console.error('Error fetching invoices:', error);
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
    }

    return NextResponse.json(invoices || []);
  } catch (error) {
    console.error('Error in invoices GET:', error);
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
      estimate_id,
      user_id, // For admin creating invoices for users
      final_price_cents,
      tax_rate,
      due_date,
    } = body;

    // Validate required fields
    if (!estimate_id || !final_price_cents) {
      return NextResponse.json({ error: 'Estimate ID and final price are required' }, { status: 400 });
    }

    const client = createAdminSupabaseClient();
    
    // Check if current user is admin
    const { data: profile } = await client
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    const isAdmin = profile?.is_admin || false;

    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins can create invoices' }, { status: 403 });
    }

    // Determine who the invoice is for
    let invoiceUserId = user_id || userId;

    // Get estimate details
    const { data: estimate, error: estimateError } = await client
      .from('estimates')
      .select(`
        id,
        user_id,
        title,
        final_price_cents,
        profiles:user_id (
          id,
          first_name,
          last_name,
          email,
          organization,
          phone
        )
      `)
      .eq('id', estimate_id)
      .single();

    if (estimateError || !estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }

    // Use estimate's user_id if no user_id specified
    if (!user_id) {
      invoiceUserId = estimate.user_id;
    }

    // Get customer profile
    const { data: customerProfile } = await client
      .from('profiles')
      .select('*')
      .eq('id', invoiceUserId)
      .single();

    if (!customerProfile) {
      return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 });
    }

    try {
      // Create or get Stripe customer
      const stripeCustomer = await stripeService.getOrCreateCustomer({
        email: customerProfile.email,
        name: `${customerProfile.first_name} ${customerProfile.last_name}`,
        phone: customerProfile.phone,
        metadata: {
          supabase_user_id: invoiceUserId,
          estimate_id: estimate_id,
        },
      });

      // Create payment intent
      const paymentIntent = await stripeService.createPaymentIntent({
        amount: final_price_cents,
        currency: 'usd',
        customerId: stripeCustomer.id,
        description: `Invoice for "${estimate.title}"`,
        metadata: {
          estimate_id: estimate_id,
          user_id: invoiceUserId,
          invoice_type: 'project_payment',
        },
      });

      // Calculate due date (30 days from now if not specified)
      const dueDate = due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      // Create invoice in database
      const invoiceData = {
        estimate_id,
        user_id: invoiceUserId,
        final_price_cents,
        tax_rate: tax_rate || 0,
        status: 'pending' as const,
        stripe_payment_intent_id: paymentIntent.id,
        payment_url: null, // Will be updated when payment page is generated
        due_date: dueDate,
      };

      const { data: invoice, error: invoiceError } = await client
        .from('invoices')
        .insert(invoiceData)
        .select(`
          id,
          estimate_id,
          user_id,
          invoice_pdf_url,
          final_price_cents,
          tax_rate,
          status,
          payment_url,
          stripe_payment_intent_id,
          due_date,
          paid_at,
          created_at,
          profiles:user_id (
            id,
            first_name,
            last_name,
            email,
            organization
          ),
          estimates:estimate_id (
            id,
            title,
            description
          )
        `)
        .single();

      if (invoiceError) {
        console.error('Error creating invoice:', invoiceError);
        return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
      }

      // Record activity
      try {
        const customerName = `${customerProfile.first_name} ${customerProfile.last_name}`;
        const { data: adminProfile } = await client
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', userId)
          .single();

        const adminName = adminProfile ? 
          `${adminProfile.first_name} ${adminProfile.last_name}` : 
          'Admin';

        await client
          .from('recent_activity')
          .insert({
            user_id: invoiceUserId,
            activity_type: 'invoice_created',
            activity_description: `received an invoice from ${adminName} for "${estimate.title}"`,
            metadata: { 
              invoice_id: invoice.id,
              estimate_id: estimate_id,
              amount: final_price_cents
            }
          });

        // Send invoice creation email (async, don't wait)
        try {
          emailService.sendInvoiceCreatedEmail(
            customerProfile.email,
            customerName,
            estimate.title,
            final_price_cents,
            `${process.env.NEXT_PUBLIC_APP_URL}/invoices`
          ).catch(error => console.error('Invoice creation email sending failed:', error));
        } catch (emailError) {
          console.error('Invoice creation email service error:', emailError);
        }
      } catch (activityError) {
        console.error('Error recording activity:', activityError);
        // Don't fail the main operation
      }

      return NextResponse.json({
        ...invoice,
        client_secret: paymentIntent.client_secret,
      }, { status: 201 });

    } catch (stripeError) {
      console.error('Stripe error:', stripeError);
      return NextResponse.json({ error: 'Failed to create payment intent' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in invoices POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 