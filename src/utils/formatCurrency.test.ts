import { describe, it, expect } from 'vitest';
import { formatCurrency } from './formatCurrency';

describe('formatCurrency', () => {
  it('formats positive amounts', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats negative amounts', () => {
    expect(formatCurrency(-50)).toBe('-$50.00');
  });

  it('formats small amounts with two decimal places', () => {
    expect(formatCurrency(0.01)).toBe('$0.01');
  });

  it('adds trailing zeros', () => {
    expect(formatCurrency(100)).toBe('$100.00');
  });
});
