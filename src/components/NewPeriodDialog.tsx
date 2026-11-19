import React, { useState } from 'react';
import { EyeOff, Pin, RotateCcw, Sparkles } from 'lucide-react';
import { cn } from '@/utils/cn';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  type Expense,
  type PeriodData,
  VALIDATION,
  formatPeriodWithYear,
  getPreviousPeriodId,
  newExpenseId,
} from '../types';
import type { PeriodRecord } from '../hooks/useAllPeriods';
import {
  type Prediction,
  type PredictionPrefs,
  type PredictionTier,
  predictExpenses,
} from '../utils/predictExpenses';
import { formatCurrency } from '../utils/formatCurrency';
import { Button, CategoryTag, CheckCircle, IconButton } from './ui/primitives';
import { inputClass } from './ui/styles';

interface NewPeriodDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetPeriodId: string;
  periods: PeriodRecord[];
  prefs: PredictionPrefs;
  onPin: (key: string) => void;
  onIgnore: (key: string) => void;
  onReset: (key: string) => void;
  onCreate: (data: PeriodData) => Promise<void>;
}

export const NewPeriodDialog: React.FC<NewPeriodDialogProps> = ({ isOpen, onClose, ...rest }) => (
  <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
      {/* Keyed so edits reset whenever the dialog opens for another period */}
      {isOpen && <NewPeriodForm key={rest.targetPeriodId} onClose={onClose} {...rest} />}
    </DialogContent>
  </Dialog>
);

const TIER_INFO: Record<PredictionTier, { title: string; hint: string; dot: string }> = {
  fixed: { title: 'Fixed', hint: 'Shows up reliably with the same amount', dot: 'bg-positive' },
  likely: { title: 'Likely', hint: 'Usually shows up, amount varies', dot: 'bg-accent' },
  maybe: { title: 'Maybe', hint: 'Occasional, yearly, or possibly stopped', dot: 'bg-fg-3' },
};

interface RowOverride {
  checked?: boolean;
  amount?: string;
}

