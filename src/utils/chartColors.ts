import type { ExpenseCategory } from '../types';

/**
 * One color per category, used for dots, bars and chart series.
 * Hues are spread so neighbors stay distinguishable (Health is teal, not a second red).
 */
export const CHART_COLORS: Record<ExpenseCategory, string> = {
  Housing: '#3b82f6',
  Food: '#22c55e',
  Transport: '#eab308',
  Utilities: '#a855f7',
  Entertainment: '#ec4899',
  Health: '#14b8a6',
  Insurance: '#6366f1',
  Savings: '#06b6d4',
  'Family Support': '#f97316',
  'Debt/Payments': '#ef4444',
  Other: '#94a3b8',
};

export const categoryColor = (category: string | undefined): string =>
  CHART_COLORS[(category || 'Other') as ExpenseCategory] ?? CHART_COLORS.Other;
