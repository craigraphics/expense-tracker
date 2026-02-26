import React, { useEffect, useState, useMemo } from 'react';
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

type FilterMode = 'all' | 'year' | 'last6' | 'last12';

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

function periodLabelWithYear(id: string): string {
  const [year, month, half] = id.split('-').map(Number);
  return `${MONTH_NAMES[month - 1]} ${half === 1 ? '1st' : '2nd'} '${String(year).slice(2)}`;
}

export const Analytics: React.FC = () => {
  const [periods, setPeriods] = useState<PeriodStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());

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
          if (cat !== 'Savings') {
            byCategory[cat] = (byCategory[cat] || 0) + exp.amount;
            total += exp.amount;
          } else {
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

  const availableYears = useMemo(
    () => [...new Set(periods.map(p => p.year))].sort((a, b) => b - a),
    [periods]
  );

  const filteredPeriods = useMemo(() => {
    switch (filterMode) {
      case 'year':
        return periods.filter(p => p.year === filterYear);
      case 'last6':
      case 'last12': {
        const now = new Date();
        const monthsBack = filterMode === 'last6' ? 6 : 12;
        const cutoff = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
        return periods.filter(p => {
          const periodDate = new Date(p.year, p.month - 1, p.half === 1 ? 1 : 16);
          return periodDate >= cutoff;
        });
      }
      default:
        return periods;
    }
  }, [periods, filterMode, filterYear]);

  const filterLabel = useMemo(() => {
    switch (filterMode) {
      case 'year': return String(filterYear);
      case 'last6': return 'Last 6 Months';
      case 'last12': return 'Last 12 Months';
      default: return 'All-Time';
    }
  }, [filterMode, filterYear]);

  // Use year-qualified labels when filter spans multiple years
  const spansMultipleYears = useMemo(() => {
    const years = new Set(filteredPeriods.map(p => p.year));
    return years.size > 1;
  }, [filteredPeriods]);

  const getLabel = (p: PeriodStat) =>
    spansMultipleYears ? periodLabelWithYear(p.id) : p.label;

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

  // Derived data from filtered periods
  const fp = filteredPeriods;
  const firstHalves = fp.filter(p => p.half === 1);
  const secondHalves = fp.filter(p => p.half === 2);

  const avg1st = firstHalves.length > 0
    ? firstHalves.reduce((s, p) => s + p.total, 0) / firstHalves.length
    : 0;
  const avg2nd = secondHalves.length > 0
    ? secondHalves.reduce((s, p) => s + p.total, 0) / secondHalves.length
    : 0;

  const highest = fp.length > 0 ? fp.reduce((a, b) => a.total >= b.total ? a : b) : null;
  const lowest = fp.length > 0 ? fp.reduce((a, b) => a.total <= b.total ? a : b) : null;

  // Category totals
  const categoryTotals: Record<string, number> = {};
  for (const p of fp) {
    for (const [cat, amt] of Object.entries(p.byCategory)) {
      categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
    }
  }
  const categoryChartData = EXPENSE_CATEGORIES
    .filter(cat => categoryTotals[cat] && cat !== 'Savings')
    .map(cat => ({ name: cat, total: categoryTotals[cat] }))
    .sort((a, b) => b.total - a.total);

  // Stacked bar chart data helpers
  const makeStackedData = (subset: PeriodStat[]) =>
    subset.map(p => {
      const row: Record<string, number | string> = { label: getLabel(p) };
      for (const cat of EXPENSE_CATEGORIES) {
        row[cat] = p.byCategory[cat] || 0;
      }
      return row;
    });

  const usedCategories = EXPENSE_CATEGORIES.filter(
    cat => cat !== 'Savings' && fp.some(p => p.byCategory[cat])
  );

  const btnClass = (active: boolean) =>
    `px-3 py-1.5 text-sm rounded transition-colors ${
      active
        ? 'bg-[#5e6aba] dark:bg-[#333f8b] text-white'
        : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
    }`;

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button className={btnClass(filterMode === 'all')} onClick={() => setFilterMode('all')}>
          All Time
        </button>
        <div className="flex items-center gap-1">
          <button className={btnClass(filterMode === 'year')} onClick={() => setFilterMode('year')}>
            Year
          </button>
          {filterMode === 'year' && (
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(Number(e.target.value))}
              className="px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5e6aba] dark:focus:ring-[#333f8b]"
            >
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}
        </div>
        <button className={btnClass(filterMode === 'last6')} onClick={() => setFilterMode('last6')}>
          Last 6 Mo
        </button>
        <button className={btnClass(filterMode === 'last12')} onClick={() => setFilterMode('last12')}>
          Last 12 Mo
        </button>
      </div>

      {fp.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-gray-500 dark:text-gray-400">
          No data for the selected range.
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-5 gap-3">
            <SummaryCard label="Periods Tracked" value={String(fp.length)} />
            <SummaryCard label={`Avg 1st-Half`} value={formatCurrency(avg1st)} sub={filterLabel} />
            <SummaryCard label={`Avg 2nd-Half`} value={formatCurrency(avg2nd)} sub={filterLabel} />
            {highest && (
              <SummaryCard
                label="Highest Period"
                value={formatCurrency(highest.total)}
                sub={getLabel(highest)}
              />
            )}
            {lowest && (
              <SummaryCard
                label="Lowest Period"
                value={formatCurrency(lowest.total)}
                sub={getLabel(lowest)}
              />
            )}
          </div>

          {/* Total Spending Over Time */}
          <ChartCard title={`Spending Over Time (${filterLabel})`}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={fp.map(p => ({ label: getLabel(p), total: p.total }))}>
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
            <ChartCard title={`1st-Half by Category (${filterLabel})`}>
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

            <ChartCard title={`2nd-Half by Category (${filterLabel})`}>
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

          {/* By Category */}
          <ChartCard title={`Spending by Category (${filterLabel})`}>
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
        </>
      )}
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
