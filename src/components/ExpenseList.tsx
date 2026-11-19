import React, { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { type Expense, type ExpenseCategory, EXPENSE_CATEGORIES, VALIDATION } from '../types';
import { formatCurrency } from '../utils/formatCurrency';
import { categoryColor } from '../utils/chartColors';
import { Button, Card, CheckCircle, IconButton } from './ui/primitives';
import { inputClass, selectClass } from './ui/styles';

type SortField = 'none' | 'desc' | 'amount';
type SortDirection = 'asc' | 'desc';

export interface ExpenseDraft {
  desc: string;
  amount: string;
  category: ExpenseCategory;
}

interface ExpenseListProps {
  expenses: Expense[];
  onAdd: (draft: ExpenseDraft) => boolean;
  onSave: (id: number, draft: ExpenseDraft) => boolean;
  onUpdate: (id: number, patch: Partial<Expense>) => void;
  onDelete: (expense: Expense) => void;
  onFillPredictions: () => void;
}

const EMPTY_DRAFT: ExpenseDraft = { desc: '', amount: '', category: 'Other' };

// desktop: paid | description | category | amount | actions
const rowGrid = 'grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_170px_120px_72px] items-center gap-x-3';

/** A category picker that looks like a tag until you open it. */
const CategoryPicker: React.FC<{ value: ExpenseCategory; onChange: (c: ExpenseCategory) => void; className?: string }> = ({
  value,
  onChange,
  className,
}) => (
  <div className={cn('relative inline-flex max-w-full', className)}>
    <span
      aria-hidden
      className="pointer-events-none absolute left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
      style={{ backgroundColor: categoryColor(value) }}
    />
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ExpenseCategory)}
      aria-label="Category"
      className="max-w-full cursor-pointer appearance-none truncate rounded-md bg-surface-2 py-1 pl-6 pr-2 text-xs font-medium text-fg-2 transition-colors hover:bg-surface-3 hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      {EXPENSE_CATEGORIES.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  </div>
);

