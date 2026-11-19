import React, { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Pencil } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatCurrency } from '../utils/formatCurrency';
import { Card } from './ui/primitives';

interface PeriodSummaryProps {
  bankBalance: number;
  onBankBalanceChange: (value: number) => void;
  totalPlanned: number;
  savings: number;
  prevTotal: number | null;
  prevLabel: string;
  paidAmount: number;
  paidCount: number;
  count: number;
}

const Stat: React.FC<{ label: string; children: React.ReactNode; footer?: React.ReactNode; className?: string }> = ({
  label,
  children,
  footer,
  className,
}) => (
  <Card className={cn('flex flex-col gap-1 px-5 py-4', className)}>
    <span className="text-xs font-medium text-fg-3">{label}</span>
    {children}
    {footer && <div className="mt-auto pt-1 text-xs text-fg-3">{footer}</div>}
  </Card>
);

const bigNumber = 'num text-2xl font-semibold tracking-tight text-fg';

/** Bank balance shown formatted; click to edit in place, saves on blur or Enter. */
const BalanceInput: React.FC<{ value: number; onCommit: (value: number) => void }> = ({ value, onCommit }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const start = () => {
    setDraft(value ? String(value) : '');
    setEditing(true);
  };
  const commit = () => {
    const parsed = parseFloat(draft);
    const next = isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
    setEditing(false);
    if (next !== value) onCommit(next);
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={start}
        aria-label={`Bank balance ${formatCurrency(value)}, edit`}
        className="group -mx-2 flex items-center gap-2 rounded-lg px-2 text-left transition-colors hover:bg-surface-2"
      >
        <span className={cn(bigNumber, !value && 'text-fg-3')}>{formatCurrency(value)}</span>
        <Pencil className="h-3.5 w-3.5 shrink-0 text-fg-3 opacity-0 transition-opacity group-hover:opacity-100" />
      </button>
    );
  }

  return (
    <div className="-mx-2 flex items-center rounded-lg bg-surface-2 px-2 ring-2 ring-accent/30">
      <span className={cn(bigNumber, 'text-fg-3')}>$</span>
      <input
        autoFocus
        type="number"
        inputMode="decimal"
        step="0.01"
        min={0}
        value={draft}
        placeholder="0.00"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') setEditing(false);
        }}
        aria-label="Bank balance"
        className={cn(bigNumber, 'w-full min-w-0 bg-transparent pl-0.5 outline-none placeholder:text-fg-3')}
      />
    </div>
  );
};

export const PeriodSummary: React.FC<PeriodSummaryProps> = ({
  bankBalance,
  onBankBalanceChange,
  totalPlanned,
  savings,
  prevTotal,
  prevLabel,
  paidAmount,
  paidCount,
  count,
}) => {
  const leftOver = bankBalance - totalPlanned;
  const diff = prevTotal !== null ? totalPlanned - prevTotal : null;
  const remaining = totalPlanned - paidAmount;
  const paidPct = totalPlanned > 0 ? Math.min(100, (paidAmount / totalPlanned) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="Bank balance" footer="What you start this period with">
        <BalanceInput value={bankBalance} onCommit={onBankBalanceChange} />
      </Stat>

      <Stat
        label="Planned"
        footer={
          diff !== null && Math.abs(diff) >= 0.005 ? (
            <span className="inline-flex items-center gap-1">
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded px-1 py-px font-medium',
                  diff > 0 ? 'bg-negative-soft text-negative' : 'bg-positive-soft text-positive'
                )}
              >
                {diff > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                <span className="num">{formatCurrency(Math.abs(diff))}</span>
              </span>
              vs {prevLabel}
            </span>
          ) : savings > 0 ? (
            <>Includes <span className="num">{formatCurrency(savings)}</span> to savings</>
          ) : (
            `${count} expenses`
          )
        }
      >
        <span className={bigNumber}>{formatCurrency(totalPlanned)}</span>
      </Stat>

      <Stat
        label="Left over"
        className={leftOver < 0 ? 'border-negative/40' : undefined}
        footer={leftOver < 0 ? 'Planned is more than the balance' : 'After everything planned'}
      >
        <span className={cn(bigNumber, leftOver < 0 ? 'text-negative' : 'text-positive')}>
          {formatCurrency(leftOver)}
        </span>
      </Stat>

      <Stat
        label="Still to pay"
        footer={
          <div className="flex flex-col gap-1.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${paidPct}%` }} />
            </div>
            <span>
              {paidCount} of {count} paid
            </span>
          </div>
        }
      >
        <span className={cn(bigNumber, remaining <= 0.005 && count > 0 && 'text-positive')}>
          {remaining <= 0.005 && count > 0 ? 'All paid' : formatCurrency(remaining)}
        </span>
      </Stat>
    </div>
  );
};
