import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { formatPeriodDisplay, getYearFromPeriodId } from '../types';

interface PeriodSelectorProps {
  currentPeriodId: string;
  onPeriodChange: (periodId: string) => void;
  refreshTrigger?: number;
  selectedYear: number;
  onYearsLoaded?: (years: number[]) => void;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  currentPeriodId,
  onPeriodChange,
  refreshTrigger,
  selectedYear,
  onYearsLoaded,
}) => {
  const [periods, setPeriods] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPeriods = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const periodsRef = collection(db, "users", user.uid, "periods");
        const querySnapshot = await getDocs(periodsRef);
        const periodIds = querySnapshot.docs.map(doc => doc.id);

        // Sort periods chronologically (newest first) using numeric comparison
        periodIds.sort((a, b) => {
          const [aYear, aMonth, aHalf] = a.split('-').map(Number);
          const [bYear, bMonth, bHalf] = b.split('-').map(Number);
          if (aYear !== bYear) return bYear - aYear;
          if (aMonth !== bMonth) return bMonth - aMonth;
          return bHalf - aHalf;
        });

        // Ensure current period exists
        if (!periodIds.includes(currentPeriodId)) {
          periodIds.unshift(currentPeriodId);
        }

        setPeriods(periodIds);

        // Report available years to parent
        const years = [...new Set(periodIds.map(getYearFromPeriodId))].sort((a, b) => b - a);
        onYearsLoaded?.(years);
      } catch (error) {
        console.error('Error fetching periods:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPeriods();
  }, [currentPeriodId, refreshTrigger, onYearsLoaded]);

  const filteredPeriods = periods.filter(
    (pid) => getYearFromPeriodId(pid) === selectedYear
  );

  if (loading) {
    return <div className="flex justify-center p-4">Loading periods...</div>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {filteredPeriods.map((periodId) => (
        <button
          key={periodId}
          onClick={() => onPeriodChange(periodId)}
          className={`px-3 py-1.5 text-sm rounded transition-colors ${
            periodId === currentPeriodId
              ? 'bg-[#5e6aba] dark:bg-[#333f8b] text-white'
              : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          {formatPeriodDisplay(periodId)}
        </button>
      ))}
    </div>
  );
};
