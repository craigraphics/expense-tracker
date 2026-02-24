export const EXPENSE_CATEGORIES = [
  'Housing',
  'Food',
  'Transport',
  'Utilities',
  'Entertainment',
  'Health',
  'Insurance',
  'Savings',
  'Family Support',
  'Debt/Payments',
  'Other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const CATEGORY_COLORS: Record<ExpenseCategory, { bg: string; text: string; border: string }> = {
  Housing: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700' },
  Food: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-300 dark:border-green-700' },
  Transport: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-300 dark:border-yellow-700' },
  Utilities: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-300 dark:border-purple-700' },
  Entertainment: { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-300 dark:border-pink-700' },
  Health: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-300 dark:border-red-700' },
  Insurance: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-300 dark:border-indigo-700' },
  Savings: { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-300 dark:border-teal-700' },
  'Family Support': { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-700' },
  'Debt/Payments': { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-300 dark:border-rose-700' },
  Other: { bg: 'bg-gray-100 dark:bg-gray-900/30', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-300 dark:border-gray-600' },
};

export interface Expense {
  id: number;
  desc: string;
  amount: number;
  category?: ExpenseCategory;
}

export interface PeriodData {
  bankBalance: number;
  expenses: Expense[];
}

// Validation constants
export const VALIDATION = {
  DESC_MAX_LENGTH: 100,
  AMOUNT_MIN: 0.01,
  AMOUNT_MAX: 999999.99,
  BALANCE_MAX: 999999.99,
} as const;

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
  const prevHalf = half === 1 ? 2 : 1;

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