export const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  onAdd,
  onSave,
  onUpdate,
  onDelete,
  onFillPredictions,
}) => {
  const [draft, setDraft] = useState<ExpenseDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<ExpenseDraft>(EMPTY_DRAFT);
  const [filter, setFilter] = useState<ExpenseCategory | 'All'>('All');
  const [sortField, setSortField] = useState<SortField>('none');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const descRef = useRef<HTMLInputElement>(null);

  const usedCategories = EXPENSE_CATEGORIES.filter((c) => expenses.some((e) => (e.category || 'Other') === c));

  const handleSort = (field: Exclude<SortField, 'none'>) => {
    if (sortField !== field) {
      setSortField(field);
      setSortDirection(field === 'amount' ? 'desc' : 'asc');
    } else if (sortDirection === (field === 'amount' ? 'desc' : 'asc')) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField('none');
    }
  };

  let rows = filter === 'All' ? expenses : expenses.filter((e) => (e.category || 'Other') === filter);
  if (sortField !== 'none') {
    rows = [...rows].sort((a, b) => {
      const cmp = sortField === 'desc' ? a.desc.localeCompare(b.desc) : a.amount - b.amount;
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }
  const shownTotal = rows.reduce((s, e) => s + e.amount, 0);

  const submitNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (onAdd(draft)) {
      setDraft({ ...EMPTY_DRAFT, category: draft.category });
      descRef.current?.focus();
    }
  };

  const startEdit = (exp: Expense) => {
    setEditingId(exp.id);
    setEditDraft({ desc: exp.desc, amount: String(exp.amount), category: exp.category || 'Other' });
  };

  const saveEdit = () => {
    if (editingId !== null && onSave(editingId, editDraft)) setEditingId(null);
  };

  const sortHeader = (field: Exclude<SortField, 'none'>, children: React.ReactNode, className?: string) => (
    <button
      type="button"
      onClick={() => handleSort(field)}
      className={cn('inline-flex items-center gap-1 hover:text-fg', sortField === field && 'text-fg', className)}
    >
      {children}
      {sortField === field && (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
    </button>
  );

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-fg">Expenses</h2>
          <p className="mt-0.5 text-xs text-fg-3">
            {expenses.length} {expenses.length === 1 ? 'item' : 'items'}
            {filter !== 'All' && ` · ${rows.length} in ${filter}`}
          </p>
        </div>
        {usedCategories.length > 1 && (
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as ExpenseCategory | 'All')}
            aria-label="Filter by category"
            className={cn(selectClass, 'h-8 w-auto text-[13px]')}
          >
            <option value="All">All categories</option>
            {usedCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Composer */}
      <form onSubmit={submitNew} className="mx-3 mb-2 flex flex-wrap items-center gap-2 rounded-lg bg-surface-2 p-2 sm:flex-nowrap">
        <Plus className="ml-1 hidden h-4 w-4 shrink-0 text-fg-3 sm:block" />
        <input
          ref={descRef}
          value={draft.desc}
          onChange={(e) => setDraft({ ...draft, desc: e.target.value })}
          maxLength={VALIDATION.DESC_MAX_LENGTH}
          placeholder="Add an expense…"
          aria-label="New expense description"
          className="h-9 min-w-0 flex-1 basis-full rounded-lg bg-transparent px-2 text-sm text-fg placeholder:text-fg-3 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 sm:basis-auto"
        />
        <select
          value={draft.category}
          onChange={(e) => setDraft({ ...draft, category: e.target.value as ExpenseCategory })}
          aria-label="New expense category"
          className={cn(selectClass, 'w-auto flex-1 sm:w-40 sm:flex-none')}
        >
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="relative w-28 shrink-0">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-fg-3">$</span>
          <input
            type="number"
            inputMode="decimal"
            value={draft.amount}
            onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
            min={VALIDATION.AMOUNT_MIN}
            max={VALIDATION.AMOUNT_MAX}
            step="0.01"
            placeholder="0.00"
            aria-label="New expense amount"
            className={cn(inputClass, 'num pl-6 text-right')}
          />
        </div>
        <Button type="submit" variant="primary" disabled={!draft.desc.trim() || !draft.amount}>
          Add
        </Button>
      </form>

      {expenses.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent-fg">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-medium text-fg">No expenses yet</p>
            <p className="mt-1 text-sm text-fg-3">Add one above, or start from your usual expenses.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={onFillPredictions}>
            <Sparkles className="h-3.5 w-3.5" /> Fill from predictions
          </Button>
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div className={cn(rowGrid, 'border-b border-line px-5 py-2 text-xs font-medium text-fg-3')}>
            <span className="w-5" />
            {sortHeader('desc', 'Description')}
            <span className="hidden sm:block">Category</span>
            {sortHeader('amount', 'Amount', 'justify-self-end')}
            <span className="hidden sm:block" />
          </div>

          <ul className="divide-y divide-line">
            {rows.map((exp) => {
              const editing = editingId === exp.id;
              if (editing) {
                return (
                  <li key={exp.id} className={cn(rowGrid, 'bg-accent-soft/40 px-5 py-2')}>
                    <span className="w-5" />
                    <input
                      autoFocus
                      value={editDraft.desc}
                      onChange={(e) => setEditDraft({ ...editDraft, desc: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      maxLength={VALIDATION.DESC_MAX_LENGTH}
                      aria-label="Description"
                      className={cn(inputClass, 'h-8')}
                    />
                    <select
                      value={editDraft.category}
                      onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value as ExpenseCategory })}
                      aria-label="Category"
                      className={cn(selectClass, 'hidden h-8 sm:block')}
                    >
                      {EXPENSE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={editDraft.amount}
                      onChange={(e) => setEditDraft({ ...editDraft, amount: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      step="0.01"
                      aria-label="Amount"
                      className={cn(inputClass, 'num h-8 text-right')}
                    />
                    <div className="col-span-3 flex justify-end gap-0.5 sm:col-span-1">
                      <IconButton
                        label={`Delete ${exp.desc}`}
                        tone="danger"
                        className="mr-auto sm:hidden"
                        onClick={() => {
                          setEditingId(null);
                          onDelete(exp);
                        }}
                      >
                        <Trash2 />
                      </IconButton>
                      <IconButton label="Save" onClick={saveEdit} className="text-positive hover:text-positive">
                        <Check />
                      </IconButton>
                      <IconButton label="Cancel" onClick={() => setEditingId(null)}>
                        <X />
                      </IconButton>
                    </div>
                  </li>
                );
              }
              return (
                <li
                  key={exp.id}
                  className={cn(rowGrid, 'group px-5 py-2.5 transition-colors hover:bg-surface-2/60')}
                >
                  <CheckCircle
                    checked={!!exp.paid}
                    onChange={(paid) => onUpdate(exp.id, { paid })}
                    label={exp.paid ? `Mark ${exp.desc} as unpaid` : `Mark ${exp.desc} as paid`}
                  />
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => startEdit(exp)}
                      className={cn(
                        'block max-w-full truncate text-left text-sm',
                        exp.paid ? 'text-fg-3' : 'text-fg'
                      )}
                      title="Edit"
                    >
                      {exp.desc}
                    </button>
                    <CategoryPicker
                      className="mt-1 sm:hidden"
                      value={exp.category || 'Other'}
                      onChange={(category) => onUpdate(exp.id, { category })}
                    />
                  </div>
                  <CategoryPicker
                    className="hidden sm:inline-flex"
                    value={exp.category || 'Other'}
                    onChange={(category) => onUpdate(exp.id, { category })}
                  />
                  <span className={cn('num justify-self-end text-sm font-medium', exp.paid ? 'text-fg-3' : 'text-fg')}>
                    {formatCurrency(exp.amount)}
                  </span>
                  <div className="-mr-2 hidden justify-end gap-0.5 sm:flex sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                    <IconButton label={`Edit ${exp.desc}`} onClick={() => startEdit(exp)}>
                      <Pencil />
                    </IconButton>
                    <IconButton label={`Delete ${exp.desc}`} tone="danger" onClick={() => onDelete(exp)}>
                      <Trash2 />
                    </IconButton>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Footer total */}
          <div className={cn(rowGrid, 'border-t border-line bg-surface-2/50 px-5 py-3')}>
            <span className="w-5" />
            <span className="text-xs font-medium text-fg-3">
              {filter === 'All' ? 'Total' : `${filter} total`}
            </span>
            <span className="hidden sm:block" />
            <span className="num justify-self-end text-sm font-semibold text-fg">{formatCurrency(shownTotal)}</span>
            <span className="hidden sm:block" />
          </div>
        </>
      )}
    </Card>
  );
};
