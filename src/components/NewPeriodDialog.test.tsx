import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { NewPeriodDialog } from './NewPeriodDialog';
import { toPeriodRecord } from '../hooks/useAllPeriods';
import type { PeriodData } from '../types';

let id = 1;
const periods = ['2026-9-1', '2026-9-2', '2026-10-1', '2026-10-2', '2026-11-1', '2026-11-2'].map((pid) =>
  toPeriodRecord(pid, {
    bankBalance: pid === '2026-11-2' ? 2000 : 0,
    expenses: [
      { id: id++, desc: 'Rent', amount: 1200, category: 'Housing' },
      ...(pid === '2026-10-1' || pid === '2026-11-1'
        ? [{ id: id++, desc: 'Gym', amount: 40, category: 'Health' as const }]
        : []),
    ],
  })
);

const renderDialog = (onCreate = vi.fn<(d: PeriodData) => Promise<void>>().mockResolvedValue()) => {
  const onClose = vi.fn();
  render(
    <NewPeriodDialog
      isOpen
      onClose={onClose}
      targetPeriodId="2026-12-1"
      periods={periods}
      prefs={{ pinned: [], ignored: [] }}
      onPin={vi.fn()}
      onIgnore={vi.fn()}
      onReset={vi.fn()}
      onCreate={onCreate}
    />
  );
  return { onCreate, onClose };
};

afterEach(cleanup);

describe('NewPeriodDialog', () => {
  it('shows predictions and carries over the previous balance', () => {
    renderDialog();
    expect(screen.getByText('Set up Dec 1st 2026')).toBeInTheDocument();
    expect(screen.getByText('Rent')).toBeInTheDocument();
    expect(screen.getByText('Gym')).toBeInTheDocument();
    // Nov 2nd: 2000 balance - 1200 rent = 800 left
    expect(screen.getByDisplayValue('800')).toBeInTheDocument();
    expect(screen.getByLabelText('Include Rent')).toBeChecked();
  });

  it('creates the period with the checked expenses and edited amounts', async () => {
    const { onCreate, onClose } = renderDialog();
    fireEvent.change(screen.getByLabelText('Amount for Rent'), { target: { value: '1250' } });
    fireEvent.click(screen.getByLabelText('Include Gym'));
    const gymChecked = screen.getByLabelText('Include Gym').getAttribute('aria-checked') === 'true';
    fireEvent.click(screen.getByRole('button', { name: 'Create period' }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    const data = onCreate.mock.calls[0][0];
    expect(data.bankBalance).toBe(800);
    const rent = data.expenses.find((e) => e.desc === 'Rent');
    expect(rent).toMatchObject({ amount: 1250, category: 'Housing', paid: false });
    expect(data.expenses.some((e) => e.desc === 'Gym')).toBe(gymChecked);
    expect(new Set(data.expenses.map((e) => e.id)).size).toBe(data.expenses.length);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('blocks creating with an invalid amount', () => {
    const { onCreate } = renderDialog();
    fireEvent.change(screen.getByLabelText('Amount for Rent'), { target: { value: '' } });
    expect(screen.getByRole('button', { name: 'Create period' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Create period' }));
    expect(onCreate).not.toHaveBeenCalled();
  });
});
