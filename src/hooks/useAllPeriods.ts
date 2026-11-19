import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { type PeriodData, getPeriodIndex, isValidPeriodId } from '../types';

export interface PeriodRecord {
  id: string;
  year: number;
  month: number;
  half: number;
  /** Linear period number, see getPeriodIndex */
  index: number;
  data: PeriodData;
}

export const toPeriodRecord = (id: string, data: PeriodData): PeriodRecord => {
  const [year, month, half] = id.split('-').map(Number);
  return {
    id,
    year,
    month,
    half,
    index: getPeriodIndex(id),
    data: { bankBalance: data.bankBalance ?? 0, expenses: data.expenses ?? [] },
  };
};

/** Live list of every period for the signed-in user, oldest first. */
export const useAllPeriods = () => {
  const [periods, setPeriods] = useState<PeriodRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubscribe = onSnapshot(
      collection(db, 'users', user.uid, 'periods'),
      (snap) => {
        const records = snap.docs
          .filter((d) => isValidPeriodId(d.id) && !d.data()._deleted)
          .map((d) => toPeriodRecord(d.id, d.data() as PeriodData))
          .sort((a, b) => a.index - b.index);
        setPeriods(records);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading periods:', error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  return { periods, loading };
};
