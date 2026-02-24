import { describe, it, expect } from 'vitest';
import {
  getPeriodId,
  getPreviousPeriodId,
  getJanuaryTemplatePeriodId,
  formatPeriodDisplay,
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

describe('getJanuaryTemplatePeriodId', () => {
  it('maps first half to January first half of same year', () => {
    expect(getJanuaryTemplatePeriodId('2024-5-1')).toBe('2024-1-1');
  });

  it('maps second half to January second half of same year', () => {
    expect(getJanuaryTemplatePeriodId('2024-8-2')).toBe('2024-1-2');
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
});
