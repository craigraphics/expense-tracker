import type { ExpenseCategory } from '../types';

/**
 * One color per category, used for dots, bars and chart series.
 * No reds, greens or purples: red and green mean money status, so a category must never read as one.
 * Every color sits at least 13 ΔE (OKLab ×100) from the status red/green in both themes, and is
 * always shown next to its name, so identity never depends on color alone.
 */
export const CHART_COLORS: Record<ExpenseCategory, string> = {
  Housing: '#3475c4',
  Food: '#dabc43',
  Transport: '#71bae9',
  Utilities: '#2a9cae',
  Entertainment: '#a8488d',
  Health: '#dbadd0',
  Insurance: '#395487',
  Savings: '#5ebdb9',
  'Family Support': '#c68128',
  'Debt/Payments': '#7a5341',
  Other: '#8b939f',
};

export const categoryColor = (category: string | undefined): string =>
  CHART_COLORS[(category || 'Other') as ExpenseCategory] ?? CHART_COLORS.Other;
