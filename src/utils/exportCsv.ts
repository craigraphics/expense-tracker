import type { Expense } from '../types';

export const exportExpensesCsv = (expenses: Expense[], periodId: string): void => {
  const headers = ['Description', 'Amount', 'Category'];
  const rows = expenses.map((exp) => [
    `"${exp.desc.replace(/"/g, '""')}"`,
    exp.amount.toFixed(2),
    exp.category || '',
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `expenses-${periodId}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};
