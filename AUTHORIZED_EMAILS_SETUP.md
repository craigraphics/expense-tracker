# 🔐 Authorized Emails Configuration

## 🚀 How to Configure Allowed Email Addresses

### Step 1: Edit the Configuration File
Open `src/config/auth.ts` and replace the placeholder email with your actual email:

```typescript
export const AUTH_CONFIG = {
  ALLOWED_EMAILS: [
    'your-actual-email@gmail.com', // Replace this with your real email
    // Add more emails if needed:
    // 'colleague@example.com',
    // 'another-user@company.com',
  ],
};
```

### Step 2: Restart Your Application
```bash
# Stop the current dev server (Ctrl+C)
# Then restart
pnpm run dev
```

### Step 3: Test the Authentication
1. Try logging in with your configured email → ✅ Should work
2. Try logging in with any other email → ❌ Should be denied

---

## 🔒 Security Features

### What Happens:
- ✅ **Allowed emails**: Proceed with normal login
- ❌ **Unauthorized emails**: Automatically signed out with error message
- 🔐 **Secure**: No access to app data for unauthorized users

### Error Messages:
- **Authorized users**: Normal login flow
- **Unauthorized users**: "Access denied. Only authorized email addresses are allowed."

---

## 👥 Adding Multiple Users

To allow multiple people access:

```typescript
ALLOWED_EMAILS: [
  'user1@gmail.com',
  'user2@company.com',
  'admin@example.com',
],
```

---

## 🔧 Configuration Structure

```
src/
├── config/
│   └── auth.ts          # ← Edit this file
├── components/
│   └── Login.tsx        # ← Uses the config
└── ...
```

---

## 📧 Changing Authorized Emails

1. **Edit** `src/config/auth.ts`
2. **Save** the file
3. **Restart** the dev server
4. **Test** with the new email(s)

---

## ⚠️ Important Notes

- **Case sensitive**: Emails must match exactly
- **No wildcards**: Each email must be listed individually
- **Google accounts only**: Only works with Google SSO
- **Real-time**: Changes take effect immediately after restart

---

## 🎯 Current Setup

**Default configuration** allows only `'your-email@gmail.com'` (placeholder).

**Action required:** Replace with your actual email address in `src/config/auth.ts`!