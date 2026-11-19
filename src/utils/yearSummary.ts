import { EXPENSE_CATEGORIES, type ExpenseCategory } from '../types';
import type { PeriodRecord } from '../hooks/useAllPeriods';
import { normalizeDesc } from './predictExpenses';

export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface MonthSummary {
  month: number;
  label: string;
  firstHalf: number;
  secondHalf: number;
  saved: number;
}

export interface CategorySummary {
  category: ExpenseCategory;
  total: number;
  /** Average per tracked period this year */
  perPeriod: number;
  /** Average per tracked period in the previous year, null without data */
  prevPerPeriod: number | null;
  /** Change of the per-period average vs the previous year, e.g. 0.12 = +12% */
  change: number | null;
}

export interface YearSummary {
  year: number;
  periodCount: number;
  totalSpent: number;
  totalSaved: number;
  avgFirstHalf: number;
  avgSecondHalf: number;
  /** Previous year's spending per period, for a like-for-like comparison of partial years */
  prevYear: { periodCount: number; totalSpent: number; perPeriod: number } | null;
  /** Change of spending per period vs the previous year */
  spentChange: number | null;
  byMonth: MonthSummary[];
  byCategory: CategorySummary[];
  topExpenses: TopExpense[];
  /** Expenses first seen this year that showed up in at least 3 periods */
  newRecurring: string[];
}

const isSaving = (category: ExpenseCategory | undefined) => category === 'Savings';

const tracked = (periods: PeriodRecord[], year: number) =>
  periods.filter((p) => p.year === year && p.data.expenses.length > 0);

const spentByCategory = (periods: PeriodRecord[]) => {
  const totals: Partial<Record<ExpenseCategory, number>> = {};
  for (const p of periods) {
    for (const e of p.data.expenses) {
      const cat = e.category || 'Other';
      totals[cat] = (totals[cat] ?? 0) + e.amount;
    }
  }
  return totals;
};

const spentIn = (p: PeriodRecord) =>
  p.data.expenses.reduce((s, e) => s + (isSaving(e.category) ? 0 : e.amount), 0);

const change = (current: number, previous: number | null) =>
  previous && previous > 0 ? (current - previous) / previous : null;

export type TopExpense = { desc: string; category: ExpenseCategory; total: number; count: number };

/** Biggest expenses (excluding savings) across periods, matched by normalized description. */
export const topExpensesOf = (periods: PeriodRecord[], limit = 5): TopExpense[] => {
  const byKey = new Map<string, { desc: string; category: ExpenseCategory; total: number; periods: Set<string> }>();
  for (const p of periods) {
    for (const e of p.data.expenses) {
      if (isSaving(e.category)) continue;
      const key = normalizeDesc(e.desc);
      if (!key) continue;
      const entry = byKey.get(key) ?? { desc: e.desc.trim(), category: e.category || 'Other', total: 0, periods: new Set() };
      entry.total += e.amount;
      entry.periods.add(p.id);
      entry.desc = e.desc.trim();
      entry.category = e.category || 'Other';
      byKey.set(key, entry);
    }
  }
  return [...byKey.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
    .map(({ desc, category, total, periods: ps }) => ({ desc, category, total, count: ps.size }));
};

export const summarizeYear = (periods: PeriodRecord[], year: number): YearSummary => {
  const current = tracked(periods, year);
  const previous = tracked(periods, year - 1);
  const periodCount = current.length;

  const totalSpent = current.reduce((s, p) => s + spentIn(p), 0);
  const totalSaved = current.reduce(
    (s, p) => s + p.data.expenses.reduce((t, e) => t + (isSaving(e.category) ? e.amount : 0), 0),
    0
  );

  const halves = (half: number) => current.filter((p) => p.half === half);
  const avg = (list: PeriodRecord[]) =>
    list.length ? list.reduce((s, p) => s + spentIn(p), 0) / list.length : 0;

  const prevTotalSpent = previous.reduce((s, p) => s + spentIn(p), 0);
  const prevYear = previous.length
    ? { periodCount: previous.length, totalSpent: prevTotalSpent, perPeriod: prevTotalSpent / previous.length }
    : null;
  const perPeriod = periodCount ? totalSpent / periodCount : 0;

  const byMonth: MonthSummary[] = MONTH_NAMES.map((label, i) => {
    const month = i + 1;
    const inMonth = current.filter((p) => p.month === month);
    const half = (h: number) => inMonth.filter((p) => p.half === h).reduce((s, p) => s + spentIn(p), 0);
    const saved = inMonth.reduce(
      (s, p) => s + p.data.expenses.reduce((t, e) => t + (isSaving(e.category) ? e.amount : 0), 0),
      0
    );
    return { month, label, firstHalf: half(1), secondHalf: half(2), saved };
  });

  const catNow = spentByCategory(current);
  const catPrev = spentByCategory(previous);
  const byCategory: CategorySummary[] = EXPENSE_CATEGORIES
    .filter((cat) => cat !== 'Savings' && catNow[cat])
    .map((category) => {
      const total = catNow[category] ?? 0;
      const catPerPeriod = periodCount ? total / periodCount : 0;
      const prevPerPeriod = previous.length ? (catPrev[category] ?? 0) / previous.length : null;
      return { category, total, perPeriod: catPerPeriod, prevPerPeriod, change: change(catPerPeriod, prevPerPeriod) };
    })
    .sort((a, b) => b.total - a.total);

  const topExpenses = topExpensesOf(current);

  // New recurring: never seen in earlier years, seen in 3+ periods this year
  const seenBefore = new Set<string>();
  for (const p of periods) {
    if (p.year >= year) continue;
    for (const e of p.data.expenses) seenBefore.add(normalizeDesc(e.desc));
  }
  const allKeysThisYear = new Map<string, { desc: string; count: number }>();
  for (const p of current) {
    const seenInPeriod = new Set<string>();
    for (const e of p.data.expenses) {
      const key = normalizeDesc(e.desc);
      if (!key || seenInPeriod.has(key)) continue;
      seenInPeriod.add(key);
      const entry = allKeysThisYear.get(key) ?? { desc: e.desc.trim(), count: 0 };
      entry.count += 1;
      entry.desc = e.desc.trim(); // latest spelling
      allKeysThisYear.set(key, entry);
    }
  }
  const hasEarlierData = periods.some((p) => p.year < year && p.data.expenses.length > 0);
  const newRecurring = hasEarlierData
    ? [...allKeysThisYear.entries()]
        .filter(([key, v]) => v.count >= 3 && !seenBefore.has(key))
        .map(([, v]) => v.desc)
        .sort((a, b) => a.localeCompare(b))
    : [];

  return {
    year,
    periodCount,
    totalSpent,
    totalSaved,
    avgFirstHalf: avg(halves(1)),
    avgSecondHalf: avg(halves(2)),
    prevYear,
    spentChange: change(perPeriod, prevYear?.perPeriod ?? null),
    byMonth,
    byCategory,
    topExpenses,
    newRecurring,
  };
};
