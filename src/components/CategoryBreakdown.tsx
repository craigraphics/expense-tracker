import React from 'react';
import { PiggyBank } from 'lucide-react';
import type { Expense, ExpenseCategory } from '../types';
import { formatCurrency } from '../utils/formatCurrency';
import { categoryColor } from '../utils/chartColors';
import { Card, CardHeader, CategoryDot } from './ui/primitives';

/** Where this period's money goes, by category (savings shown separately). */
export const CategoryBreakdown: React.FC<{ expenses: Expense[] }> = ({ expenses }) => {
  const totals = new Map<ExpenseCategory, number>();
  let savings = 0;
  for (const e of expenses) {
    const cat = e.category || 'Other';
    if (cat === 'Savings') savings += e.amount;
    else totals.set(cat, (totals.get(cat) ?? 0) + e.amount);
  }
  const rows = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const spent = rows.reduce((s, [, v]) => s + v, 0);

  return (
    <Card>
      <CardHeader title="Where it goes" subtitle={spent > 0 ? `${formatCurrency(spent)} in spending` : undefined} />
      {rows.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-fg-3">Nothing to break down yet.</p>
      ) : (
        <div className="px-5 pb-4">
          {/* Composition strip */}
          <div className="mb-4 flex h-2 gap-0.5 overflow-hidden rounded-full">
            {rows.map(([cat, value]) => (
              <div
                key={cat}
                title={`${cat}: ${formatCurrency(value)}`}
                style={{ width: `${(value / spent) * 100}%`, backgroundColor: categoryColor(cat) }}
              />
            ))}
          </div>
          <ul className="space-y-2.5">
            {rows.map(([cat, value]) => {
              const pct = (value / spent) * 100;
              return (
                <li key={cat} className="flex items-center gap-2.5 text-sm">
                  <CategoryDot category={cat} />
                  <span className="min-w-0 flex-1 truncate text-fg-2">{cat}</span>
                  <span className="num w-9 text-right text-xs text-fg-3">{Math.round(pct)}%</span>
                  <span className="num w-24 text-right font-medium text-fg">{formatCurrency(value)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {savings > 0 && (
        <div className="flex items-center gap-2.5 border-t border-line px-5 py-3 text-sm">
          <PiggyBank className="h-4 w-4 text-fg-3" />
          <span className="flex-1 text-fg-2">Set aside to savings</span>
          <span className="num font-medium text-fg">{formatCurrency(savings)}</span>
        </div>
      )}
    </Card>
  );
};
