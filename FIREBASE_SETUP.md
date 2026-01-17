# Firebase Phone Authentication Setup

## Issue: Not receiving SMS codes?

If you're not receiving SMS verification codes, here's how to fix it:

### 1. Enable Phone Authentication in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`expense-tracker-2ad6e`)
3. Go to **Authentication** → **Sign-in method**
4. Find **Phone** in the provider list
5. Click **Enable** and save

### 2. Configure Test Phone Numbers (for Development)

Since you're in development, Firebase requires test phone numbers:

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Scroll down to **Phone numbers for testing**
3. Add test phone numbers like:
   - Phone: `+1 650-555-3434`
   - Verification Code: `123456`

### 3. Verify reCAPTCHA Configuration

The app uses invisible reCAPTCHA. Make sure:
- Your domain is added to authorized domains in Firebase Console
- No ad blockers are interfering with reCAPTCHA

### 4. Common Issues & Solutions

#### "auth/missing-client-configuration"
- Phone authentication is not enabled in Firebase Console

#### "auth/captcha-check-failed"
- reCAPTCHA is being blocked
- Try disabling ad blockers temporarily

#### "auth/quota-exceeded"
- Too many SMS requests
- Wait a few hours or use test phone numbers

#### "auth/invalid-phone-number"
- Phone number format must be: `+1234567890`
- Include country code with `+` prefix

### 5. Test Phone Numbers to Try

Use these test numbers (configure them in Firebase Console first):

- `+1 650-555-3434` → Code: `123456`
- `+1 650-555-3435` → Code: `654321`

### 6. Production Setup

For production, you need to:
1. Verify your domain in Firebase Console
2. Set up billing (required for phone auth in production)
3. Remove test phone numbers

## Still having issues?

1. Check browser console for detailed error messages
2. Verify Firebase configuration matches your project
3. Test with the exact phone number format: `+1234567890`