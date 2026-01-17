import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { formatPeriodDisplay } from '../types';

interface PeriodSelectorProps {
  currentPeriodId: string;
  onPeriodChange: (periodId: string) => void;
  refreshTrigger?: number; // Add this to force refresh
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  currentPeriodId,
  onPeriodChange,
  refreshTrigger
}) => {
  const [periods, setPeriods] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPeriods = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const periodsRef = collection(db, "users", user.uid, "periods");
        console.log('Fetching periods for user:', user.uid);
        console.log('Collection path:', periodsRef.path);

        const querySnapshot = await getDocs(periodsRef);
        const periodIds = querySnapshot.docs.map(doc => doc.id);

        console.log('Found periods:', periodIds);

        // Sort periods chronologically (newest first)
        periodIds.sort((a, b) => b.localeCompare(a));

        // Ensure current period exists
        const currentExists = periodIds.includes(currentPeriodId);
        if (!currentExists) {
          console.log('Current period does not exist, adding it:', currentPeriodId);
          periodIds.unshift(currentPeriodId);
        }

        setPeriods(periodIds);
      } catch (error) {
        console.error('Error fetching periods:', error);
        console.error('Error details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPeriods();
  }, [currentPeriodId, refreshTrigger]);


  if (loading) {
    return <div className="flex justify-center p-4">Loading periods...</div>;
  }

  return (
    <div className="">
      <div className="flex flex-wrap ">
        {periods.map((periodId) => (
          <button
            key={periodId}
            onClick={() => onPeriodChange(periodId)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              periodId === currentPeriodId
                ? 'text-blue-400 border-blue-400 bg-blue-900/20'
                : 'text-gray-400 border-transparent border-r border-gray-600 hover:text-gray-300 hover:border-b-gray-600'
            }`}
          >
            {formatPeriodDisplay(periodId)}
          </button>
        ))}
      </div>
    </div>
  );
};