export interface Expense {
  id: number;
  desc: string;
  amount: number;
}

export interface PeriodData {
  bankBalance: number;
  expenses: Expense[];
}

// Helper to determine the doc ID (e.g. "2024-5-1")
export const getPeriodId = (date?: Date): string => {
  const targetDate = date || new Date();
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1; // 0-indexed
  const half = targetDate.getDate() <= 15 ? '1' : '2';
  return `${year}-${month}-${half}`;
};

// Helper to get previous period ID
export const getPreviousPeriodId = (currentPeriodId: string): string => {
  const [year, month, half] = currentPeriodId.split('-').map(Number);
  let prevYear = year;
  let prevMonth = month;
  let prevHalf = half === 1 ? 2 : 1;

  if (half === 1) {
    // Go to previous month, second half
    if (prevMonth === 1) {
      prevMonth = 12;
      prevYear = year - 1;
    } else {
      prevMonth = prevMonth - 1;
    }
  }

  return `${prevYear}-${prevMonth}-${prevHalf}`;
};

// Helper to get the January template period for the current year and half
export const getJanuaryTemplatePeriodId = (targetPeriodId: string): string => {
  const [year, , half] = targetPeriodId.split('-');
  return `${year}-1-${half}`; // January of current year, same half
};

// Helper to format period ID for display (short format for tabs)
export const formatPeriodDisplay = (periodId: string): string => {
  const [, month, half] = periodId.split('-').map(Number);
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const halfText = half === 1 ? '1st' : '2nd';
  return `${monthNames[month - 1]} ${halfText}`;
};