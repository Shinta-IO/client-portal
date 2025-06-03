import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripeService } from '../../../../services/stripe/stripe-service';
import { emailService } from '@/services/email/sendgrid';
import { headers } from 'next/headers';

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
    const body = await request.text();
    const headersList = headers();
    const signature = headersList.get('stripe-signature');

    console.log('🔄 Webhook received - Signature present:', !!signature);

    if (!signature) {
      console.error('❌ Missing stripe-signature header');
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    // Verify webhook signature
    let event;
    try {
      event = await stripeService.constructEvent(body, signature);
      console.log('✅ Webhook signature verified successfully');
    } catch (signatureError) {
      console.error('❌ Webhook signature verification failed:', signatureError);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
    
    const client = createAdminSupabaseClient();

    console.log('🎯 Stripe webhook event:', event.type, 'ID:', event.id);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        console.log('💰 Payment succeeded for Payment Intent:', paymentIntent.id);
        
        // Find invoice by payment intent ID
        console.log('🔍 Looking for invoice with payment intent ID:', paymentIntent.id);
        const { data: invoice, error: invoiceError } = await client
          .from('invoices')
          .select(`
            id,
            user_id,
            estimate_id,
            final_price_cents,
            status,
            stripe_payment_intent_id,
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
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .single();

        if (invoiceError) {
          console.error('❌ Error finding invoice:', invoiceError);
          return NextResponse.json({ error: 'Database error finding invoice' }, { status: 500 });
        }

        if (!invoice) {
          console.error('❌ Invoice not found for payment intent:', paymentIntent.id);
          
          // Let's also check if there are any invoices with this payment intent
          const { data: allInvoices, error: allError } = await client
            .from('invoices')
            .select('id, stripe_payment_intent_id, status')
            .limit(10);
          
          console.log('📊 Recent invoices in database:', allInvoices);
          return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        console.log('📋 Found invoice:', {
          id: invoice.id,
          status: invoice.status,
          amount: invoice.final_price_cents,
          stripe_payment_intent_id: invoice.stripe_payment_intent_id
        });

        // Check if already paid
        if (invoice.status === 'paid') {
          console.log('ℹ️ Invoice already marked as paid:', invoice.id);
          return NextResponse.json({ message: 'Invoice already paid' });
        }

        // Update invoice status to paid
        console.log('🔄 Updating invoice status to paid...');
        const { error: updateError } = await client
          .from('invoices')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
          })
          .eq('id', invoice.id);

        if (updateError) {
          console.error('❌ Error updating invoice status:', updateError);
          return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
        }

        console.log('✅ Invoice status updated to paid successfully!');

        // Create project automatically after payment
        const estimate = Array.isArray(invoice.estimates) ? invoice.estimates[0] : invoice.estimates;
        const profile = Array.isArray(invoice.profiles) ? invoice.profiles[0] : invoice.profiles;
        
        try {
          console.log('🚀 Creating project for invoice:', invoice.id);
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
            console.error('❌ Error creating project:', projectError);
            // Don't fail the webhook, but log the error
          } else {
            console.log('✅ Project created successfully:', project.id);
            
            // Send project creation email (async, don't wait)
            if (profile) {
              const userName = `${profile.first_name} ${profile.last_name}`.trim();
              try {
                emailService.sendProjectCreatedEmail(
                  profile.email,
                  userName,
                  estimate.title,
                  estimate.description
                ).catch(error => console.error('Project creation email sending failed:', error));
              } catch (emailError) {
                console.error('Project creation email service error:', emailError);
              }
            }
          }

          // Record activity for invoice payment
          console.log('📝 Recording activity...');
          await client
            .from('recent_activity')
            .insert({
              user_id: invoice.user_id,
              activity_type: 'invoice_paid',
              activity_description: `paid invoice for "${estimate.title}"`,
              metadata: { 
                invoice_id: invoice.id,
                estimate_id: invoice.estimate_id,
                amount: invoice.final_price_cents,
                payment_intent_id: paymentIntent.id,
                project_id: project?.id
              }
            });

          // Record activity for project creation if successful
          if (project) {
            await client
              .from('recent_activity')
              .insert({
                user_id: invoice.user_id,
                activity_type: 'project_created',
                activity_description: `started project "${estimate.title}"`,
                metadata: { 
                  project_id: project.id,
                  invoice_id: invoice.id,
                  estimate_id: invoice.estimate_id
                }
              });
          }

          // Send payment confirmation email (async, don't wait)
          if (profile) {
            const userName = `${profile.first_name} ${profile.last_name}`.trim();
            try {
              emailService.sendPaymentConfirmationEmail(
                profile.email,
                userName,
                estimate.title,
                invoice.final_price_cents,
                paymentIntent.id
              ).catch(error => console.error('Payment confirmation email sending failed:', error));
            } catch (emailError) {
              console.error('Payment confirmation email service error:', emailError);
            }
          }

          console.log('✅ Activity recorded successfully');

        } catch (activityError) {
          console.error('⚠️ Error recording activity:', activityError);
          // Don't fail the webhook for activity logging issues
        }

        console.log('🎉 Invoice payment processed successfully:', invoice.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        console.log('❌ Payment failed for Payment Intent:', paymentIntent.id);
        
        // Find invoice by payment intent ID
        const { data: invoice, error: invoiceError } = await client
          .from('invoices')
          .select('id, user_id, status')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .single();

        if (invoiceError || !invoice) {
          console.error('❌ Invoice not found for failed payment intent:', paymentIntent.id);
          return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        // Update invoice status to overdue (or keep as pending)
        const { error: updateError } = await client
          .from('invoices')
          .update({
            status: 'overdue',
          })
          .eq('id', invoice.id);

        if (updateError) {
          console.error('❌ Error updating invoice status:', updateError);
        } else {
          console.log('✅ Invoice marked as overdue:', invoice.id);
        }

        break;
      }

      case 'customer.created': {
        const customer = event.data.object;
        console.log('👤 Stripe customer created:', customer.id);
        break;
      }

      default:
        console.log('ℹ️ Unhandled webhook event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('💥 Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
} 