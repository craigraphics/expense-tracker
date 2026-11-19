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

export interface Expense {
  id: number;
  desc: string;
  amount: number;
  category?: ExpenseCategory;
  paid?: boolean;
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

// Linear index of a period: consecutive periods differ by 1, across year boundaries too
export const getPeriodIndex = (periodId: string): number => {
  const [year, month, half] = periodId.split('-').map(Number);
  return year * 24 + (month - 1) * 2 + (half - 1);
};

export const periodIdFromIndex = (index: number): string => {
  const year = Math.floor(index / 24);
  const rem = index - year * 24;
  const month = Math.floor(rem / 2) + 1;
  const half = (rem % 2) + 1;
  return `${year}-${month}-${half}`;
};

export const getNextPeriodId = (periodId: string): string =>
  periodIdFromIndex(getPeriodIndex(periodId) + 1);

export const isValidPeriodId = (periodId: string): boolean =>
  /^\d{4}-(1[0-2]|[1-9])-[12]$/.test(periodId);

// Helper to extract year from period ID
export const getYearFromPeriodId = (periodId: string): number => {
  return Number(periodId.split('-')[0]);
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

// Long format including the year, e.g. "Jan 1st 2027"
export const formatPeriodWithYear = (periodId: string): string =>
  `${formatPeriodDisplay(periodId)} ${getYearFromPeriodId(periodId)}`;

// Unique-enough numeric ids for new expenses (offset keeps ids distinct within one batch)
export const newExpenseId = (offset = 0): number => Date.now() + offset;
