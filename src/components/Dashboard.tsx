import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, deleteDoc, collection, getDocs, getDoc, disableNetwork, enableNetwork } from "firebase/firestore";
import { auth, db } from '../firebase';
import {
  type PeriodData, type Expense, type ExpenseCategory,
  EXPENSE_CATEGORIES, CATEGORY_COLORS, VALIDATION,
  getPeriodId, getPreviousPeriodId, getJanuaryTemplatePeriodId,
} from '../types';
import { PeriodSelector } from './PeriodSelector';
import { ConfirmDialog } from './ConfirmDialog';
import { useToast } from '../hooks/use-toast';
import { formatCurrency } from '../utils/formatCurrency';
import { exportExpensesCsv } from '../utils/exportCsv';
import { ThemeToggle } from './ThemeToggle';
import { SpendingChart } from './SpendingChart';
import { Analytics } from './Analytics';

type SortField = 'none' | 'desc' | 'amount';
type SortDirection = 'asc' | 'desc';

export const Dashboard: React.FC = () => {
  const [currentView, setCurrentView] = useState<'expenses' | 'analytics'>('expenses');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(getPeriodId());
  const [periodRefreshTrigger, setPeriodRefreshTrigger] = useState<number>(0);
  const { toast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [data, setData] = useState<PeriodData>({ bankBalance: 0, expenses: [] });
  const [newDesc, setNewDesc] = useState<string>('');
  const [newAmount, setNewAmount] = useState<string>('');
  const [newCategory, setNewCategory] = useState<ExpenseCategory>('Other');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editDesc, setEditDesc] = useState<string>('');
  const [editAmount, setEditAmount] = useState<string>('');
  const [editCategory, setEditCategory] = useState<ExpenseCategory>('Other');

  // Category filter
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | 'All'>('All');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('none');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');


  // Previous period data for comparison
  const [prevPeriodTotal, setPrevPeriodTotal] = useState<number | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const docRef = doc(db, "users", user.uid, "periods", selectedPeriodId);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setData(docSnap.data() as PeriodData);
      } else {
        if (!isDeleting) {
          const initialData = { bankBalance: 0, expenses: [] };
          setData(initialData);
          setDoc(docRef, initialData);
        } else {
          setData({ bankBalance: 0, expenses: [] });
        }
      }
    });
    return () => unsubscribe();
  }, [selectedPeriodId, isDeleting]);

  // Fetch previous period total for comparison
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const prevId = getPreviousPeriodId(selectedPeriodId);
    const prevRef = doc(db, "users", user.uid, "periods", prevId);

    getDoc(prevRef).then((snap) => {
      if (snap.exists()) {
        const prevData = snap.data() as PeriodData;
        const total = prevData.expenses.reduce((sum, e) => sum + e.amount, 0);
        setPrevPeriodTotal(total);
      } else {
        setPrevPeriodTotal(null);
      }
    }).catch(() => setPrevPeriodTotal(null));
  }, [selectedPeriodId]);

  // Auto-create January template periods on first login
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const createJanuaryTemplates = async () => {
      const currentYear = new Date().getFullYear();

      const templates = [
        { id: `${currentYear}-1-1`, name: 'January 1st Half' },
        { id: `${currentYear}-1-2`, name: 'January 2nd Half' }
      ];

      for (const template of templates) {
        const templateRef = doc(db, "users", user.uid, "periods", template.id);
        const templateDoc = await getDocs(collection(db, "users", user.uid, "periods"));
        const exists = templateDoc.docs.some(doc => doc.id === template.id);

        if (!exists) {
          console.log(`Creating ${template.name} template`);
          await setDoc(templateRef, { bankBalance: 0, expenses: [] });
        }
      }
    };

    createJanuaryTemplates();
  }, []);

  const updateDb = async (newData: PeriodData) => {
    const user = auth.currentUser;
    if (!user) return;
    await setDoc(doc(db, "users", user.uid, "periods", selectedPeriodId), newData, { merge: true });
  };

  const validateDesc = (desc: string): string | null => {
    if (!desc.trim()) return 'Description is required';
    if (desc.length > VALIDATION.DESC_MAX_LENGTH) return `Description must be ${VALIDATION.DESC_MAX_LENGTH} characters or less`;
    return null;
  };

  const validateAmount = (amount: string): string | null => {
    const val = parseFloat(amount);
    if (isNaN(val)) return 'Amount must be a valid number';
    if (val < VALIDATION.AMOUNT_MIN) return `Amount must be at least ${formatCurrency(VALIDATION.AMOUNT_MIN)}`;
    if (val > VALIDATION.AMOUNT_MAX) return `Amount cannot exceed ${formatCurrency(VALIDATION.AMOUNT_MAX)}`;
    return null;
  };

  const addExpense = () => {
    const descError = validateDesc(newDesc);
    const amountError = validateAmount(newAmount);

    if (descError || amountError) {
      toast({
        title: "Validation Error",
        description: descError || amountError || '',
        variant: "destructive",
      });
      return;
    }

    const amountVal = parseFloat(newAmount);

    const newExpense: Expense = {
      id: Date.now(),
      desc: newDesc.trim(),
      amount: amountVal,
      category: newCategory,
    };

    const newData = { ...data, expenses: [...data.expenses, newExpense] };
    setData(newData);
    updateDb(newData);

    setNewDesc('');
    setNewAmount('');
    setNewCategory('Other');
  };

  const deleteExpense = (expenseId: number) => {
    const newData = { ...data, expenses: data.expenses.filter(exp => exp.id !== expenseId) };
    setData(newData);
    updateDb(newData);
  };

  const startEditing = (expense: Expense) => {
    setEditingExpense(expense);
    setEditDesc(expense.desc);
    setEditAmount(expense.amount.toString());
    setEditCategory(expense.category || 'Other');
  };

  const cancelEditing = () => {
    setEditingExpense(null);
    setEditDesc('');
    setEditAmount('');
    setEditCategory('Other');
  };

  const saveEditing = () => {
    if (!editingExpense) return;

    const descError = validateDesc(editDesc);
    const amountError = validateAmount(editAmount);

    if (descError || amountError) {
      toast({
        title: "Validation Error",
        description: descError || amountError || '',
        variant: "destructive",
      });
      return;
    }

    const amountVal = parseFloat(editAmount);

    const updatedExpenses = data.expenses.map(exp =>
      exp.id === editingExpense.id
        ? { ...exp, desc: editDesc.trim(), amount: amountVal, category: editCategory }
        : exp
    );

    const newData = { ...data, expenses: updatedExpenses };
    setData(newData);
    updateDb(newData);

    cancelEditing();
  };

  const handleDeleteConfirm = () => {
    setShowDeleteConfirm(true);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Logout Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const executeDeletePeriod = async () => {
    setIsDeleting(true);

    const user = auth.currentUser;
    if (!user) {
      console.error('No authenticated user found');
      toast({
        title: "Authentication Required",
        description: "You must be logged in to delete periods",
        variant: "destructive",
      });
      setIsDeleting(false);
      return;
    }

    try {
      const periodsRef = collection(db, "users", user.uid, "periods");
      const querySnapshot = await getDocs(periodsRef);
      const existingPeriods = querySnapshot.docs
        .map(doc => doc.id)
        .filter(id => id !== selectedPeriodId)
        .sort((a, b) => b.localeCompare(a));

      const docRef = doc(db, "users", user.uid, "periods", selectedPeriodId);
      await deleteDoc(docRef);

      try {
        await disableNetwork(db);
        await enableNetwork(db);
      } catch (syncError) {
        console.warn('Network sync failed:', syncError);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      const freshDocRef = doc(db, "users", user.uid, "periods", selectedPeriodId);
      const verifyDocSnap = await getDoc(freshDocRef);

      if (verifyDocSnap.exists()) {
        await deleteDoc(freshDocRef);
        await new Promise(resolve => setTimeout(resolve, 1000));
        const finalCheck = await getDoc(freshDocRef);

        if (finalCheck.exists()) {
          toast({
            title: "Delete Failed",
            description: "Unable to delete document from database",
            variant: "destructive",
          });
          setIsDeleting(false);
          return;
        }
      }

      let nextPeriodId;
      if (existingPeriods.length > 0) {
        nextPeriodId = existingPeriods[0];
      } else {
        nextPeriodId = getPeriodId();
      }

      setSelectedPeriodId(nextPeriodId);
      setPeriodRefreshTrigger(prev => prev + 1);

      toast({
        title: "Period Deleted",
        description: `Period "${selectedPeriodId}" has been deleted successfully!`,
      });
    } catch (error) {
      console.error('Error deleting period:', error);
      toast({
        title: "Delete Error",
        description: `Error deleting period: ${error}`,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const createNewPeriod = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const [year, month, half] = selectedPeriodId.split('-').map(Number);
    let nextYear = year;
    let nextMonth = month;
    const nextHalf = half === 1 ? 2 : 1;

    if (half === 2) {
      if (nextMonth === 12) {
        nextMonth = 1;
        nextYear = year + 1;
      } else {
        nextMonth = nextMonth + 1;
      }
    }

    const nextPeriodId = `${nextYear}-${nextMonth}-${nextHalf}`;

    const periodsRef = collection(db, "users", user.uid, "periods");
    const allPeriodsDoc = await getDocs(periodsRef);
    const existingPeriods = allPeriodsDoc.docs
      .filter(doc => {
        const data = doc.data();
        return !data._deleted;
      })
      .map(doc => doc.id);

    if (existingPeriods.includes(nextPeriodId)) {
      toast({
        title: "Period Exists",
        description: "Next period already exists!",
        variant: "destructive",
      });
      return;
    }

    try {
      const templatePeriodId = getJanuaryTemplatePeriodId(nextPeriodId);

      let templateExpenses: Expense[] = [];
      const templateData = allPeriodsDoc.docs.find(d => d.id === templatePeriodId)?.data() as PeriodData | undefined;

      if (templateData?.expenses) {
        templateExpenses = templateData.expenses;
      }

      const newPeriodData: PeriodData = {
        bankBalance: 0,
        expenses: templateExpenses,
      };

      await setDoc(doc(db, "users", user.uid, "periods", nextPeriodId), newPeriodData);
      setSelectedPeriodId(nextPeriodId);
    } catch (error) {
      console.error('Error creating new period:', error);
    }
  };

  // Sorting logic
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortField('none');
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIndicator = (field: SortField) => {
    if (sortField !== field) return ' \u2195';
    return sortDirection === 'asc' ? ' \u2191' : ' \u2193';
  };

  // Filter and sort expenses
  const filteredAndSortedExpenses = (() => {
    let result = data.expenses;

    if (filterCategory !== 'All') {
      result = result.filter(e => (e.category || 'Other') === filterCategory);
    }

    if (sortField !== 'none') {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        if (sortField === 'desc') {
          cmp = a.desc.localeCompare(b.desc);
        } else if (sortField === 'amount') {
          cmp = a.amount - b.amount;
        }
        return sortDirection === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  })();

  // Calculations
  const totalExpenses = data.expenses.reduce((sum, item) => sum + item.amount, 0);
  const totalAvailable = data.bankBalance - totalExpenses;

  // Category breakdown (excluding Savings)
  const categoryBreakdown = data.expenses.reduce<Record<string, number>>((acc, exp) => {
    const cat = exp.category || 'Other';
    if (cat !== 'Savings') {
      acc[cat] = (acc[cat] || 0) + exp.amount;
    }
    return acc;
  }, {});

  // Period comparison
  const periodDiff = prevPeriodTotal !== null ? totalExpenses - prevPeriodTotal : null;

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val > VALIDATION.BALANCE_MAX) {
      toast({
        title: "Validation Error",
        description: `Balance cannot exceed ${formatCurrency(VALIDATION.BALANCE_MAX)}`,
        variant: "destructive",
      });
      return;
    }
    const newData = { ...data, bankBalance: isNaN(val) ? 0 : val };
    setData(newData);
    updateDb(newData);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-3">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 pb-3 mb-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#333f8b] to-[#4a5fa8] bg-clip-text text-transparent">Expense Tracker</h1>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded p-0.5">
                  <button
                    onClick={() => setCurrentView('expenses')}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      currentView === 'expenses'
                        ? 'bg-[#5e6aba] dark:bg-[#333f8b] text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >Expenses</button>
                  <button
                    onClick={() => setCurrentView('analytics')}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      currentView === 'analytics'
                        ? 'bg-[#5e6aba] dark:bg-[#333f8b] text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >Analytics</button>
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-3 py-1.5 text-sm rounded text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700 transition-colors"
                >
                  Sign Out
                </button>
              </div>
              {auth.currentUser && (
                <span className="text-xs text-gray-500 dark:text-gray-400">{auth.currentUser.email}</span>
              )}
            </div>
          </div>
        </div>

        {currentView === 'expenses' && (
          <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 mb-4">
            <PeriodSelector
              currentPeriodId={selectedPeriodId}
              onPeriodChange={setSelectedPeriodId}
              refreshTrigger={periodRefreshTrigger}
            />
          </div>
        )}

        {currentView === 'analytics' ? (
          <Analytics />
        ) : (
        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* Left column: Balance cards stacked vertically */}
          <div className="col-span-1 space-y-4">
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded p-4">
              <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Bank Balance</label>
              <input
                type="number"
                value={data.bankBalance || ''}
                onChange={handleBalanceChange}
                max={VALIDATION.BALANCE_MAX}
                className="text-xl font-mono p-2 w-full bg-gray-100 dark:bg-[#192028] border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
            <div className={`rounded p-4 border ${totalAvailable >= 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'}`}>
              <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Total Available</label>
              <div className={`text-2xl font-mono font-bold ${totalAvailable >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(totalAvailable)}
              </div>
            </div>

            {/* Spending Summary */}
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded p-4">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Spending Summary</h3>
              <div className="text-lg font-mono font-bold text-gray-900 dark:text-gray-100 mb-2">
                {formatCurrency(totalExpenses)}
              </div>
              {periodDiff !== null && (
                <div className={`text-xs font-mono mb-3 ${periodDiff > 0 ? 'text-red-500 dark:text-red-400' : periodDiff < 0 ? 'text-green-500 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {periodDiff > 0 ? '+' : ''}{formatCurrency(periodDiff)} vs last period
                </div>
              )}
              {Object.keys(categoryBreakdown).length > 0 && (
                <div className="space-y-1">
                  {Object.entries(categoryBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, amount]) => {
                      const colors = CATEGORY_COLORS[cat as ExpenseCategory] || CATEGORY_COLORS.Other;
                      return (
                        <div key={cat} className="flex items-center justify-between text-xs">
                          <span className={`px-1.5 py-0.5 rounded ${colors.bg} ${colors.text} border ${colors.border}`}>
                            {cat}
                          </span>
                          <span className="font-mono text-gray-600 dark:text-gray-400">{formatCurrency(amount)}</span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            <SpendingChart expenses={data.expenses} />

            <button
              onClick={createNewPeriod}
              className="w-full bg-[#5e6aba] dark:bg-[#333f8b] hover:bg-[#525aa0] dark:hover:bg-[#2a3570] text-white px-3 py-2 rounded text-sm transition-colors mt-2"
              title="Creates next period and copies expenses from January template of current year"
            >
              + New Period
            </button>
            <button
              onClick={() => exportExpensesCsv(data.expenses, selectedPeriodId)}
              className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-100 px-3 py-2 rounded text-sm transition-colors border border-gray-300 dark:border-gray-600"
            >
              Export CSV
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="w-full inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm rounded text-white bg-[#895355] dark:bg-[#6d2123] hover:bg-[#7a4749] dark:hover:bg-[#5a1a1b] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#895355] mt-2"
            >
              Delete This Period
            </button>
          </div>

          {/* Right column: Expenses table spanning 2/3 width */}
          <div className="col-span-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded overflow-hidden min-h-[600px] flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Expenses {selectedPeriodId.split('-')[0]}
            </h2>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 dark:text-gray-400">Filter:</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as ExpenseCategory | 'All')}
                className="text-xs bg-gray-100 dark:bg-[#192028] border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 px-2 py-1 focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Categories</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                <tr>
                  <th
                    className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-900 dark:hover:text-white select-none"
                    onClick={() => handleSort('desc')}
                  >
                    Description{getSortIndicator('desc')}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                  <th
                    className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-900 dark:hover:text-white select-none"
                    onClick={() => handleSort('amount')}
                  >
                    Amount{getSortIndicator('amount')}
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-gray-50 dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAndSortedExpenses.map((ex) => (
                  <tr key={ex.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    {editingExpense?.id === ex.id ? (
                      <>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            maxLength={VALIDATION.DESC_MAX_LENGTH}
                            className="w-full px-2 py-1 bg-gray-100 dark:bg-[#192028] border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            onKeyDown={(e) => e.key === 'Enter' && saveEditing()}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value as ExpenseCategory)}
                            className="w-full px-2 py-1 bg-gray-100 dark:bg-[#192028] border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
                          >
                            {EXPENSE_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            min={VALIDATION.AMOUNT_MIN}
                            max={VALIDATION.AMOUNT_MAX}
                            step="0.01"
                            className="w-full px-2 py-1 bg-gray-100 dark:bg-[#192028] border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 text-right font-mono placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            onKeyDown={(e) => e.key === 'Enter' && saveEditing()}
                          />
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            onClick={saveEditing}
                            className="inline-flex items-center px-2 py-1 border border-transparent text-sm leading-4 rounded text-white bg-green-700 hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="inline-flex items-center px-2 py-1 border border-gray-500 text-sm leading-4 rounded text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                          >
                            Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                          {ex.desc}
                        </td>
                        <td className="px-4 py-3">
                          {(() => {
                            const cat = ex.category || 'Other';
                            return (
                              <select
                                value={cat}
                                onChange={(e) => {
                                  const newCat = e.target.value as ExpenseCategory;
                                  const updatedExpenses = data.expenses.map(exp =>
                                    exp.id === ex.id ? { ...exp, category: newCat } : exp
                                  );
                                  const newData = { ...data, expenses: updatedExpenses };
                                  setData(newData);
                                  updateDb(newData);
                                }}
                                className="text-xs px-2 py-1 rounded border cursor-pointer bg-gray-50 dark:bg-[#192028] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                {EXPENSE_CATEGORIES.map((c) => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200 text-right font-mono">{formatCurrency(ex.amount)}</td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            onClick={() => startEditing(ex)}
                            className="inline-flex items-center px-2 py-1 border border-transparent text-sm leading-4 rounded text-white bg-[#5e6aba] dark:bg-[#333f8b] hover:bg-[#525aa0] dark:hover:bg-[#2a3570] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5e6aba]"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteExpense(ex.id)}
                            className="inline-flex items-center px-2 py-1 border border-transparent text-sm leading-4 rounded text-white bg-[#895355] dark:bg-[#6d2123] hover:bg-[#7a4749] dark:hover:bg-[#5a1a1b] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#895355]"
                          >
                            Delete
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}

                {/* Add new expense row */}
                <tr className="bg-gray-50 dark:bg-gray-700 border-t-2 border-gray-300 dark:border-gray-600">
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      placeholder="Enter expense description..."
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      maxLength={VALIDATION.DESC_MAX_LENGTH}
                      className="w-full px-2 py-1 bg-gray-100 dark:bg-[#192028] border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onKeyDown={(e) => e.key === 'Enter' && addExpense()}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as ExpenseCategory)}
                      className="w-full px-2 py-1 bg-gray-100 dark:bg-[#192028] border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      min={VALIDATION.AMOUNT_MIN}
                      max={VALIDATION.AMOUNT_MAX}
                      step="0.01"
                      className="w-full px-2 py-1 bg-gray-100 dark:bg-[#192028] border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 text-right font-mono placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onKeyDown={(e) => e.key === 'Enter' && addExpense()}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={addExpense}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm rounded text-white bg-[#5e6aba] dark:bg-[#333f8b] hover:bg-[#525aa0] dark:hover:bg-[#2a3570] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5e6aba]"
                    >
                      Add
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {data.expenses.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No expenses yet. Add your first expense above!</p>
            </div>
          )}
          </div>
        </div>
        )}

        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={executeDeletePeriod}
          title="Delete Period"
          description={`Are you sure you want to delete the period "${selectedPeriodId}"? This action cannot be undone.`}
          confirmText="Delete Period"
          cancelText="Cancel"
        />
      </div>
    </div>
  );
};
