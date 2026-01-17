import React, { useState } from 'react';
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from '../firebase';
import { isEmailAllowed } from '../config/auth';
import { useToast } from '../hooks/use-toast';

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Debug: Check Firebase auth status
  React.useEffect(() => {
    console.log("Firebase Auth initialized:", !!auth);
    console.log("Current user:", auth.currentUser);
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      console.log("🔥 Starting Google Sign-In...");

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      console.log("✅ Google Sign-In successful!");
      console.log("User:", user.displayName, user.email);

      // Check if email is allowed
      if (!isEmailAllowed(user.email)) {
        console.log("❌ Email not authorized:", user.email);
        toast({
          title: "Access Denied",
          description: `Only authorized email addresses are allowed. Your email: ${user.email}. Please contact the administrator to request access.`,
          variant: "destructive",
        });

        // Sign out the unauthorized user
        await auth.signOut();
        return;
      }

      console.log("✅ Email authorized, proceeding with login");
      onLogin();
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);

      let errorMessage = "Failed to sign in with Google.";

      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = "Sign-in was cancelled.";
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = "Pop-up was blocked by your browser. Please allow pop-ups and try again.";
      } else if (error.code === 'auth/cancelled-popup-request') {
        errorMessage = "Another sign-in is already in progress.";
      }

      toast({
        title: "Login Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 flex flex-col gap-6 max-w-md mx-auto bg-gray-800 rounded-sm shadow-lg">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
        <p className="text-gray-400 text-sm mb-2">
          Sign in with your Google account to access your expense tracker
        </p>
        <p className="text-xs text-amber-400 bg-amber-900/20 px-3 py-1 rounded-sm">
          🔒 Access restricted to authorized email addresses only
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Only configured email addresses can access this application
        </p>
      </div>

      <button
        onClick={signInWithGoogle}
        disabled={loading}
        className="flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 px-6 py-3 rounded-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {loading ? 'Signing in...' : 'Continue with Google'}
      </button>

      <div className="text-center">
        <p className="text-xs text-gray-500">
          Secure authentication powered by Google
        </p>
      </div>
    </div>
  );
};