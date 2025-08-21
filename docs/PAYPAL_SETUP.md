# PayPal Sandbox Setup Guide

## Issue Resolution: "You are logging into the account of the seller"

The error you encountered occurs when using a **Business account** as a buyer in PayPal sandbox. Here's how to fix it:

### 1. Create Separate Test Accounts

In your [PayPal Developer Dashboard](https://developer.paypal.com/developer/accounts/):

1. **Seller Account (Business)**: Already created

   - Type: Business
   - Used for receiving payments
   - Your current account credentials

2. **Buyer Account (Personal)**: Create new
   - Type: Personal
   - Used for making test purchases
   - **Must have different credentials**

### 2. Update Environment Variables

Replace your current buyer credentials:

```bash
# ❌ Wrong - Business account used as buyer
PAYPAL_SANDBOX_BUYER_EMAIL=sb-jmneu45410698@business.example.com
PAYPAL_SANDBOX_BUYER_PASSWORD=G?L4et4s

# ✅ Correct - Personal account for buyer
PAYPAL_SANDBOX_BUYER_EMAIL=sb-xyz123@personal.example.com
PAYPAL_SANDBOX_BUYER_PASSWORD=NewPassword123
```

### 3. Test Account Requirements

**Business Account (Seller)**:

- ✅ Receives payments
- ✅ API credentials (Client ID, Secret)
- ❌ Cannot be used for buyer testing

**Personal Account (Buyer)**:

- ✅ Makes test purchases
- ✅ Used in E2E tests
- ❌ Cannot receive API payments

### 4. Verification Steps

1. Log into [PayPal Sandbox](https://www.sandbox.paypal.com)
2. Use **Personal account** credentials
3. Verify account shows "Personal" type
4. Test a purchase flow

### 5. E2E Test Modes

Our E2E tests now support two modes:

**CI Mode (Automatic)**:

```bash
CI=true # Automatically mocks PayPal endpoints
```

**Local Real PayPal**:

```bash
# Requires correct sandbox credentials
PAYPAL_CLIENT_ID=your_business_client_id
PAYPAL_SECRET=your_business_secret
PAYPAL_ENV=sandbox
PAYPAL_SANDBOX_BUYER_EMAIL=your_personal_buyer_email
PAYPAL_SANDBOX_BUYER_PASSWORD=your_personal_buyer_password
```

**Local Mock Mode**:

```bash
PAYPAL_E2E_MODE=mock # Forces mocking even locally
```

## Common Issues

### Issue: "Cannot pay self"

- **Cause**: Using same account for buyer and seller
- **Fix**: Create separate Personal account for buyer

### Issue: "Account type mismatch"

- **Cause**: Business account used as buyer
- **Fix**: Use Personal account for purchases

### Issue: "Invalid credentials"

- **Cause**: Credentials don't match account type
- **Fix**: Verify account type in PayPal Dashboard

## Test Flow Verification

1. **Registration Flow**: `/events` → `/events/[id]` → `/events/[id]/register` → Thanks page
2. **Purchase Bridge**: Thanks page shows purchase CTA when `showPurchase=true`
3. **Direct Purchase**: `/events/[id]` → "Buy Tickets" button → `/events/[id]/purchase`

The navigation now follows [best practices](https://add-to-calendar-pro.com/articles/event-registration-best-practices) for event ticketing UX.
