import React, { useState, useSyncExternalStore } from 'react';
import { doc } from "firebase/firestore";
import { CalendarPlus, ChevronLeft, ChevronRight, Download, Plus, Sparkles, Trash2 } from 'lucide-react';
import { auth, db } from '../firebase';
import { setDoc, deleteDoc, READ_ONLY, isReadOnlyError } from '../firestoreWrites';
import {
  type PeriodData, type Expense,
  VALIDATION,
  getPeriodId, getPreviousPeriodId, getNextPeriodId,
  getYearFromPeriodId, formatPeriodDisplay, formatPeriodWithYear, newExpenseId,
} from '../types';
import { ConfirmDialog } from './ConfirmDialog';
import { NewPeriodDialog } from './NewPeriodDialog';
import { AppHeader, type View } from './AppHeader';
import { PeriodTimeline } from './PeriodNav';
import { PeriodSummary } from './PeriodSummary';
import { ExpenseList, type ExpenseDraft } from './ExpenseList';
import { CategoryBreakdown } from './CategoryBreakdown';
import { Analytics } from './Analytics';
import { Button, Card, IconButton } from './ui/primitives';
import { ToastAction } from './ui/toast';
import { useToast } from '../hooks/use-toast';
import { useAllPeriods } from '../hooks/useAllPeriods';
import { usePredictionPrefs } from '../hooks/usePredictionPrefs';
import { formatCurrency } from '../utils/formatCurrency';
import { exportExpensesCsv } from '../utils/exportCsv';
import { downloadBackup } from '../utils/backup';
import { periodDateRange, periodTitle, yearRangeFor } from '../utils/periodFormat';

const EMPTY_PERIOD: PeriodData = { bankBalance: 0, expenses: [] };

