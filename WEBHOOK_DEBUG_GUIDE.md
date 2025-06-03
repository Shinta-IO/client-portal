# 🐛 Webhook Debug Guide - Invoice Status Not Updating

## 🔍 **The Problem**
Stripe payments are succeeding, but invoice status remains "pending" instead of updating to "paid". This means the webhook isn't processing the `payment_intent.succeeded` event properly.

## 🧪 **Quick Debug Steps**

### **1. Test Webhook Manually (Admin Required)**

```bash
# Test if webhook processing works manually
curl -X POST http://localhost:3000/api/test-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": "YOUR_INVOICE_ID",
    "action": "mark_paid"
  }'

# Check invoice status
curl -X POST http://localhost:3000/api/test-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": "YOUR_INVOICE_ID", 
    "action": "check_status"
  }'

# List recent invoices
curl -X POST http://localhost:3000/api/test-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "action": "list_recent"
  }'
```

### **2. Check Environment Variables**

Ensure these are set in your `.env.local` file:

```env
# Stripe Configuration (REQUIRED)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
```

### **3. Check Console Logs**

After making a payment, look for these logs in your Next.js console:

```
✅ Expected Success Flow:
🔄 Webhook received - Signature present: true
✅ Webhook signature verified successfully  
🎯 Stripe webhook event: payment_intent.succeeded ID: pi_xxx
💰 Payment succeeded for Payment Intent: pi_xxx
🔍 Looking for invoice with payment intent ID: pi_xxx
📋 Found invoice: { id: 'xxx', status: 'pending', ... }
🔄 Updating invoice status to paid...
✅ Invoice status updated to paid successfully!
🚀 Creating project for invoice: xxx
✅ Project created successfully: xxx
📝 Recording activity...
✅ Activity recorded successfully
🎉 Invoice payment processed successfully: xxx
```

```
❌ Common Error Patterns:
❌ Missing stripe-signature header
❌ Webhook signature verification failed
❌ Invoice not found for payment intent: pi_xxx
❌ Error updating invoice status: { ... }
```

## 🔧 **Common Issues & Solutions**

### **Issue 1: Webhook Not Configured in Stripe Dashboard**

**Symptoms:**
- No webhook logs appear in console
- Payments succeed but no backend processing

**Solution:**
1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter URL: `https://your-domain.com/api/invoices/webhook` (or ngrok for local)
4. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
5. Copy the webhook secret to your environment

### **Issue 2: Local Development Webhook Setup**

**For local testing, use ngrok:**

```bash
# Install ngrok
npm install -g ngrok

# Start your Next.js app
npm run dev

# In another terminal, expose localhost:3000
ngrok http 3000

# Use the ngrok URL in Stripe webhook config:
# https://xxx.ngrok.io/api/invoices/webhook
```

### **Issue 3: Wrong Webhook Secret**

**Symptoms:**
- `❌ Webhook signature verification failed`

**Solution:**
1. Go to Stripe Dashboard → Webhooks → Your webhook
2. Click "Reveal" next to "Signing secret"
3. Copy the `whsec_...` value to `STRIPE_WEBHOOK_SECRET`

### **Issue 4: Database Connection Issues**

**Symptoms:**
- `❌ Error finding invoice` or `❌ Error updating invoice status`

**Solution:**
1. Verify `SUPABASE_SERVICE_ROLE_KEY` (not the anon key!)
2. Check Supabase logs for RLS policy errors
3. Ensure invoice table has proper permissions

### **Issue 5: Payment Intent ID Mismatch**

**Symptoms:**
- `❌ Invoice not found for payment intent: pi_xxx`
- `📊 Recent invoices in database:` shows invoices without matching payment intent

**Solution:**
```sql
-- Check if payment intent IDs are being stored correctly
SELECT id, stripe_payment_intent_id, status, created_at 
FROM invoices 
ORDER BY created_at DESC 
LIMIT 10;

-- Look for NULL or incorrect payment intent IDs
```

## 🚀 **Testing the Fix**

### **Complete Test Flow:**

1. **Start the app with logging:**
   ```bash
   npm run dev
   # Watch console for webhook logs
   ```

2. **Create a test payment:**
   - Go to `/invoices`
   - Click "Pay Now" on a pending invoice
   - Use test card: `4242 4242 4242 4242`
   - Complete payment

3. **Verify webhook processing:**
   - Check console for success logs
   - Refresh invoice page - status should be "paid"
   - Check if project was created automatically

4. **If still not working, manually test:**
   ```bash
   # Use test endpoint to manually mark invoice as paid
   curl -X POST http://localhost:3000/api/test-webhook \
     -H "Content-Type: application/json" \
     -d '{"invoiceId": "INVOICE_ID", "action": "mark_paid"}'
   ```

## 📋 **Webhook Event Testing**

### **Test with Stripe CLI (Alternative to ngrok):**

```bash
# Install Stripe CLI
# Download from: https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to local endpoint
stripe listen --forward-to localhost:3000/api/invoices/webhook

# The CLI will show you the webhook secret - add it to .env.local
# Test payments will now trigger your local webhook
```

## ✅ **When It's Working Correctly**

You should see:
- ✅ Console logs showing successful webhook processing
- ✅ Invoice status changes from "pending" → "paid" immediately
- ✅ `paid_at` timestamp is set
- ✅ Project is automatically created
- ✅ Activity feed shows payment events

## 🆘 **Still Not Working?**

If you've tried everything above:

1. **Check Stripe logs:**
   - Go to Stripe Dashboard → Logs
   - Look for webhook delivery failures

2. **Use manual test endpoint:**
   ```bash
   # Mark invoice as paid manually (admin only)
   POST /api/test-webhook
   {
     "invoiceId": "your-invoice-id",
     "action": "mark_paid"
   }
   ```

3. **Check database directly:**
   ```sql
   -- Verify invoice exists and has correct payment intent ID
   SELECT * FROM invoices WHERE id = 'your-invoice-id';
   
   -- Manually update if needed (temporary fix)
   UPDATE invoices 
   SET status = 'paid', paid_at = NOW() 
   WHERE id = 'your-invoice-id';
   ```

The webhook processing should work reliably once the Stripe webhook endpoint is properly configured and the environment variables are set correctly. 