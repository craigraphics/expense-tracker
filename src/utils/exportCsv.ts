import type { Expense } from '../types';

export const buildExpensesCsv = (expenses: Expense[]): string => {
  const headers = ['Description', 'Amount', 'Category', 'Paid'];
  const rows = expenses.map((exp) => [
    `"${exp.desc.replace(/"/g, '""')}"`,
    exp.amount.toFixed(2),
    exp.category || '',
    exp.paid ? 'Yes' : 'No',
  ]);
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
};

export const exportExpensesCsv = (expenses: Expense[], periodId: string): void => {
  const csv = buildExpensesCsv(expenses);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `expenses-${periodId}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};
