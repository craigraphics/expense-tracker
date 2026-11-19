import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from './firebase';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Toaster } from './components/ui/toaster';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // New periods are set up from predictions (see NewPeriodDialog); nothing is pre-created here.
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-line-strong border-t-accent" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-fg">
      {user ? <Dashboard /> : <Login onLogin={() => {}} />}
      <Toaster />
    </div>
  );
}

export default App;
