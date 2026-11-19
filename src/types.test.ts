import { describe, it, expect } from 'vitest';
import {
  getPeriodId,
  getPreviousPeriodId,
  getPeriodIndex,
  periodIdFromIndex,
  getNextPeriodId,
  isValidPeriodId,
  formatPeriodWithYear,
  formatPeriodDisplay,
  getYearFromPeriodId,
} from './types';

describe('getPeriodId', () => {
  it('returns first half for dates 1-15', () => {
    expect(getPeriodId(new Date(2024, 4, 1))).toBe('2024-5-1');
    expect(getPeriodId(new Date(2024, 4, 15))).toBe('2024-5-1');
  });

  it('returns second half for dates 16-31', () => {
    expect(getPeriodId(new Date(2024, 4, 16))).toBe('2024-5-2');
    expect(getPeriodId(new Date(2024, 4, 31))).toBe('2024-5-2');
  });

  it('handles January correctly', () => {
    expect(getPeriodId(new Date(2024, 0, 1))).toBe('2024-1-1');
  });

  it('handles December correctly', () => {
    expect(getPeriodId(new Date(2024, 11, 20))).toBe('2024-12-2');
  });
});

describe('getPreviousPeriodId', () => {
  it('goes from first half to previous month second half', () => {
    expect(getPreviousPeriodId('2024-5-1')).toBe('2024-4-2');
  });

  it('goes from second half to same month first half', () => {
    expect(getPreviousPeriodId('2024-5-2')).toBe('2024-5-1');
  });

  it('wraps from January first half to previous year December second half', () => {
    expect(getPreviousPeriodId('2024-1-1')).toBe('2023-12-2');
  });

  it('goes from January second half to January first half', () => {
    expect(getPreviousPeriodId('2024-1-2')).toBe('2024-1-1');
  });
});

describe('period index helpers', () => {
  it('consecutive periods differ by one', () => {
    expect(getPeriodIndex('2026-5-2') - getPeriodIndex('2026-5-1')).toBe(1);
    expect(getPeriodIndex('2026-6-1') - getPeriodIndex('2026-5-2')).toBe(1);
    expect(getPeriodIndex('2027-1-1') - getPeriodIndex('2026-12-2')).toBe(1);
  });

  it('round-trips through periodIdFromIndex', () => {
    for (const id of ['2026-1-1', '2026-1-2', '2026-7-1', '2026-12-2', '2027-1-1']) {
      expect(periodIdFromIndex(getPeriodIndex(id))).toBe(id);
    }
  });

  it('getNextPeriodId crosses the year boundary', () => {
    expect(getNextPeriodId('2026-12-2')).toBe('2027-1-1');
    expect(getNextPeriodId('2026-12-1')).toBe('2026-12-2');
    expect(getNextPeriodId('2026-5-2')).toBe('2026-6-1');
  });

  it('isValidPeriodId accepts period ids only', () => {
    expect(isValidPeriodId('2026-12-2')).toBe(true);
    expect(isValidPeriodId('2026-13-1')).toBe(false);
    expect(isValidPeriodId('2026-1-3')).toBe(false);
    expect(isValidPeriodId('settings')).toBe(false);
  });
});

describe('formatPeriodDisplay', () => {
  it('formats first half periods', () => {
    expect(formatPeriodDisplay('2024-1-1')).toBe('Jan 1st');
    expect(formatPeriodDisplay('2024-5-1')).toBe('May 1st');
  });

  it('formats second half periods', () => {
    expect(formatPeriodDisplay('2024-1-2')).toBe('Jan 2nd');
    expect(formatPeriodDisplay('2024-12-2')).toBe('Dec 2nd');
  });

  it('formats with year', () => {
    expect(formatPeriodWithYear('2027-1-1')).toBe('Jan 1st 2027');
  });
});

describe('getYearFromPeriodId', () => {
  it('extracts year from period ID', () => {
    expect(getYearFromPeriodId('2024-5-1')).toBe(2024);
    expect(getYearFromPeriodId('2025-12-2')).toBe(2025);
    expect(getYearFromPeriodId('2023-1-1')).toBe(2023);
  });
});
