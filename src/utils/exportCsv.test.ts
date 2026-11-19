import { describe, it, expect, vi } from 'vitest';
import { exportExpensesCsv, buildExpensesCsv } from './exportCsv';
import type { Expense } from '../types';

describe('exportExpensesCsv', () => {
  it('generates CSV and triggers download', () => {
    const mockClick = vi.fn();
    const mockCreateObjectURL = vi.fn(() => 'blob:test');
    const mockRevokeObjectURL = vi.fn();

    vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: mockClick,
    } as unknown as HTMLElement);
    vi.stubGlobal('URL', {
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    });

    const expenses: Expense[] = [
      { id: 1, desc: 'Rent', amount: 1500, category: 'Housing' },
      { id: 2, desc: 'Groceries', amount: 200, category: 'Food' },
    ];

    exportExpensesCsv(expenses, '2024-5-1');

    expect(mockClick).toHaveBeenCalled();
    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test');
  });

  it('includes a Paid column and escapes quotes', () => {
    const csv = buildExpensesCsv([
      { id: 1, desc: 'Rent "May"', amount: 1500, category: 'Housing', paid: true },
      { id: 2, desc: 'Groceries', amount: 200.5, category: 'Food' },
    ]);
    expect(csv.split('\n')).toEqual([
      'Description,Amount,Category,Paid',
      '"Rent ""May""",1500.00,Housing,Yes',
      '"Groceries",200.50,Food,No',
    ]);
  });
});
