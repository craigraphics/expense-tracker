// Authentication configuration
export const AUTH_CONFIG = {
  // Authorized emails from environment variables
  ALLOWED_EMAILS: import.meta.env.VITE_AUTHORIZED_EMAILS
    ? import.meta.env.VITE_AUTHORIZED_EMAILS.split(',').map((email: string) => email.trim())
    : [],

  // App information
  APP_NAME: 'Expense Tracker',
  APP_VERSION: '1.0.0',
};

// Helper function to check if email is allowed
export const isEmailAllowed = (email: string | null): boolean => {
  if (!email) return false;
  return AUTH_CONFIG.ALLOWED_EMAILS.includes(email);
};