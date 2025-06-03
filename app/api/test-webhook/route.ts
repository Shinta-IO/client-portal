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

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new Response(`
        <html>
          <body>
            <h1>Unauthorized</h1>
            <p>Please log in to access this endpoint.</p>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' },
        status: 401
      });
    }

    return new Response(`
      <html>
        <head>
          <title>Invoice Test Webhook</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .container { max-width: 600px; }
            button { background: #0066cc; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 10px 5px; }
            button:hover { background: #0052a3; }
            input { padding: 8px; margin: 5px; border: 1px solid #ddd; border-radius: 4px; width: 300px; }
            .result { margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 5px; }
            .action-group { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🧪 Invoice Test Webhook</h1>
            <p>Admin-only endpoint for testing invoice operations.</p>
            
            <div class="action-group">
              <h3>🔄 Quick Sync All Invoices</h3>
              <p>This will sync all pending invoices with their Stripe payment status:</p>
              <button onclick="syncAllInvoices()">Sync All Invoice Statuses</button>
            </div>

            <div class="action-group">
              <h3>💰 Mark Specific Invoice as Paid</h3>
              <input type="text" id="invoiceId" placeholder="Enter Invoice ID" />
              <button onclick="markPaid()">Mark as Paid</button>
            </div>

            <div class="action-group">
              <h3>📋 Check Invoice Status</h3>
              <input type="text" id="checkInvoiceId" placeholder="Enter Invoice ID" />
              <button onclick="checkStatus()">Check Status</button>
            </div>

            <div class="action-group">
              <h3>📊 List Recent Invoices</h3>
              <button onclick="listRecent()">List Recent Invoices</button>
            </div>

            <div id="result" class="result" style="display: none;">
              <h3>Result:</h3>
              <pre id="resultContent"></pre>
            </div>
          </div>

          <script>
            function showResult(data) {
              document.getElementById('result').style.display = 'block';
              document.getElementById('resultContent').textContent = JSON.stringify(data, null, 2);
            }

            async function syncAllInvoices() {
              try {
                const response = await fetch('/api/sync-invoice-status', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' }
                });
                const data = await response.json();
                showResult(data);
              } catch (error) {
                showResult({ error: error.message });
              }
            }

            async function markPaid() {
              const invoiceId = document.getElementById('invoiceId').value;
              if (!invoiceId) {
                alert('Please enter an invoice ID');
                return;
              }
              
              try {
                const response = await fetch('/api/test-webhook', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ invoiceId, action: 'mark_paid' })
                });
                const data = await response.json();
                showResult(data);
              } catch (error) {
                showResult({ error: error.message });
              }
            }

            async function checkStatus() {
              const invoiceId = document.getElementById('checkInvoiceId').value;
              if (!invoiceId) {
                alert('Please enter an invoice ID');
                return;
              }
              
              try {
                const response = await fetch('/api/test-webhook', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ invoiceId, action: 'check_status' })
                });
                const data = await response.json();
                showResult(data);
              } catch (error) {
                showResult({ error: error.message });
              }
            }

            async function listRecent() {
              try {
                const response = await fetch('/api/test-webhook', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'list_recent' })
                });
                const data = await response.json();
                showResult(data);
              } catch (error) {
                showResult({ error: error.message });
              }
            }
          </script>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error) {
    return new Response(`
      <html>
        <body>
          <h1>Error</h1>
          <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' },
      status: 500
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { invoiceId, action } = body;

    if (!invoiceId || !action) {
      return NextResponse.json({ 
        error: 'Missing invoiceId or action' 
      }, { status: 400 });
    }

    const client = createAdminSupabaseClient();

    // Check if user is admin
    const { data: profile } = await client
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log(`🧪 Test action: ${action} for invoice: ${invoiceId}`);

    switch (action) {
      case 'mark_paid': {
        // Find the invoice
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
            )
          `)
          .eq('id', invoiceId)
          .single();

        if (invoiceError || !invoice) {
          return NextResponse.json({ 
            error: 'Invoice not found',
            details: invoiceError 
          }, { status: 404 });
        }

        console.log('📋 Found invoice:', {
          id: invoice.id,
          status: invoice.status,
          amount: invoice.final_price_cents
        });

        // Update invoice status to paid
        const { error: updateError } = await client
          .from('invoices')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
          })
          .eq('id', invoice.id);

        if (updateError) {
          console.error('❌ Error updating invoice:', updateError);
          return NextResponse.json({ 
            error: 'Failed to update invoice',
            details: updateError 
          }, { status: 500 });
        }

        console.log('✅ Invoice status updated to paid');

        // Create project
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
          console.error('❌ Error creating project:', projectError);
        } else {
          console.log('✅ Project created:', project.id);
        }

        return NextResponse.json({
          message: 'Invoice marked as paid',
          invoice: {
            id: invoice.id,
            status: 'paid',
            paid_at: new Date().toISOString()
          },
          project: project ? { id: project.id } : null
        });
      }

      case 'check_status': {
        const { data: invoice, error } = await client
          .from('invoices')
          .select('id, status, stripe_payment_intent_id, paid_at')
          .eq('id', invoiceId)
          .single();

        if (error) {
          return NextResponse.json({ 
            error: 'Invoice not found',
            details: error 
          }, { status: 404 });
        }

        return NextResponse.json({
          invoice,
          message: 'Invoice status retrieved'
        });
      }

      case 'list_recent': {
        const { data: invoices, error } = await client
          .from('invoices')
          .select('id, status, stripe_payment_intent_id, final_price_cents, created_at')
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) {
          return NextResponse.json({ 
            error: 'Failed to fetch invoices',
            details: error 
          }, { status: 500 });
        }

        return NextResponse.json({
          invoices,
          count: invoices.length
        });
      }

      default:
        return NextResponse.json({ 
          error: 'Invalid action. Use: mark_paid, check_status, or list_recent' 
        }, { status: 400 });
    }

  } catch (error) {
    console.error('💥 Test endpoint error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 