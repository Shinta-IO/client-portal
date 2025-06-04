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
    console.log('🔄 Request URL:', request.url);
    console.log('🔄 Request method:', request.method);
    console.log('🔄 Headers present:', Array.from(headersList.keys()));

    if (!signature) {
      console.error('❌ Missing stripe-signature header');
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    // Verify webhook signature
    let event;
    try {
      event = await stripeService.constructEvent(body, signature);
      console.log('✅ Webhook signature verified successfully');
      console.log('🎯 Event details:', {
        id: event.id,
        type: event.type,
        created: event.created,
        livemode: event.livemode
      });
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
        console.log('💰 Payment Intent metadata:', paymentIntent.metadata);
        console.log('💰 Payment Intent amount:', paymentIntent.amount);
        console.log('💰 Payment Intent status:', paymentIntent.status);
        
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
            paid_at,
            created_at,
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
          console.error('❌ Query details:', {
            payment_intent_id: paymentIntent.id,
            error_code: invoiceError.code,
            error_message: invoiceError.message
          });
          return NextResponse.json({ error: 'Database error finding invoice' }, { status: 500 });
        }

        if (!invoice) {
          console.error('❌ Invoice not found for payment intent:', paymentIntent.id);
          
          // Let's also check if there are any invoices with this payment intent
          const { data: allInvoices, error: allError } = await client
            .from('invoices')
            .select('id, stripe_payment_intent_id, status, created_at')
            .order('created_at', { ascending: false })
            .limit(10);
          
          console.log('📊 Recent invoices in database:', allInvoices?.map(inv => ({
            id: inv.id,
            stripe_payment_intent_id: inv.stripe_payment_intent_id,
            status: inv.status,
            created_at: inv.created_at
          })));
          
          // Try to find invoice using metadata
          if (paymentIntent.metadata.invoice_id) {
            console.log('🔍 Trying to find invoice by metadata invoice_id:', paymentIntent.metadata.invoice_id);
            const { data: metadataInvoice, error: metadataError } = await client
              .from('invoices')
              .select('id, stripe_payment_intent_id, status')
              .eq('id', paymentIntent.metadata.invoice_id)
              .single();
              
            if (metadataInvoice) {
              console.log('📋 Found invoice by metadata:', metadataInvoice);
              // Update the payment intent ID if it doesn't match
              if (metadataInvoice.stripe_payment_intent_id !== paymentIntent.id) {
                console.log('🔄 Updating payment intent ID on invoice');
                await client
                  .from('invoices')
                  .update({ stripe_payment_intent_id: paymentIntent.id })
                  .eq('id', paymentIntent.metadata.invoice_id);
              }
            } else {
              console.error('❌ Invoice not found even by metadata:', metadataError);
            }
          }
          
          return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        console.log('📋 Found invoice:', {
          id: invoice.id,
          status: invoice.status,
          amount: invoice.final_price_cents,
          stripe_payment_intent_id: invoice.stripe_payment_intent_id,
          paid_at: invoice.paid_at,
          user_id: invoice.user_id
        });

        // Check if already paid (idempotency check)
        if (invoice.status === 'paid' && invoice.paid_at) {
          console.log('ℹ️ Invoice already marked as paid:', invoice.id, 'at:', invoice.paid_at);
          return NextResponse.json({ 
            message: 'Invoice already paid',
            invoice_id: invoice.id,
            paid_at: invoice.paid_at 
          });
        }

        // Verify payment amount matches invoice amount
        if (paymentIntent.amount !== invoice.final_price_cents) {
          console.warn('⚠️ Payment amount mismatch:', {
            payment_intent_amount: paymentIntent.amount,
            invoice_amount: invoice.final_price_cents,
            difference: paymentIntent.amount - invoice.final_price_cents
          });
        }

        // Update invoice status to paid with transaction-like behavior
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

        // Create project automatically after payment
        const estimate = Array.isArray(invoice.estimates) ? invoice.estimates[0] : invoice.estimates;
        const profile = Array.isArray(invoice.profiles) ? invoice.profiles[0] : invoice.profiles;
        
        try {
          // Check if project already exists for this invoice (idempotency)
          const { data: existingProject } = await client
            .from('projects')
            .select('id')
            .eq('invoice_id', invoice.id)
            .single();

          let project = existingProject;

          if (!existingProject) {
            console.log('🚀 Creating project for invoice:', invoice.id);
            const { data: newProject, error: projectError } = await client
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
              project = newProject;
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
          } else {
            console.log('ℹ️ Project already exists for invoice:', invoice.id, 'project ID:', existingProject.id);
          }

          // Record activity for invoice payment (with idempotency check)
          console.log('📝 Recording payment activity...');
          const { data: existingActivity } = await client
            .from('recent_activity')
            .select('id')
            .eq('user_id', invoice.user_id)
            .eq('activity_type', 'invoice_paid')
            .eq('metadata->>payment_intent_id', paymentIntent.id)
            .single();

          if (!existingActivity) {
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
                  project_id: project?.id,
                  webhook_event_id: event.id
                }
              });
          }

          // Record activity for project creation if successful and not already recorded
          if (project && !existingProject) {
            const { data: existingProjectActivity } = await client
              .from('recent_activity')
              .select('id')
              .eq('user_id', invoice.user_id)
              .eq('activity_type', 'project_created')
              .eq('metadata->>project_id', project.id)
              .single();

            if (!existingProjectActivity) {
              await client
                .from('recent_activity')
                .insert({
                  user_id: invoice.user_id,
                  activity_type: 'project_created',
                  activity_description: `started project "${estimate.title}"`,
                  metadata: { 
                    project_id: project.id,
                    invoice_id: invoice.id,
                    estimate_id: invoice.estimate_id,
                    webhook_event_id: event.id
                  }
                });
            }
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
          .select('id, user_id, status, estimate_id, estimates:estimate_id(title)')
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
          
          // Record payment failure activity
          try {
            const estimate = Array.isArray(invoice.estimates) ? invoice.estimates[0] : invoice.estimates;
            await client
              .from('recent_activity')
              .insert({
                user_id: invoice.user_id,
                activity_type: 'payment_failed',
                activity_description: `payment failed for "${estimate.title}"`,
                metadata: { 
                  invoice_id: invoice.id,
                  estimate_id: invoice.estimate_id,
                  payment_intent_id: paymentIntent.id,
                  webhook_event_id: event.id,
                  failure_reason: paymentIntent.last_payment_error?.message || 'Unknown error'
                }
              });
          } catch (activityError) {
            console.error('⚠️ Error recording payment failure activity:', activityError);
          }
        }

        break;
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object;
        console.log('🔄 Payment intent canceled:', paymentIntent.id);
        
        // Find invoice by payment intent ID
        const { data: invoice, error: invoiceError } = await client
          .from('invoices')
          .select('id, user_id, status')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .single();

        if (invoiceError || !invoice) {
          console.log('ℹ️ Invoice not found for canceled payment intent:', paymentIntent.id);
          return NextResponse.json({ received: true });
        }

        // Reset payment intent ID so a new one can be created
        const { error: updateError } = await client
          .from('invoices')
          .update({
            stripe_payment_intent_id: null,
          })
          .eq('id', invoice.id);

        if (updateError) {
          console.error('❌ Error clearing payment intent ID:', updateError);
        } else {
          console.log('✅ Payment intent ID cleared for invoice:', invoice.id);
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