import { describe, it, expect, vi } from 'vitest';
import { exportExpensesCsv } from './exportCsv';
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
});
