# 🐛 Webhook Debug Guide - Invoice Status Updates

## 🔍 **Current Issue**
Invoices paid through Stripe are not automatically updating to "paid" status. The sync function works manually, but the webhook isn't being triggered automatically.

## ✅ **What's Working**
- ✅ Payment processing completes successfully
- ✅ Payment intents are created with correct metadata
- ✅ Manual sync function updates status correctly
- ✅ Webhook endpoint exists and has correct logic

## 🧪 **Testing Steps**

### **1. Test Webhook Connectivity**

First, verify your webhook endpoint is accessible:

```bash
# Test 1: Simple GET request
curl https://your-domain.com/api/webhook-test

# Test 2: POST request (simulating webhook)
curl -X POST https://your-domain.com/api/webhook-test \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook connectivity"}'
```

### **2. Check Stripe Dashboard Configuration**

Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks):

1. **Verify webhook exists** with URL: `https://your-domain.com/api/invoices/webhook`
2. **Check events are selected:**
   - `payment_intent.succeeded` ✅ (REQUIRED)
   - `payment_intent.canceled` ✅ (Optional)
   - `payment_intent.payment_failed` ✅ (Optional)
3. **Check webhook status:** Should be "Enabled"
4. **Check recent deliveries:** Look for failed attempts

### **3. Test Stripe Webhook Locally**

If testing locally, use Stripe CLI:

```bash
# Install Stripe CLI first, then:
stripe listen --forward-to localhost:3000/api/invoices/webhook

# In another terminal, trigger a test event:
stripe trigger payment_intent.succeeded
```

### **4. Check Environment Variables**

Ensure these are set in production:

```env
STRIPE_SECRET_KEY=sk_live_... (or sk_test_...)
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (or pk_test_...)
```

## 🔧 **Quick Fixes**

### **Fix 1: Manual Invoice Status Sync**

If you need immediate fix, use the sync endpoint:

```bash
curl -X POST https://your-domain.com/api/sync-invoice-status \
  -H "Content-Type: application/json"
```

### **Fix 2: Manual Invoice Update (Admin Only)**

For individual invoices, use the test webhook:

```bash
curl -X POST https://your-domain.com/api/test-webhook \
  -H "Content-Type: application/json" \
  -d '{"invoice_id": "your-invoice-id"}'
```

## 🚨 **Common Issues & Solutions**

### **Issue 1: Webhook URL Not Accessible**
**Solution:** Ensure your domain is live and the webhook endpoint returns 200 status

### **Issue 2: Wrong Webhook Secret**
**Solution:** Copy the webhook secret from Stripe Dashboard → Your Webhook → Signing Secret

### **Issue 3: Payment Intent Not Linked to Invoice**
**Solution:** Check if `stripe_payment_intent_id` is correctly saved during invoice creation

### **Issue 4: Multiple Payment Intents**
**Solution:** Ensure only one payment intent is created per invoice

## 📋 **Debugging Checklist**

- [ ] Webhook endpoint is accessible via browser/curl
- [ ] Stripe webhook is configured with correct URL
- [ ] `payment_intent.succeeded` event is selected
- [ ] Webhook secret is correctly set in environment
- [ ] Payment intents include invoice metadata
- [ ] Database has correct `stripe_payment_intent_id` values
- [ ] No firewall blocking Stripe webhooks

## 🛠 **Advanced Debugging**

### **Check Payment Intent Metadata**

In Stripe Dashboard, find a payment intent and verify it has:
```json
{
  "metadata": {
    "invoice_id": "abc123",
    "user_id": "user_abc123",
    "estimate_id": "est_123"
  }
}
```

### **Check Database Consistency**

Run this query to check for mismatched data:
```sql
SELECT 
  id,
  status,
  stripe_payment_intent_id,
  paid_at,
  created_at
FROM invoices 
WHERE status = 'pending' 
  AND stripe_payment_intent_id IS NOT NULL
ORDER BY created_at DESC;
```

### **Monitor Webhook Logs**

Check your application logs for webhook events:
- Look for `🔄 Webhook received` messages
- Check if `payment_intent.succeeded` events are being processed
- Verify no errors in the webhook handler

## 🎯 **Expected Webhook Flow**

1. **User pays invoice** → Stripe processes payment
2. **Payment succeeds** → Stripe sends `payment_intent.succeeded` event
3. **Webhook receives event** → Finds invoice by `stripe_payment_intent_id`
4. **Updates database** → Sets status to 'paid' and `paid_at` timestamp
5. **Creates project** → Automatically creates project from estimate
6. **Sends email** → Confirms payment to customer

## 🚀 **Production Setup Commands**

```bash
# 1. Deploy your app
vercel deploy --prod

# 2. Test webhook endpoint
curl https://your-domain.com/api/webhook-test

# 3. Add webhook in Stripe Dashboard
# URL: https://your-domain.com/api/invoices/webhook
# Events: payment_intent.succeeded

# 4. Test with real payment or Stripe CLI
stripe trigger payment_intent.succeeded

# 5. Verify invoice status updates
curl https://your-domain.com/api/invoices
```

## 🔄 **Immediate Action Items**

1. **Verify webhook URL** in Stripe Dashboard
2. **Check recent webhook deliveries** for errors
3. **Test webhook connectivity** with curl
4. **Run manual sync** to fix existing paid invoices
5. **Monitor logs** during next payment test

---

**Need Help?** Check the webhook logs in your application dashboard or contact support with the specific error messages. 