const NewPeriodForm: React.FC<Omit<NewPeriodDialogProps, 'isOpen'>> = ({
  onClose,
  targetPeriodId,
  periods,
  prefs,
  onPin,
  onIgnore,
  onReset,
  onCreate,
}) => {
  const { predictions, ignored, usedFallback } = predictExpenses(periods, targetPeriodId, prefs);

  // Carry over what was left in the previous period
  const prevId = getPreviousPeriodId(targetPeriodId);
  const prev = periods.find((p) => p.id === prevId);
  const leftover = prev
    ? prev.data.bankBalance - prev.data.expenses.reduce((s, e) => s + e.amount, 0)
    : null;

  const [balance, setBalance] = useState<string>(
    leftover !== null && leftover > 0 ? String(Math.round(leftover * 100) / 100) : ''
  );
  const [overrides, setOverrides] = useState<Record<string, RowOverride>>({});
  const [saving, setSaving] = useState(false);

  const isChecked = (p: Prediction) => overrides[p.key]?.checked ?? p.tier !== 'maybe';
  const amountText = (p: Prediction) => overrides[p.key]?.amount ?? String(p.amount);
  const amountValue = (p: Prediction) => parseFloat(amountText(p));
  const amountInvalid = (p: Prediction) => {
    const v = amountValue(p);
    return isNaN(v) || v < VALIDATION.AMOUNT_MIN || v > VALIDATION.AMOUNT_MAX;
  };

  const setOverride = (key: string, patch: RowOverride) =>
    setOverrides((o) => ({ ...o, [key]: { ...o[key], ...patch } }));

  const setTierChecked = (rows: Prediction[], checked: boolean) =>
    setOverrides((o) => {
      const next = { ...o };
      for (const p of rows) next[p.key] = { ...next[p.key], checked };
      return next;
    });

  const selected = predictions.filter(isChecked);
  const selectedTotal = selected.reduce((s, p) => s + (amountInvalid(p) ? 0 : amountValue(p)), 0);
  const balanceValue = parseFloat(balance);
  const balanceNumber = isNaN(balanceValue) ? 0 : balanceValue;
  const balanceInvalid = balanceNumber < 0 || balanceNumber > VALIDATION.BALANCE_MAX;
  const hasInvalid = selected.some(amountInvalid) || balanceInvalid;
  const remaining = balanceNumber - selectedTotal;

  const handleCreate = async () => {
    if (hasInvalid) return;
    setSaving(true);
    const expenses: Expense[] = selected.map((p, i) => ({
      id: newExpenseId(i),
      desc: p.desc,
      amount: Math.round(amountValue(p) * 100) / 100,
      category: p.category,
      paid: false,
    }));
    try {
      await onCreate({ bankBalance: balanceNumber, expenses });
      onClose();
    } catch {
      // onCreate reports the error; keep the dialog open so nothing is lost
    } finally {
      setSaving(false);
    }
  };

  const tiers: PredictionTier[] = ['fixed', 'likely', 'maybe'];

  return (
    <>
      <div className="border-b border-line px-6 pb-5 pt-6">
        <DialogHeader className="pr-8">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-fg">
              <Sparkles className="h-[18px] w-[18px]" />
            </span>
            <DialogTitle>Set up {formatPeriodWithYear(targetPeriodId)}</DialogTitle>
          </div>
          <DialogDescription>
            Suggested from your last 12 months. Choose what to include and adjust any amounts. Nothing is saved until
            you create the period.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-surface-2 px-4 py-3">
          <label htmlFor="starting-balance" className="text-sm font-medium text-fg">
            Starting balance
          </label>
          <div className="relative w-40">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-fg-3">$</span>
            <input
              id="starting-balance"
              type="number"
              inputMode="decimal"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              min={0}
              max={VALIDATION.BALANCE_MAX}
              step="0.01"
              placeholder="0.00"
              className={cn(inputClass, 'num pl-6', balanceInvalid && 'border-negative')}
            />
          </div>
          <p className="text-xs text-fg-3">
            {leftover === null
              ? `No ${formatPeriodWithYear(prevId)} period to carry over from.`
              : leftover >= 0
                ? `Carried over from what was left in ${formatPeriodWithYear(prevId)}.`
                : `${formatPeriodWithYear(prevId)} ended ${formatCurrency(-leftover)} short, so nothing carried over.`}
          </p>
        </div>

        {usedFallback && (
          <p className="mt-3 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
            Not enough history for predictions yet, so these were copied from your most recent matching period.
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
        {predictions.length === 0 && (
          <p className="py-8 text-center text-sm text-fg-3">No suggestions for this period. It will start empty.</p>
        )}
        {tiers.map((tier) => {
          const rows = predictions.filter((p) => p.tier === tier);
          if (rows.length === 0) return null;
          const allChecked = rows.every(isChecked);
          return (
            <section key={tier}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
                  <span className={cn('h-2 w-2 rounded-full', TIER_INFO[tier].dot)} />
                  {TIER_INFO[tier].title}
                  <span className="font-normal text-fg-3">· {TIER_INFO[tier].hint}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setTierChecked(rows, !allChecked)}
                  className="shrink-0 text-xs font-medium text-accent-fg hover:underline"
                >
                  {allChecked ? 'Clear all' : 'Select all'}
                </button>
              </div>
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                {rows.map((p) => {
                  const checked = isChecked(p);
                  return (
                    <li
                      key={p.key}
                      className={cn('flex items-center gap-3 px-3 py-2.5 transition-colors sm:px-4', checked ? 'bg-surface' : 'bg-surface-2/50')}
                    >
                      <CheckCircle
                        checked={checked}
                        onChange={(value) => setOverride(p.key, { checked: value })}
                        label={`Include ${p.desc}`}
                      />
                      <div className={cn('min-w-0 flex-1', !checked && 'opacity-60')}>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="truncate text-sm font-medium text-fg">{p.desc}</span>
                          <CategoryTag category={p.category} />
                        </div>
                        <p className="mt-0.5 truncate text-xs text-fg-3" title={p.reason}>
                          {p.reason}
                        </p>
                      </div>
                      <div className="relative w-28 shrink-0">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-fg-3">$</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={amountText(p)}
                          onChange={(e) => setOverride(p.key, { amount: e.target.value, checked: true })}
                          min={VALIDATION.AMOUNT_MIN}
                          max={VALIDATION.AMOUNT_MAX}
                          step="0.01"
                          aria-label={`Amount for ${p.desc}`}
                          className={cn(inputClass, 'num h-8 pl-5 text-right', checked && amountInvalid(p) && 'border-negative')}
                        />
                      </div>
                      <div className="flex shrink-0">
                        <IconButton
                          label={p.pinned ? `Unpin ${p.desc}` : `Pin ${p.desc}: always include`}
                          onClick={() => (p.pinned ? onReset(p.key) : onPin(p.key))}
                          className={p.pinned ? 'text-accent-fg' : undefined}
                        >
                          <Pin className={p.pinned ? 'fill-current' : undefined} />
                        </IconButton>
                        <IconButton label={`Never suggest ${p.desc}`} onClick={() => onIgnore(p.key)}>
                          <EyeOff />
                        </IconButton>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        {ignored.length > 0 && (
          <details className="group text-sm">
            <summary className="cursor-pointer select-none text-xs font-medium text-fg-3 hover:text-fg">
              Hidden suggestions ({ignored.length})
            </summary>
            <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
              {ignored.map((item) => (
                <li key={item.key} className="flex items-center justify-between px-4 py-2 text-fg-2">
                  <span className="truncate">{item.desc}</span>
                  <Button size="sm" variant="ghost" onClick={() => onReset(item.key)}>
                    <RotateCcw className="h-3.5 w-3.5" /> Restore
                  </Button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-line bg-surface-2/60 px-6 py-4 sm:flex-row sm:items-center">
        <div className="text-sm sm:mr-auto">
          <span className="text-fg-2">
            {selected.length} selected · <span className="num font-semibold text-fg">{formatCurrency(selectedTotal)}</span>
          </span>
          <span className="mx-2 text-fg-3">·</span>
          <span className={cn('num font-medium', remaining < 0 ? 'text-negative' : 'text-positive')}>
            {formatCurrency(remaining)}
          </span>
          <span className="text-fg-3"> left</span>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1 sm:flex-none">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreate} disabled={saving || hasInvalid} className="flex-1 sm:flex-none">
            {saving ? 'Creating…' : 'Create period'}
          </Button>
        </div>
      </div>
    </>
  );
};
