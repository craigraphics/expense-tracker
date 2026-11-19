import { describe, it, expect } from 'vitest';
import { predictExpenses, normalizeDesc } from './predictExpenses';
import { toPeriodRecord, type PeriodRecord } from '../hooks/useAllPeriods';
import type { Expense, ExpenseCategory } from '../types';

type Row = [desc: string, amount: number, category?: ExpenseCategory];

/** Build a year of periods (2026-1-1 .. through `lastId`) from a generator. */
const buildHistory = (
  rows: (month: number, half: number) => Row[],
  lastMonth = 11,
  lastHalf = 2
): PeriodRecord[] => {
  const periods: PeriodRecord[] = [];
  let id = 1;
  for (let month = 1; month <= 12; month++) {
    for (let half = 1; half <= 2; half++) {
      if (month > lastMonth || (month === lastMonth && half > lastHalf)) break;
      const expenses: Expense[] = rows(month, half).map(([desc, amount, category]) => ({
        id: id++,
        desc,
        amount,
        category: category ?? 'Other',
      }));
      periods.push(toPeriodRecord(`2026-${month}-${half}`, { bankBalance: 0, expenses }));
    }
  }
  return periods;
};

const groceries = [310, 240, 395, 260, 410, 300];

const year2026 = buildHistory((month, half) => {
  const rows: Row[] = [['Rent', 1200, 'Housing']];
  if (half === 2) rows.push(['Internet', 60, 'Utilities']);
  if (half === 1 && month % 2 === 1) rows.push(['Water bill', 45, 'Utilities']);
  if (month === 1 && half === 1) rows.push(['Car insurance', 900, 'Insurance']);
  if (month === 6 && half === 2) rows.push(['New laptop', 1500]);
  if (half === 1 && month <= 9) rows.push(['Streaming', 15, 'Entertainment']);
  rows.push(['Groceries', groceries[(month * 2 + half) % groceries.length], 'Food']);
  return rows;
});

const find = (result: ReturnType<typeof predictExpenses>, key: string) =>
  result.predictions.find((p) => p.key === key);

describe('normalizeDesc', () => {
  it('ignores case, punctuation and extra spaces', () => {
    expect(normalizeDesc('  Car  Insurance! ')).toBe('car insurance');
    expect(normalizeDesc('Rent.')).toBe(normalizeDesc('rent'));
  });
});

describe('predictExpenses', () => {
  it('marks an every-period expense with a stable amount as fixed', () => {
    const rent = find(predictExpenses(year2026, '2026-12-1'), 'rent');
    expect(rent?.tier).toBe('fixed');
    expect(rent?.amount).toBe(1200);
    expect(rent?.cadence).toBe(1);
    expect(rent?.category).toBe('Housing');
  });

  it('predicts 2nd-half-only expenses only for 2nd halves', () => {
    expect(find(predictExpenses(year2026, '2026-12-2'), 'internet')?.tier).toBe('fixed');
    expect(find(predictExpenses(year2026, '2026-12-1'), 'internet')).toBeUndefined();
  });

  it('predicts every-2-months expenses only in matching months', () => {
    // Water is paid in odd months (Jan, Mar, ... Nov), 1st half
    expect(find(predictExpenses(year2026, '2026-12-1'), 'water bill')).toBeUndefined();
    const jan = find(predictExpenses(year2026, '2027-1-1'), 'water bill');
    expect(jan?.tier).toBe('fixed');
    expect(jan?.cadence).toBe(4);
  });

  it('suggests a yearly expense as maybe one year later, across the year boundary', () => {
    const ins = find(predictExpenses(year2026, '2027-1-1'), 'car insurance');
    expect(ins?.tier).toBe('maybe');
    expect(ins?.cadence).toBe(24);
    expect(ins?.reason).toContain('Same period last year');
    expect(find(predictExpenses(year2026, '2026-12-1'), 'car insurance')).toBeUndefined();
  });

  it('marks variable amounts as likely with the median of the last 3 and a range', () => {
    const g = find(predictExpenses(year2026, '2026-12-1'), 'groceries');
    expect(g?.tier).toBe('likely');
    expect(g?.amountRange).toBeDefined();
    expect(g!.amount).toBeGreaterThanOrEqual(g!.amountRange!.min);
    expect(g!.amount).toBeLessThanOrEqual(g!.amountRange!.max);
  });

  it('demotes an expense that stopped appearing to maybe', () => {
    const s = find(predictExpenses(year2026, '2026-12-1'), 'streaming');
    expect(s?.tier).toBe('maybe');
    expect(s?.reason).toContain('missed the last 2 times');
  });

  it('leaves out one-off purchases', () => {
    expect(find(predictExpenses(year2026, '2026-12-1'), 'new laptop')).toBeUndefined();
    expect(find(predictExpenses(year2026, '2026-12-2'), 'new laptop')).toBeUndefined();
  });

  it('ignores empty (auto-created) periods instead of counting them as misses', () => {
    const withEmpty = [
      ...year2026,
      toPeriodRecord('2026-12-1', { bankBalance: 0, expenses: [] }),
    ];
    expect(find(predictExpenses(withEmpty, '2026-12-2'), 'rent')?.hits).toBe(
      find(predictExpenses(year2026, '2026-12-2'), 'rent')?.hits
    );
  });

  it('respects pinned and ignored preferences', () => {
    const result = predictExpenses(year2026, '2026-12-1', {
      pinned: ['new laptop'],
      ignored: ['rent'],
    });
    expect(find(result, 'rent')).toBeUndefined();
    expect(result.ignored).toEqual([{ key: 'rent', desc: 'Rent' }]);
    const laptop = find(result, 'new laptop');
    expect(laptop?.tier).toBe('fixed');
    expect(laptop?.pinned).toBe(true);
  });

  it('only predicts from periods before the target', () => {
    const result = predictExpenses(year2026, '2026-3-1');
    expect(find(result, 'streaming')?.hits).toBe(2);
    expect(result.predictions.every((p) => p.lastSeenPeriodId < '2026-3')).toBe(true);
  });

  it('falls back to copying the last same-half period when history is too short', () => {
    const short = year2026.slice(0, 1); // only 2026-1-1
    const result = predictExpenses(short, '2026-2-1');
    expect(result.usedFallback).toBe(true);
    expect(result.predictions.map((p) => p.key).sort()).toEqual(
      ['car insurance', 'groceries', 'rent', 'streaming', 'water bill']
    );
    expect(result.predictions.every((p) => p.tier === 'likely')).toBe(true);
  });

  it('sorts fixed first, then likely, then maybe', () => {
    const order = { fixed: 0, likely: 1, maybe: 2 };
    const tiers = predictExpenses(year2026, '2027-1-1').predictions.map((p) => order[p.tier]);
    expect(tiers).toEqual([...tiers].sort((a, b) => a - b));
  });
});
