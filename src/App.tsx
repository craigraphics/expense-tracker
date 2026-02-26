import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, collection, getDocs, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Toaster } from './components/ui/toaster';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize theme from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        const currentYear = new Date().getFullYear();
        const templateIds = [`${currentYear}-1-1`, `${currentYear}-1-2`];
        const periodsRef = collection(db, "users", currentUser.uid, "periods");
        const snapshot = await getDocs(periodsRef);
        const existingIds = new Set(snapshot.docs.map(d => d.id));

        for (const id of templateIds) {
          if (!existingIds.has(id)) {
            await setDoc(doc(db, "users", currentUser.uid, "periods", id), { bankBalance: 0, expenses: [] });
          }
        }
      }
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      {user ? <Dashboard /> : <Login onLogin={() => {}} />}
      <Toaster />
    </div>
  );
}

export default App;
