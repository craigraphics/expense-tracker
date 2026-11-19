import React, { useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '../types';
import type { PeriodRecord } from '../hooks/useAllPeriods';
import { formatCurrency } from '../utils/formatCurrency';
import { categoryColor } from '../utils/chartColors';
import { summarizeYear, topExpensesOf } from '../utils/yearSummary';
import { MONTHS } from '../utils/periodFormat';
import { Card, CardHeader, CategoryDot, IconButton, Segmented } from './ui/primitives';

type FilterMode = 'year' | 'last6' | 'last12' | 'all';

interface AnalyticsProps {
  periods: PeriodRecord[];
  loading: boolean;
}

// Validated pair (light + dark surfaces): 1st half / 2nd half
const HALF_COLORS = { first: '#7480cf', second: '#c2850c' };
const LINE_COLOR = '#6b6ff0';

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-line)',
  borderRadius: 10,
  color: 'var(--color-fg)',
  fontSize: 12,
  boxShadow: 'var(--shadow-pop)',
  padding: '8px 12px',
};

const compact = (v: number) => (Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `$${Math.round(v)}`);

const spentOf = (p: PeriodRecord) =>
  p.data.expenses.reduce((s, e) => s + ((e.category || 'Other') === 'Savings' ? 0 : e.amount), 0);
const savedOf = (p: PeriodRecord) =>
  p.data.expenses.reduce((s, e) => s + ((e.category || 'Other') === 'Savings' ? e.amount : 0), 0);

const shortLabel = (p: PeriodRecord, withYear: boolean) =>
  `${MONTHS[p.month - 1]} ${p.half === 1 ? '1' : '2'}${withYear ? ` '${String(p.year).slice(2)}` : ''}`;

const longLabel = (p: PeriodRecord) => `${MONTHS[p.month - 1]} ${p.half === 1 ? '1st' : '2nd'} half ${p.year}`;

const pct = (change: number | null) =>
  change === null ? '–' : `${change > 0 ? '+' : ''}${Math.round(change * 100)}%`;

const KPI: React.FC<{ label: string; value: string; footer?: React.ReactNode }> = ({ label, value, footer }) => (
  <Card className="flex flex-col gap-1 px-5 py-4">
    <span className="text-xs font-medium text-fg-3">{label}</span>
    <span className="num text-2xl font-semibold tracking-tight text-fg">{value}</span>
    {footer && <span className="mt-auto pt-1 text-xs text-fg-3">{footer}</span>}
  </Card>
);

const ChangeChip: React.FC<{ change: number | null }> = ({ change }) => {
  if (change === null || Math.abs(change) < 0.005) return null;
  const up = change > 0;
  return (
    <span className={cn('inline-flex items-center gap-0.5 rounded px-1 py-px text-xs font-medium', up ? 'bg-negative-soft text-negative' : 'bg-positive-soft text-positive')}>
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {pct(change)}
    </span>
  );
};