export const Dashboard: React.FC = () => {
  const hash = useSyncExternalStore(
    (cb) => { window.addEventListener('hashchange', cb); return () => window.removeEventListener('hashchange', cb); },
    () => window.location.hash
  );
  const currentView: View = hash === '#analytics' ? 'analytics' : 'expenses';
  const navigateTo = (view: View) => {
    window.location.hash = view === 'analytics' ? '#analytics' : '#expenses';
  };

  const { periods, loading: periodsLoading } = useAllPeriods();
  const { prefs, pin, ignore, reset } = usePredictionPrefs();
  const { toast } = useToast();

  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(getPeriodId());
  const [selectedYear, setSelectedYear] = useState<number>(getYearFromPeriodId(selectedPeriodId));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newPeriodTarget, setNewPeriodTarget] = useState<string | null>(null);

  const toastReadOnly = () => toast({
    title: "Read-only mode",
    description: "Nothing was saved. Restart with `pnpm run dev` to allow changes.",
  });

  // The selected period comes from the live collection listener. A missing doc means the
  // period hasn't been set up yet; nothing is auto-created.
  const currentRecord = periods.find(p => p.id === selectedPeriodId);
  const periodExists = currentRecord !== undefined;
  const data = currentRecord?.data ?? EMPTY_PERIOD;

  const prevId = getPreviousPeriodId(selectedPeriodId);
  const prevRecord = periods.find(p => p.id === prevId);
  const prevPeriodTotal = prevRecord
    ? prevRecord.data.expenses.reduce((sum, e) => sum + e.amount, 0)
    : null;

  const periodIds = periods.map(p => p.id);
  const isCurrentPeriod = selectedPeriodId === getPeriodId();

  const selectPeriod = (periodId: string) => {
    setSelectedPeriodId(periodId);
    setSelectedYear(getYearFromPeriodId(periodId));
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    // Jump to the latest period of that year, or its first period if none exist yet
    const inYear = periodIds.filter(id => getYearFromPeriodId(id) === year);
    const today = getPeriodId();
    selectPeriod(inYear.length > 0
      ? inYear[inYear.length - 1]
      : getYearFromPeriodId(today) === year ? today : `${year}-1-1`);
  };

  const updateDb = async (newData: PeriodData) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid, "periods", selectedPeriodId), newData, { merge: true });
    } catch (error) {
      if (isReadOnlyError(error)) return toastReadOnly();
      console.error('Error saving period:', error);
      toast({
        title: "Couldn't save",
        description: "Your change could not be saved. Please try again.",
        variant: "destructive",
      });
    }
  };

  const validate = (draft: ExpenseDraft): string | null => {
    if (!draft.desc.trim()) return 'Add a description';
    if (draft.desc.length > VALIDATION.DESC_MAX_LENGTH) return `Keep the description under ${VALIDATION.DESC_MAX_LENGTH} characters`;
    const val = parseFloat(draft.amount);
    if (isNaN(val)) return 'Enter an amount';
    if (val < VALIDATION.AMOUNT_MIN) return `The amount must be at least ${formatCurrency(VALIDATION.AMOUNT_MIN)}`;
    if (val > VALIDATION.AMOUNT_MAX) return `The amount can't exceed ${formatCurrency(VALIDATION.AMOUNT_MAX)}`;
    return null;
  };

  const rejectIfInvalid = (draft: ExpenseDraft): boolean => {
    const error = validate(draft);
    if (error) toast({ title: "Check the expense", description: error, variant: "destructive" });
    return !!error;
  };

  const addExpense = (draft: ExpenseDraft): boolean => {
    if (rejectIfInvalid(draft)) return false;
    const newExpense: Expense = {
      id: newExpenseId(),
      desc: draft.desc.trim(),
      amount: Math.round(parseFloat(draft.amount) * 100) / 100,
      category: draft.category,
      paid: false,
    };
    updateDb({ ...data, expenses: [...data.expenses, newExpense] });
    return true;
  };

  const updateExpense = (expenseId: number, patch: Partial<Expense>) => {
    updateDb({
      ...data,
      expenses: data.expenses.map(exp => exp.id === expenseId ? { ...exp, ...patch } : exp),
    });
  };

  const saveExpense = (expenseId: number, draft: ExpenseDraft): boolean => {
    if (rejectIfInvalid(draft)) return false;
    updateExpense(expenseId, {
      desc: draft.desc.trim(),
      amount: Math.round(parseFloat(draft.amount) * 100) / 100,
      category: draft.category,
    });
    return true;
  };

  const deleteExpense = (expense: Expense) => {
    const before = data;
    updateDb({ ...data, expenses: data.expenses.filter(exp => exp.id !== expense.id) });
    if (READ_ONLY) return;
    toast({
      title: "Expense deleted",
      description: `${expense.desc} · ${formatCurrency(expense.amount)}`,
      action: (
        <ToastAction altText="Undo delete" onClick={() => updateDb(before)}>
          Undo
        </ToastAction>
      ),
    });
  };

  const handleBackup = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const count = await downloadBackup(user.uid);
      toast({ title: "Backup downloaded", description: `${count} periods saved to a JSON file.` });
    } catch (error) {
      console.error('Error creating backup:', error);
      toast({ title: "Couldn't create the backup", description: "Check your connection and try again.", variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Couldn't sign out",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const executeDeletePeriod = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const deletedId = selectedPeriodId;
    try {
      await deleteDoc(doc(db, "users", user.uid, "periods", deletedId));
      const remaining = periodIds.filter(id => id !== deletedId);
      selectPeriod(remaining.length > 0 ? remaining[remaining.length - 1] : getPeriodId());
      toast({ title: "Period deleted", description: `${formatPeriodWithYear(deletedId)} was removed.` });
    } catch (error) {
      if (isReadOnlyError(error)) return toastReadOnly();
      console.error('Error deleting period:', error);
      toast({
        title: "Couldn't delete the period",
        description: String(error),
        variant: "destructive",
      });
    }
  };

  const openNewPeriod = () => {
    // Looking at a period that isn't set up yet: set up that one, not the one after it
    if (!periodExists) return setNewPeriodTarget(selectedPeriodId);
    const nextPeriodId = getNextPeriodId(selectedPeriodId);
    const existing = periods.find(p => p.id === nextPeriodId);
    if (existing && existing.data.expenses.length > 0) {
      selectPeriod(nextPeriodId);
      toast({
        title: "Already set up",
        description: `${formatPeriodWithYear(nextPeriodId)} exists, so it's open now.`,
      });
      return;
    }
    setNewPeriodTarget(nextPeriodId);
  };

  const createPeriod = async (periodId: string, periodData: PeriodData) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid, "periods", periodId), periodData);
      selectPeriod(periodId);
      toast({
        title: "Period created",
        description: `${formatPeriodWithYear(periodId)} starts with ${periodData.expenses.length} expenses.`,
      });
    } catch (error) {
      if (isReadOnlyError(error)) {
        toastReadOnly();
        throw error;
      }
      console.error('Error creating new period:', error);
      toast({
        title: "Couldn't create the period",
        description: String(error),
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleBalanceChange = (value: number) => {
    if (value > VALIDATION.BALANCE_MAX) {
      toast({
        title: "Balance too large",
        description: `The balance can't exceed ${formatCurrency(VALIDATION.BALANCE_MAX)}.`,
        variant: "destructive",
      });
      return;
    }
    updateDb({ ...data, bankBalance: Math.max(0, value) });
  };

  // Calculations
  const totalExpenses = data.expenses.reduce((sum, item) => sum + item.amount, 0);
  const savings = data.expenses.reduce((sum, e) => sum + (e.category === 'Savings' ? e.amount : 0), 0);
  const paidAmount = data.expenses.reduce((sum, item) => sum + (item.paid ? item.amount : 0), 0);
  const paidCount = data.expenses.filter(e => e.paid).length;

  return (
    <div className="min-h-screen bg-canvas text-fg">
      <AppHeader
        view={currentView}
        onViewChange={navigateTo}
        email={auth.currentUser?.email ?? null}
        onSignOut={handleLogout}
        onBackup={handleBackup}
      />

      {READ_ONLY && (
        <div role="status" className="border-b border-warning/30 bg-warning-soft px-4 py-2 text-center text-[13px] text-warning">
          <strong className="font-semibold">Read-only mode.</strong> You're viewing live data, but nothing you change here is saved.
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
        {currentView === 'analytics' ? (
          <Analytics periods={periods} loading={periodsLoading} />
        ) : (
          <div className="space-y-5">
            {/* Period header */}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex gap-0.5">
                  <IconButton label="Previous period" onClick={() => selectPeriod(getPreviousPeriodId(selectedPeriodId))}>
                    <ChevronLeft />
                  </IconButton>
                  <IconButton label="Next period" onClick={() => selectPeriod(getNextPeriodId(selectedPeriodId))}>
                    <ChevronRight />
                  </IconButton>
                </div>
                <div>
                  <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-fg sm:text-2xl">
                    {periodTitle(selectedPeriodId)}
                    {isCurrentPeriod && (
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent-fg">
                        Current
                      </span>
                    )}
                  </h1>
                  <p className="text-sm text-fg-3">{periodDateRange(selectedPeriodId)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {periodExists && (
                  <>
                    <IconButton label="Export as CSV" onClick={() => exportExpensesCsv(data.expenses, selectedPeriodId)}>
                      <Download />
                    </IconButton>
                    <IconButton label="Delete this period" tone="danger" onClick={() => setShowDeleteConfirm(true)}>
                      <Trash2 />
                    </IconButton>
                  </>
                )}
                <Button variant="primary" className="ml-2" onClick={openNewPeriod}>
                  <Plus className="h-4 w-4" />
                  New period
                </Button>
              </div>
            </div>

            <Card className="px-3 py-3 sm:px-4">
              <PeriodTimeline
                periodIds={periodIds}
                selectedPeriodId={selectedPeriodId}
                selectedYear={selectedYear}
                yearRange={yearRangeFor(periodIds, selectedPeriodId)}
                onSelect={selectPeriod}
                onYearChange={handleYearChange}
              />
            </Card>

            {periodsLoading ? (
              <div className="space-y-5" aria-busy="true" aria-label="Loading">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {[0, 1, 2, 3].map(i => <div key={i} className="h-[104px] animate-pulse rounded-xl bg-surface-2" />)}
                </div>
                <div className="h-96 animate-pulse rounded-xl bg-surface-2" />
              </div>
            ) : !periodExists ? (
              <Card className="flex flex-col items-center px-6 py-16 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-fg">
                  <CalendarPlus className="h-6 w-6" />
                </span>
                <h2 className="mt-4 text-lg font-semibold text-fg">This period isn't set up yet</h2>
                <p className="mt-1 max-w-md text-sm text-fg-3">
                  Start {formatPeriodWithYear(selectedPeriodId)} from your usual expenses. We'll suggest them from your
                  history, and you review everything before it's saved.
                </p>
                <Button variant="primary" className="mt-6" onClick={() => setNewPeriodTarget(selectedPeriodId)}>
                  <Sparkles className="h-4 w-4" />
                  Set up with predictions
                </Button>
              </Card>
            ) : (
              <>
                <PeriodSummary
                  key={selectedPeriodId}
                  bankBalance={data.bankBalance}
                  onBankBalanceChange={handleBalanceChange}
                  totalPlanned={totalExpenses}
                  savings={savings}
                  prevTotal={prevPeriodTotal}
                  prevLabel={formatPeriodDisplay(prevId)}
                  paidAmount={paidAmount}
                  paidCount={paidCount}
                  count={data.expenses.length}
                />

                <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <ExpenseList
                    key={selectedPeriodId}
                    expenses={data.expenses}
                    onAdd={addExpense}
                    onSave={saveExpense}
                    onUpdate={updateExpense}
                    onDelete={deleteExpense}
                    onFillPredictions={() => setNewPeriodTarget(selectedPeriodId)}
                  />
                  <div className="lg:sticky lg:top-20">
                    <CategoryBreakdown expenses={data.expenses} />
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={executeDeletePeriod}
        title={`Delete ${formatPeriodWithYear(selectedPeriodId)}?`}
        description={`This removes the period and its ${data.expenses.length} expenses. This can't be undone.`}
        confirmText="Delete period"
        cancelText="Cancel"
      />

      <NewPeriodDialog
        isOpen={newPeriodTarget !== null}
        onClose={() => setNewPeriodTarget(null)}
        targetPeriodId={newPeriodTarget ?? selectedPeriodId}
        periods={periods}
        prefs={prefs}
        onPin={pin}
        onIgnore={ignore}
        onReset={reset}
        onCreate={(periodData) => createPeriod(newPeriodTarget ?? selectedPeriodId, periodData)}
      />
    </div>
  );
};
