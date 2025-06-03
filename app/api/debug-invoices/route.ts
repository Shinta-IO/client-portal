import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

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

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = createAdminSupabaseClient();

    // Get all invoices for debugging
    const { data: invoices, error } = await client
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
        profiles:user_id (
          first_name,
          last_name,
          email
        ),
        estimates:estimate_id (
          title
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: 'Database error', details: error }, { status: 500 });
    }

    // Get user's profile to check if admin
    const { data: profile } = await client
      .from('profiles')
      .select('is_admin, first_name, last_name')
      .eq('id', userId)
      .single();

    const isAdmin = profile?.is_admin || false;

    // Filter invoices based on access rights
    const accessibleInvoices = isAdmin 
      ? invoices 
      : invoices.filter(invoice => invoice.user_id === userId);

    const debugInfo = {
      currentUser: {
        id: userId,
        isAdmin,
        name: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown'
      },
      invoiceCount: accessibleInvoices.length,
      invoices: accessibleInvoices.map(invoice => ({
        id: invoice.id,
        status: invoice.status,
        amount: invoice.final_price_cents,
        hasPaymentIntent: !!invoice.stripe_payment_intent_id,
        paymentIntentId: invoice.stripe_payment_intent_id,
        paidAt: invoice.paid_at,
        userOwns: invoice.user_id === userId,
        customer: invoice.profiles ? 
          `${invoice.profiles.first_name} ${invoice.profiles.last_name}` : 
          'Unknown',
        project: invoice.estimates?.title || 'Unknown',
        createdAt: invoice.created_at
      })),
      summary: {
        pending: accessibleInvoices.filter(i => i.status === 'pending').length,
        paid: accessibleInvoices.filter(i => i.status === 'paid').length,
        overdue: accessibleInvoices.filter(i => i.status === 'overdue').length,
        withPaymentIntent: accessibleInvoices.filter(i => i.stripe_payment_intent_id).length,
        withoutPaymentIntent: accessibleInvoices.filter(i => !i.stripe_payment_intent_id).length
      }
    };

    return NextResponse.json(debugInfo);

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 