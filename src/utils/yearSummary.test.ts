import { describe, it, expect } from 'vitest';
import { summarizeYear } from './yearSummary';
import { toPeriodRecord } from '../hooks/useAllPeriods';
import type { Expense } from '../types';

let nextId = 1;
const period = (id: string, rows: Array<[string, number, Expense['category']]>) =>
  toPeriodRecord(id, {
    bankBalance: 0,
    expenses: rows.map(([desc, amount, category]) => ({ id: nextId++, desc, amount, category })),
  });

const periods = [
  period('2025-12-1', [['Rent', 1000, 'Housing'], ['Groceries', 200, 'Food']]),
  period('2025-12-2', [['Rent', 1000, 'Housing'], ['Groceries', 200, 'Food']]),
  period('2026-1-1', [['Rent', 1200, 'Housing'], ['Groceries', 300, 'Food'], ['Savings', 500, 'Savings']]),
  period('2026-1-2', [['Rent', 1200, 'Housing'], ['Gym', 40, 'Health']]),
  period('2026-2-1', [['Rent', 1200, 'Housing'], ['gym', 40, 'Health'], ['Savings', 500, 'Savings']]),
  period('2026-2-2', [['Rent', 1200, 'Housing'], ['Gym!', 40, 'Health']]),
  period('2026-3-1', []), // auto-created empty period
];

describe('summarizeYear', () => {
  const s = summarizeYear(periods, 2026);

  it('totals spending without savings, and savings separately', () => {
    expect(s.periodCount).toBe(4);
    expect(s.totalSpent).toBe(1200 * 4 + 300 + 40 * 3);
    expect(s.totalSaved).toBe(1000);
  });

  it('averages per half of the month', () => {
    expect(s.avgFirstHalf).toBe((1500 + 1240) / 2);
    expect(s.avgSecondHalf).toBe((1240 + 1240) / 2);
  });

  it('groups by month and half', () => {
    expect(s.byMonth[0]).toMatchObject({ label: 'Jan', firstHalf: 1500, secondHalf: 1240, saved: 500 });
    expect(s.byMonth[1]).toMatchObject({ label: 'Feb', firstHalf: 1240, secondHalf: 1240, saved: 500 });
    expect(s.byMonth[2]).toMatchObject({ firstHalf: 0, secondHalf: 0 });
  });

  it('compares categories per period against the previous year', () => {
    const housing = s.byCategory.find((c) => c.category === 'Housing')!;
    expect(housing.perPeriod).toBe(1200);
    expect(housing.prevPerPeriod).toBe(1000);
    expect(housing.change).toBeCloseTo(0.2);
    const health = s.byCategory.find((c) => c.category === 'Health')!;
    expect(health.change).toBeNull(); // nothing to compare with
    expect(s.byCategory.some((c) => c.category === 'Savings')).toBe(false);
    expect(s.prevYear).toEqual({ periodCount: 2, totalSpent: 2400, perPeriod: 1200 });
  });

  it('lists top expenses matched by normalized description', () => {
    expect(s.topExpenses[0]).toMatchObject({ desc: 'Rent', total: 4800, count: 4 });
    expect(s.topExpenses.find((t) => t.desc.toLowerCase().startsWith('gym'))).toMatchObject({ total: 120, count: 3 });
  });

  it('finds new recurring expenses', () => {
    expect(s.newRecurring).toEqual(['Gym!']);
  });

  it('handles a year without a previous one', () => {
    const first = summarizeYear(periods, 2025);
    expect(first.prevYear).toBeNull();
    expect(first.spentChange).toBeNull();
    expect(first.newRecurring).toEqual([]);
  });
});
