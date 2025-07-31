# Stripe Integration Setup Guide

## Overview
This guide covers the secure implementation of Stripe billing and subscription management for the SaaS platform.

## Security Features Implemented

### 1. **Webhook Signature Verification**
- All webhook events are verified using Stripe's signature verification
- Prevents webhook spoofing and replay attacks
- Uses `STRIPE_WEBHOOK_SECRET` for verification

### 2. **Comprehensive Logging**
- All billing events are logged with structured data
- Audit trail for compliance and debugging
- Security events are logged separately

### 3. **Error Handling**
- Graceful error handling for all Stripe operations
- Detailed error logging for debugging
- User-friendly error messages

### 4. **Data Validation**
- Input validation for all billing endpoints
- Tenant isolation for security
- Permission-based access control

## Environment Variables

Add these to your `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe Price IDs (create these in your Stripe dashboard)
STRIPE_BASIC_PRICE_ID=price_basic_monthly
STRIPE_PRO_PRICE_ID=price_pro_monthly
STRIPE_ENTERPRISE_PRICE_ID=price_enterprise_monthly
```

## Stripe Dashboard Setup

### 1. Create Products and Prices

1. Go to your Stripe Dashboard
2. Navigate to Products > Add Product
3. Create three products:
   - **Basic Plan** ($0/month)
   - **Pro Plan** ($29/month)
   - **Enterprise Plan** ($99/month)

### 2. Set Up Webhooks

1. Go to Developers > Webhooks
2. Add endpoint: `https://your-domain.com/billing/webhook`
3. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### 3. Get Webhook Secret

1. After creating the webhook, click on it
2. Copy the signing secret
3. Add it to your `.env` file as `STRIPE_WEBHOOK_SECRET`

## API Endpoints

### Billing Management

```typescript
// Create checkout session
POST /billing/create-checkout-session
{
  "priceId": "price_pro_monthly",
  "successUrl": "https://your-app.com/success",
  "cancelUrl": "https://your-app.com/cancel"
}

// Create billing portal session
POST /billing/create-portal-session
{
  "returnUrl": "https://your-app.com/billing"
}

// Cancel subscription
POST /billing/cancel-subscription

// Get subscription details
GET /billing/subscription-details

// Get plan limits
GET /billing/limits

// Get invoices
GET /billing/invoices
```

### Webhook Endpoint

```typescript
// Stripe webhook (handles all billing events)
POST /billing/webhook
```

## Database Schema Updates

The following fields have been added to support Stripe:

### Tenant Table
- `stripeCustomerId`: Stripe customer ID

### Subscription Table
- `stripeSubscriptionId`: Stripe subscription ID
- `stripePriceId`: Stripe price ID

### Invoice Table
- `stripeInvoiceId`: Stripe invoice ID

## Security Best Practices

### 1. **Environment Variables**
- Never commit Stripe keys to version control
- Use different keys for development and production
- Rotate keys regularly

### 2. **Webhook Security**
- Always verify webhook signatures
- Use HTTPS for webhook endpoints
- Implement idempotency for webhook handlers

### 3. **Data Protection**
- Encrypt sensitive billing data
- Implement proper access controls
- Log all billing operations

### 4. **Error Handling**
- Don't expose internal errors to users
- Log errors for debugging
- Implement retry logic for failed operations

## Testing

### 1. **Test Cards**
Use these test card numbers:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Insufficient funds: `4000 0000 0000 9995`

### 2. **Webhook Testing**
- Use Stripe CLI for local testing
- Test all webhook events
- Verify signature verification

## Monitoring and Logging

### 1. **Stripe Dashboard**
- Monitor payment success/failure rates
- Track subscription metrics
- Set up alerts for failed payments

### 2. **Application Logs**
- All billing events are logged
- Security events are flagged
- Error tracking for debugging

### 3. **Audit Trail**
- Complete audit trail for compliance
- Track all billing operations
- User action logging

## Production Checklist

- [ ] Set up production Stripe account
- [ ] Configure webhook endpoints
- [ ] Set up monitoring and alerts
- [ ] Test all billing flows
- [ ] Implement error handling
- [ ] Set up backup and recovery
- [ ] Configure security headers
- [ ] Set up SSL certificates
- [ ] Test webhook signature verification
- [ ] Monitor payment success rates

## Troubleshooting

### Common Issues

1. **Webhook signature verification fails**
   - Check `STRIPE_WEBHOOK_SECRET`
   - Verify webhook endpoint URL
   - Check request body format

2. **Subscription not created**
   - Check Stripe customer ID
   - Verify price ID exists
   - Check webhook event handling

3. **Payment fails**
   - Check card details
   - Verify Stripe account status
   - Check webhook event logs

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
LOG_LEVEL=debug
```

## Support

For Stripe-specific issues:
- Check Stripe documentation
- Contact Stripe support
- Review Stripe dashboard logs

For application issues:
- Check application logs
- Review audit trail
- Test with Stripe test mode 