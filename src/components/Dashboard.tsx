import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, deleteDoc, collection, getDocs, getDoc, disableNetwork, enableNetwork } from "firebase/firestore";
import { auth, db } from '../firebase';
import { type PeriodData, type Expense, getPeriodId, getJanuaryTemplatePeriodId } from '../types';
import { PeriodSelector } from './PeriodSelector';
import { ConfirmDialog } from './ConfirmDialog';
import { useToast } from '../hooks/use-toast';

export const Dashboard: React.FC = () => {
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(getPeriodId());
  const [periodRefreshTrigger, setPeriodRefreshTrigger] = useState<number>(0);
  const { toast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [data, setData] = useState<PeriodData>({ bankBalance: 0, expenses: [] });
  const [newDesc, setNewDesc] = useState<string>('');
  const [newAmount, setNewAmount] = useState<string>('');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editDesc, setEditDesc] = useState<string>('');
  const [editAmount, setEditAmount] = useState<string>('');


  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Path: users/{uid}/periods/{periodId}
    const docRef = doc(db, "users", user.uid, "periods", selectedPeriodId);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setData(docSnap.data() as PeriodData);
      } else {
        // Only create documents if we're not in a deleting state
        if (!isDeleting) {
          const initialData = { bankBalance: 0, expenses: [] };
          setData(initialData);
          // Create the document
          setDoc(docRef, initialData);
        } else {
          // During deletion, just set empty data without creating
          setData({ bankBalance: 0, expenses: [] });
        }
      }
    });
    return () => unsubscribe();
  }, [selectedPeriodId, isDeleting]);

  // Auto-create January template periods on first login
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const createJanuaryTemplates = async () => {
      const currentYear = new Date().getFullYear();

      // Create Jan 1st and Jan 2nd templates if they don't exist
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

  const addExpense = () => {
    if (!newDesc || !newAmount) return;
    const amountVal = parseFloat(newAmount);
    if (isNaN(amountVal)) return;

    const newExpense: Expense = {
      id: Date.now(),
      desc: newDesc,
      amount: amountVal
    };

    const newData = { ...data, expenses: [...data.expenses, newExpense] };
    // Optimistic update
    setData(newData);
    updateDb(newData);

    setNewDesc('');
    setNewAmount('');
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
  };

  const cancelEditing = () => {
    setEditingExpense(null);
    setEditDesc('');
    setEditAmount('');
  };

  const saveEditing = () => {
    if (!editingExpense || !editDesc || !editAmount) return;
    const amountVal = parseFloat(editAmount);
    if (isNaN(amountVal)) return;

    const updatedExpenses = data.expenses.map(exp =>
      exp.id === editingExpense.id
        ? { ...exp, desc: editDesc, amount: amountVal }
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

    console.log('Current user:', user.uid);
    console.log('Selected period to delete:', selectedPeriodId);

    try {
      // First, get all existing periods to find a safe one to switch to
      const periodsRef = collection(db, "users", user.uid, "periods");
      const querySnapshot = await getDocs(periodsRef);
      const existingPeriods = querySnapshot.docs
        .map(doc => doc.id)
        .filter(id => id !== selectedPeriodId) // Exclude the one we're deleting
        .sort((a, b) => b.localeCompare(a)); // Sort newest first

      console.log('Existing periods before deletion:', querySnapshot.docs.map(doc => doc.id));
      console.log('Existing periods after filtering deleted one:', existingPeriods);

      // Actually delete the document from Firestore
      const docRef = doc(db, "users", user.uid, "periods", selectedPeriodId);
      console.log('Document reference:', docRef.path);

      await deleteDoc(docRef);
      console.log(`Successfully deleted period: ${selectedPeriodId}`);

      // Force a network sync to ensure deletion is reflected
      try {
        await disableNetwork(db);
        await enableNetwork(db);
        console.log('Network sync completed');
      } catch (syncError) {
        console.warn('Network sync failed:', syncError);
      }

      // Wait a bit and try to force a refresh
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Try to get a fresh reference and check again
      const freshDocRef = doc(db, "users", user.uid, "periods", selectedPeriodId);
      const verifyDocSnap = await getDoc(freshDocRef);
      console.log('Document exists after deletion (fresh check):', verifyDocSnap.exists());

      if (verifyDocSnap.exists()) {
        console.error('ERROR: Document still exists after deletion!');
        console.log('Document data:', verifyDocSnap.data());

        // Try one more time with a different approach
        console.log('Attempting second deletion...');
        await deleteDoc(freshDocRef);

        // Wait again and final check
        await new Promise(resolve => setTimeout(resolve, 1000));
        const finalCheck = await getDoc(freshDocRef);
        console.log('Final check after second deletion:', finalCheck.exists());

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

      // Determine which period to switch to
      let nextPeriodId;
      if (existingPeriods.length > 0) {
        // Switch to the most recent existing period
        nextPeriodId = existingPeriods[0];
        console.log(`Switching to existing period: ${nextPeriodId}`);
      } else {
        // No periods exist, switch to current period (will be auto-created)
        nextPeriodId = getPeriodId();
        console.log(`No periods exist, switching to current period: ${nextPeriodId}`);
      }

      setSelectedPeriodId(nextPeriodId);

      // Force refresh of period selector
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

    // Get the next period (current + 1 half-month)
    const [year, month, half] = selectedPeriodId.split('-').map(Number);
    let nextYear = year;
    let nextMonth = month;
    let nextHalf = half === 1 ? 2 : 1;

    if (half === 2) {
      // Go to next month, first half
      if (nextMonth === 12) {
        nextMonth = 1;
        nextYear = year + 1;
      } else {
        nextMonth = nextMonth + 1;
      }
    }

    const nextPeriodId = `${nextYear}-${nextMonth}-${nextHalf}`;

    // Check if next period already exists (exclude soft-deleted periods)
    const periodsRef = collection(db, "users", user.uid, "periods");
    const allPeriodsDoc = await getDocs(periodsRef);
    const existingPeriods = allPeriodsDoc.docs
      .filter(doc => {
        const data = doc.data();
        return !data._deleted; // Only count non-deleted periods
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
      // Carry over data from January template period of current year
      const templatePeriodId = getJanuaryTemplatePeriodId(nextPeriodId);

      console.log(`Creating new period ${nextPeriodId}, copying expenses from January template: ${templatePeriodId}`);

      let templateExpenses: any[] = [];
      const templateData = allPeriodsDoc.docs.find(d => d.id === templatePeriodId)?.data() as PeriodData;

      if (templateData?.expenses) {
        templateExpenses = templateData.expenses;
        console.log(`Found ${templateExpenses.length} expenses to copy from ${templatePeriodId}`);
      } else {
        console.log(`No January template found for ${templatePeriodId}, creating empty period`);
      }

      // Create new period with carried over expenses from January template
      const newPeriodData: PeriodData = {
        bankBalance: 0, // Reset bank balance
        expenses: templateExpenses // Carry over expenses from January template
      };

      await setDoc(doc(db, "users", user.uid, "periods", nextPeriodId), newPeriodData);

      // Switch to new period
      setSelectedPeriodId(nextPeriodId);
    } catch (error) {
      console.error('Error creating new period:', error);
    }
  };

  // Calculations
  const totalExpenses = data.expenses.reduce((sum, item) => sum + item.amount, 0);
  const totalAvailable = data.bankBalance - totalExpenses;

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const newData = { ...data, bankBalance: isNaN(val) ? 0 : val };
    setData(newData);
    updateDb(newData);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-3">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-800 rounded-sm shadow-sm p-4 mb-4">
          <h1 className="text-xl font-bold text-white mb-3">Expense Tracker</h1>
          <PeriodSelector
            currentPeriodId={selectedPeriodId}
            onPeriodChange={setSelectedPeriodId}
            refreshTrigger={periodRefreshTrigger}
          />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* Left column: Balance cards stacked vertically */}
          <div className="col-span-1 space-y-4">
            <div className="bg-gray-800 border border-gray-700 rounded-sm p-4 shadow-sm">
              <label className="block text-sm font-semibold text-gray-300 mb-2">Bank Balance</label>
              <input
                type="number"
                value={data.bankBalance || ''}
                onChange={handleBalanceChange}
                className="text-xl font-mono p-2 w-full bg-gray-700 border border-gray-600 rounded-sm text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
            <div className={`rounded-sm p-4 shadow-sm border ${totalAvailable >= 0 ? 'bg-green-900/20 border-green-700' : 'bg-red-900/20 border-red-700'}`}>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Total Available</label>
              <div className={`text-2xl font-mono font-bold ${totalAvailable >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${totalAvailable.toFixed(2)}
              </div>
            </div>
            <button
              onClick={createNewPeriod}
              className="w-full bg-blue-800 hover:bg-blue-900 text-white px-3 py-2 rounded-sm text-sm font-medium transition-colors mt-2"
              title="Creates next period and copies expenses from January template of current year"
            >
              + New Period
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="w-full inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-sm text-red-400 bg-red-950 hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 mt-2"
            >
              Delete This Period
            </button>
          </div>

          {/* Right column: Expenses table spanning 2/3 width */}
          <div className="col-span-2 bg-gray-800 border border-gray-700 rounded-sm shadow-sm overflow-hidden min-h-[600px] flex flex-col">
          <div className="px-4 py-3 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">
              Expenses {selectedPeriodId.split('-')[0]}
            </h2>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead className="bg-gray-700 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {data.expenses.map((ex) => (
                  <tr key={ex.id} className="hover:bg-gray-700">
                    {editingExpense?.id === ex.id ? (
                      <>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded-sm text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            onKeyDown={(e) => e.key === 'Enter' && saveEditing()}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded-sm text-white text-right font-mono placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            onKeyDown={(e) => e.key === 'Enter' && saveEditing()}
                          />
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            onClick={saveEditing}
                            className="inline-flex items-center px-2 py-1 border border-transparent text-sm leading-4 font-medium rounded-sm text-white bg-green-800 hover:bg-green-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="inline-flex items-center px-2 py-1 border border-gray-600 text-sm leading-4 font-medium rounded-sm text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                          >
                            Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-sm text-gray-200">{ex.desc}</td>
                        <td className="px-4 py-3 text-sm text-gray-200 text-right font-mono">${ex.amount.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            onClick={() => startEditing(ex)}
                            className="inline-flex items-center px-2 py-1 border border-transparent text-sm leading-4 font-medium rounded-sm text-blue-300 bg-blue-900 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteExpense(ex.id)}
                            className="inline-flex items-center px-2 py-1 border border-transparent text-sm leading-4 font-medium rounded-sm text-red-400 bg-red-950 hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            Delete
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}

                {/* Add new expense row */}
                <tr className="bg-gray-700 border-t-2 border-gray-600">
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      placeholder="Enter expense description..."
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded-sm text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onKeyDown={(e) => e.key === 'Enter' && addExpense()}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      placeholder="0.00"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded-sm text-white text-right font-mono placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onKeyDown={(e) => e.key === 'Enter' && addExpense()}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={addExpense}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-sm text-white bg-blue-800 hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
              <p className="text-gray-400">No expenses yet. Add your first expense above!</p>
            </div>
          )}
          </div>
        </div>

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