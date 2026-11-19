import { useEffect, useState } from 'react';
import { arrayRemove, arrayUnion, doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { setDoc, isReadOnlyError } from '../firestoreWrites';
import type { PredictionPrefs } from '../utils/predictExpenses';

const prefsRef = (uid: string) => doc(db, 'users', uid, 'settings', 'predictions');

/** Pinned ("always include") and ignored ("never suggest") expense keys, synced live. */
export const usePredictionPrefs = () => {
  const [prefs, setPrefs] = useState<PredictionPrefs>({ pinned: [], ignored: [] });

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const unsubscribe = onSnapshot(
      prefsRef(user.uid),
      (snap) => {
        const data = snap.data();
        setPrefs({ pinned: data?.pinned ?? [], ignored: data?.ignored ?? [] });
      },
      (error) => console.error('Error loading prediction preferences:', error)
    );
    return () => unsubscribe();
  }, []);

  const write = async (update: Record<string, unknown>) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await setDoc(prefsRef(user.uid), update, { merge: true });
    } catch (error) {
      if (!isReadOnlyError(error)) console.error('Error saving prediction preferences:', error);
    }
  };

  const pin = (key: string) => write({ pinned: arrayUnion(key), ignored: arrayRemove(key) });
  const ignore = (key: string) => write({ ignored: arrayUnion(key), pinned: arrayRemove(key) });
  const reset = (key: string) => write({ pinned: arrayRemove(key), ignored: arrayRemove(key) });

  return { prefs, pin, ignore, reset };
};
