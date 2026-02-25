import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { auth, db } from '../firebase';
import type { PeriodData } from '../types';
import { EXPENSE_CATEGORIES } from '../types';
import { CHART_COLORS } from '../utils/chartColors';
import { formatCurrency } from '../utils/formatCurrency';

interface PeriodStat {
  id: string;
  label: string;
  year: number;
  month: number;
  half: number;
  total: number;
  byCategory: Record<string, number>;
}

const TOOLTIP_STYLE = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '4px',
  color: '#1f2937',
  fontSize: '12px',
  fontWeight: '500' as const,
  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
};

const yFmt = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`;

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function periodLabel(id: string): string {
  const [, month, half] = id.split('-').map(Number);
  return `${MONTH_NAMES[month - 1]} ${half === 1 ? '1st' : '2nd'}`;
}

export const Analytics: React.FC = () => {
  const [periods, setPeriods] = useState<PeriodStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    getDocs(collection(db, 'users', user.uid, 'periods')).then((snap) => {
      const stats: PeriodStat[] = [];

      snap.docs.forEach((d) => {
        const [yearStr, monthStr, halfStr] = d.id.split('-');
        const year = Number(yearStr);
        const month = Number(monthStr);
        const half = Number(halfStr);
        if (isNaN(year) || isNaN(month) || isNaN(half)) return;

        const pd = d.data() as PeriodData;
        const byCategory: Record<string, number> = {};
        let total = 0;
        for (const exp of pd.expenses) {
          const cat = exp.category || 'Other';
          // Exclude Savings and Future Expenses from totals (like Dashboard does)
          if (cat !== 'Savings') {
            byCategory[cat] = (byCategory[cat] || 0) + exp.amount;
            total += exp.amount;
          } else {
            // Still track Savings separately for reference
            byCategory[cat] = (byCategory[cat] || 0) + exp.amount;
          }
        }

        stats.push({
          id: d.id,
          label: periodLabel(d.id),
          year,
          month,
          half,
          total,
          byCategory,
        });
      });

      stats.sort((a, b) =>
        a.year !== b.year ? a.year - b.year :
        a.month !== b.month ? a.month - b.month :
        a.half - b.half
      );

      setPeriods(stats);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500 dark:text-gray-400">
        Loading analytics…
      </div>
    );
  }

  if (periods.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500 dark:text-gray-400">
        No period data found.
      </div>
    );
  }

  // Derived data
  const firstHalves = periods.filter(p => p.half === 1);
  const secondHalves = periods.filter(p => p.half === 2);

  const avg1st = firstHalves.length > 0
    ? firstHalves.reduce((s, p) => s + p.total, 0) / firstHalves.length
    : 0;
  const avg2nd = secondHalves.length > 0
    ? secondHalves.reduce((s, p) => s + p.total, 0) / secondHalves.length
    : 0;

  const highest = periods.reduce((a, b) => a.total >= b.total ? a : b);
  const lowest = periods.reduce((a, b) => a.total <= b.total ? a : b);

  // All-time by category
  const allCategoryTotals: Record<string, number> = {};
  for (const p of periods) {
    for (const [cat, amt] of Object.entries(p.byCategory)) {
      allCategoryTotals[cat] = (allCategoryTotals[cat] || 0) + amt;
    }
  }
  const categoryChartData = EXPENSE_CATEGORIES
    .filter(cat => allCategoryTotals[cat] && cat !== 'Savings')
    .map(cat => ({ name: cat, total: allCategoryTotals[cat] }))
    .sort((a, b) => b.total - a.total);

  // Stacked bar chart data helpers
  const makeStackedData = (subset: PeriodStat[]) =>
    subset.map(p => {
      const row: Record<string, number | string> = { label: p.label };
      for (const cat of EXPENSE_CATEGORIES) {
        row[cat] = p.byCategory[cat] || 0;
      }
      return row;
    });

  const usedCategories = EXPENSE_CATEGORIES.filter(
    cat => cat !== 'Savings' && periods.some(p => p.byCategory[cat])
  );

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-3">
        <SummaryCard label="Periods Tracked" value={String(periods.length)} />
        <SummaryCard label="Avg 1st-Half" value={formatCurrency(avg1st)} />
        <SummaryCard label="Avg 2nd-Half" value={formatCurrency(avg2nd)} />
        <SummaryCard
          label="Highest Period"
          value={formatCurrency(highest.total)}
          sub={highest.label}
        />
        <SummaryCard
          label="Lowest Period"
          value={formatCurrency(lowest.total)}
          sub={lowest.label}
        />
      </div>

      {/* Total Spending Over Time */}
      <ChartCard title="Total Spending Over Time">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={periods.map(p => ({ label: p.label, total: p.total }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={yFmt} tick={{ fontSize: 11 }} width={55} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v) => [formatCurrency(Number(v)), 'Total']}
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Same-Half Comparison */}
      <div className="grid grid-cols-2 gap-4">
        <ChartCard title="1st-Half Periods by Category">
          {firstHalves.length < 2 ? (
            <Placeholder />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={makeStackedData(firstHalves)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={yFmt} tick={{ fontSize: 11 }} width={55} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v, name) => [formatCurrency(Number(v)), name]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {usedCategories.map(cat => (
                  <Bar key={cat} dataKey={cat} stackId="a" fill={CHART_COLORS[cat] || CHART_COLORS.Other} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="2nd-Half Periods by Category">
          {secondHalves.length < 2 ? (
            <Placeholder />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={makeStackedData(secondHalves)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={yFmt} tick={{ fontSize: 11 }} width={55} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v, name) => [formatCurrency(Number(v)), name]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {usedCategories.map(cat => (
                  <Bar key={cat} dataKey={cat} stackId="a" fill={CHART_COLORS[cat] || CHART_COLORS.Other} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* All-Time by Category */}
      <ChartCard title="All-Time Spending by Category">
        <ResponsiveContainer width="100%" height={categoryChartData.length * 36 + 20}>
          <BarChart data={categoryChartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" tickFormatter={yFmt} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v) => [formatCurrency(Number(v)), 'Total']}
            />
            <Bar dataKey="total" radius={[0, 3, 3, 0]}>
              {categoryChartData.map((entry) => (
                <Cell key={entry.name} fill={CHART_COLORS[entry.name] || CHART_COLORS.Other} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};

// ── Small helper components ──────────────────────────────────────────────────

const SummaryCard: React.FC<{ label: string; value: string; sub?: string }> = ({ label, value, sub }) => (
  <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded p-4">
    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
    <p className="text-lg font-bold font-mono text-gray-900 dark:text-gray-100">{value}</p>
    {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
  </div>
);

const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded p-4">
    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">{title}</h3>
    {children}
  </div>
);

const Placeholder: React.FC = () => (
  <div className="flex items-center justify-center h-[220px] text-sm text-gray-400 dark:text-gray-500">
    Need at least 2 periods
  </div>
);