export const Analytics: React.FC<AnalyticsProps> = ({ periods: records, loading }) => {
  const thisYear = new Date().getFullYear();
  const [filterMode, setFilterMode] = useState<FilterMode>('year');
  const [filterYear, setFilterYear] = useState<number>(thisYear);

  if (loading) {
    return (
      <div className="space-y-5" aria-busy="true" aria-label="Loading">
        <div className="h-9 w-80 animate-pulse rounded-lg bg-surface-2" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-[104px] animate-pulse rounded-xl bg-surface-2" />)}
        </div>
        <div className="h-72 animate-pulse rounded-xl bg-surface-2" />
      </div>
    );
  }

  // Periods with no expenses (e.g. auto-created ones) would show as $0, so skip them
  const tracked = records.filter((r) => r.data.expenses.length > 0);
  if (tracked.length === 0) {
    return (
      <Card className="px-6 py-16 text-center text-sm text-fg-3">
        No data yet. Analytics appear once you've tracked a period.
      </Card>
    );
  }

  const years = [...new Set(tracked.map((p) => p.year))].sort((a, b) => a - b);
  const year = Math.min(Math.max(filterYear, years[0]), years[years.length - 1]);

  const now = new Date();
  const fp = tracked.filter((p) => {
    if (filterMode === 'year') return p.year === year;
    if (filterMode === 'all') return true;
    const cutoff = new Date(now.getFullYear(), now.getMonth() - (filterMode === 'last6' ? 6 : 12), 1);
    return new Date(p.year, p.month - 1, p.half === 1 ? 1 : 16) >= cutoff;
  });
  const multiYear = new Set(fp.map((p) => p.year)).size > 1;
  const yearSummary = filterMode === 'year' ? summarizeYear(records, year) : null;

  // KPIs
  const totalSpent = fp.reduce((s, p) => s + spentOf(p), 0);
  const totalSaved = fp.reduce((s, p) => s + savedOf(p), 0);
  const avgOf = (list: PeriodRecord[]) => (list.length ? list.reduce((s, p) => s + spentOf(p), 0) / list.length : 0);
  const firsts = fp.filter((p) => p.half === 1);
  const seconds = fp.filter((p) => p.half === 2);
  const avgPerPeriod = avgOf(fp);
  const highest = fp.reduce<PeriodRecord | null>((a, b) => (!a || spentOf(b) > spentOf(a) ? b : a), null);
  const lowest = fp.reduce<PeriodRecord | null>((a, b) => (!a || spentOf(b) < spentOf(a) ? b : a), null);

  // Categories: totals, per-period average, per-half averages
  const catTotals = new Map<ExpenseCategory, { total: number; first: number; second: number }>();
  for (const p of fp) {
    for (const e of p.data.expenses) {
      const cat = e.category || 'Other';
      if (cat === 'Savings') continue;
      const entry = catTotals.get(cat) ?? { total: 0, first: 0, second: 0 };
      entry.total += e.amount;
      if (p.half === 1) entry.first += e.amount;
      else entry.second += e.amount;
      catTotals.set(cat, entry);
    }
  }
  const categories = EXPENSE_CATEGORIES.filter((c) => catTotals.has(c))
    .map((c) => {
      const t = catTotals.get(c)!;
      const prev = yearSummary?.byCategory.find((b) => b.category === c);
      return {
        category: c,
        total: t.total,
        perPeriod: t.total / fp.length,
        avgFirst: firsts.length ? t.first / firsts.length : 0,
        avgSecond: seconds.length ? t.second / seconds.length : 0,
        change: prev?.change ?? null,
      };
    })
    .sort((a, b) => b.total - a.total);
  const maxCat = categories[0]?.total ?? 0;
  const halfData = categories.map((c) => ({ name: c.category, first: c.avgFirst, second: c.avgSecond }));

  const timeline = fp.map((p) => ({ label: shortLabel(p, multiYear), full: longLabel(p), spent: spentOf(p) }));
  const topExpenses = topExpensesOf(fp);
  const hasPrevYear = !!yearSummary?.prevYear;

  const rangeLabel =
    filterMode === 'year' ? String(year) : filterMode === 'all' ? 'All time' : filterMode === 'last6' ? 'Last 6 months' : 'Last 12 months';

  return (
    <div className="space-y-5">
      {/* Title + range */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-fg sm:text-2xl">
            {filterMode === 'year' ? `${year} in review` : 'Analytics'}
          </h1>
          <p className="text-sm text-fg-3">
            {fp.length} {fp.length === 1 ? 'period' : 'periods'} tracked · {rangeLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filterMode === 'year' && (
            <div className="flex items-center gap-0.5">
              <IconButton label="Previous year" disabled={year <= years[0]} onClick={() => setFilterYear(year - 1)}>
                <ChevronLeft />
              </IconButton>
              <span className="num w-11 text-center text-sm font-semibold text-fg">{year}</span>
              <IconButton label="Next year" disabled={year >= years[years.length - 1]} onClick={() => setFilterYear(year + 1)}>
                <ChevronRight />
              </IconButton>
            </div>
          )}
          <Segmented
            value={filterMode}
            onChange={setFilterMode}
            options={[
              { value: 'year', label: 'Year' },
              { value: 'last6', label: '6 months' },
              { value: 'last12', label: '12 months' },
              { value: 'all', label: 'All time' },
            ]}
          />
        </div>
      </div>

      {fp.length === 0 ? (
        <Card className="px-6 py-16 text-center text-sm text-fg-3">No data for this range.</Card>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KPI
              label="Spent"
              value={formatCurrency(totalSpent)}
              footer={
                yearSummary?.prevYear ? (
                  <span className="inline-flex items-center gap-1">
                    <ChangeChip change={yearSummary.spentChange} /> per period vs {year - 1}
                  </span>
                ) : (
                  `${formatCurrency(avgPerPeriod)} per period`
                )
              }
            />
            <KPI
              label="Saved"
              value={formatCurrency(totalSaved)}
              footer={totalSpent > 0 ? `${Math.round((totalSaved / totalSpent) * 100)}% of what you spent` : undefined}
            />
            <KPI
              label="Average 1st half"
              value={formatCurrency(avgOf(firsts))}
              footer={(() => {
                const d = avgOf(firsts) - avgOf(seconds);
                if (!firsts.length || !seconds.length || Math.abs(d) < 0.005) return undefined;
                return `${formatCurrency(Math.abs(d))} ${d > 0 ? 'more' : 'less'} than the 2nd half`;
              })()}
            />
            <KPI
              label="Average 2nd half"
              value={formatCurrency(avgOf(seconds))}
              footer={
                highest && lowest
                  ? `Range ${compact(spentOf(lowest))}–${compact(spentOf(highest))} per period`
                  : undefined
              }
            />
          </div>

          {/* Spending over time */}
          <Card>
            <CardHeader
              title="Spending per period"
              subtitle={`Excludes savings · dashed line is the ${formatCurrency(avgPerPeriod)} average`}
              action={
                highest && (
                  <span className="hidden text-xs text-fg-3 sm:block">
                    Peak <span className="num font-medium text-fg">{formatCurrency(spentOf(highest))}</span> · {longLabel(highest)}
                  </span>
                )
              }
            />
            <div className="px-2 pb-3">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={timeline} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spentFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={LINE_COLOR} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
                  <ReferenceLine y={avgPerPeriod} stroke="var(--color-fg-3)" strokeDasharray="4 4" />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    cursor={{ stroke: 'var(--color-line-strong)' }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.full ?? ''}
                    formatter={(v) => [formatCurrency(Number(v)), 'Spent']}
                  />
                  <Area
                    type="monotone"
                    dataKey="spent"
                    stroke={LINE_COLOR}
                    strokeWidth={2}
                    fill="url(#spentFill)"
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--color-surface)' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Year mode: month by month */}
          {yearSummary && (
            <Card>
              <CardHeader
                title="Month by month"
                subtitle="Spending in each half of the month"
                action={
                  <div className="flex items-center gap-3 text-xs text-fg-2">
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: HALF_COLORS.first }} />1st half</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: HALF_COLORS.second }} />2nd half</span>
                  </div>
                }
              />
              <div className="px-2 pb-3">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={yearSummary.byMonth} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barCategoryGap="28%">
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      cursor={{ fill: 'var(--color-surface-2)' }}
                      formatter={(v, name) => [formatCurrency(Number(v)), name]}
                    />
                    <Bar dataKey="firstHalf" name="1st half" stackId="m" fill={HALF_COLORS.first} stroke="var(--color-surface)" strokeWidth={1} />
                    <Bar dataKey="secondHalf" name="2nd half" stackId="m" fill={HALF_COLORS.second} radius={[4, 4, 0, 0]} stroke="var(--color-surface)" strokeWidth={1} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* Categories */}
            <Card className="overflow-hidden">
              <CardHeader
                title="Categories"
                subtitle={hasPrevYear ? `Change is per period vs ${year - 1}` : 'Totals for this range, excluding savings'}
              />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-y border-line text-left text-[11px] font-medium uppercase tracking-wide text-fg-3">
                      <th className="px-5 py-2 font-medium">Category</th>
                      <th className="w-1/3 px-2 py-2 font-medium"><span className="sr-only">Share</span></th>
                      <th className="px-2 py-2 text-right font-medium">Total</th>
                      <th className="px-2 py-2 text-right font-medium">Per period</th>
                      {hasPrevYear && <th className="px-5 py-2 text-right font-medium">Change</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {categories.map((c) => (
                      <tr key={c.category} className="hover:bg-surface-2/60">
                        <td className="px-5 py-2.5">
                          <span className="flex items-center gap-2 text-fg-2">
                            <CategoryDot category={c.category} />
                            {c.category}
                          </span>
                        </td>
                        <td className="px-2 py-2.5">
                          <div className="h-1.5 rounded-full bg-surface-3">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${(c.total / maxCat) * 100}%`, backgroundColor: categoryColor(c.category) }}
                            />
                          </div>
                        </td>
                        <td className="num px-2 py-2.5 text-right font-medium text-fg">{formatCurrency(c.total)}</td>
                        <td className="num px-2 py-2.5 text-right text-fg-2">{formatCurrency(c.perPeriod)}</td>
                        {hasPrevYear && (
                          <td className="px-5 py-2.5 text-right">
                            {c.change === null ? <span className="text-fg-3">–</span> : <ChangeChip change={c.change} />}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="space-y-5">
              <Card>
                <CardHeader title="Biggest expenses" subtitle={`By total · ${rangeLabel.toLowerCase()}`} />
                <ol className="space-y-3 px-5 pb-4">
                  {topExpenses.map((t, i) => (
                    <li key={t.desc} className="flex items-center gap-3 text-sm">
                      <span className="num w-4 text-xs text-fg-3">{i + 1}</span>
                      <CategoryDot category={t.category} />
                      <span className="min-w-0 flex-1 truncate text-fg">{t.desc}</span>
                      <span className="text-right">
                        <span className="num block font-medium text-fg">{formatCurrency(t.total)}</span>
                        <span className="block text-[11px] text-fg-3">{t.count}×</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </Card>

              {yearSummary && yearSummary.newRecurring.length > 0 && (
                <Card>
                  <CardHeader title={`New regulars in ${year}`} subtitle="Started this year, seen 3+ times" />
                  <ul className="flex flex-wrap gap-1.5 px-5 pb-4">
                    {yearSummary.newRecurring.map((d) => (
                      <li key={d} className="rounded-md bg-surface-2 px-2 py-1 text-xs text-fg-2">{d}</li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          </div>

          {/* 1st vs 2nd half by category */}
          {firsts.length > 0 && seconds.length > 0 && (
            <Card>
              <CardHeader
                title="1st half vs 2nd half"
                subtitle="Average spent per period in each category"
                action={
                  <div className="flex items-center gap-3 text-xs text-fg-2">
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: HALF_COLORS.first }} />1st half</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: HALF_COLORS.second }} />2nd half</span>
                  </div>
                }
              />
              <div className="px-2 pb-3">
                <ResponsiveContainer width="100%" height={Math.max(160, halfData.length * 44 + 30)}>
                  <BarChart data={halfData} layout="vertical" margin={{ top: 0, right: 24, left: 8, bottom: 0 }} barGap={2} barCategoryGap="22%">
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={124} />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      cursor={{ fill: 'var(--color-surface-2)' }}
                      formatter={(v, name) => [formatCurrency(Number(v)), name]}
                    />
                    <Bar dataKey="first" name="1st half" fill={HALF_COLORS.first} radius={[0, 4, 4, 0]} />
                    <Bar dataKey="second" name="2nd half" fill={HALF_COLORS.second} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
