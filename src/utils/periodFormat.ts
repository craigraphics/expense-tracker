import { getPeriodId, getYearFromPeriodId } from '../types';

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "Nov 16 – 30, 2026" */
export const periodDateRange = (periodId: string): string => {
  const [year, month, half] = periodId.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const [from, to] = half === 1 ? [1, 15] : [16, lastDay];
  return `${MONTHS[month - 1]} ${from} – ${to}, ${year}`;
};

/** "November · 2nd half" */
export const periodTitle = (periodId: string): string => {
  const [, month, half] = periodId.split('-').map(Number);
  return `${MONTHS_LONG[month - 1]} · ${half === 1 ? '1st' : '2nd'} half`;
};

export const yearRangeFor = (periodIds: string[], selectedPeriodId: string): [number, number] => {
  const years = [...periodIds, selectedPeriodId, getPeriodId()].map(getYearFromPeriodId);
  return [Math.min(...years), Math.max(...years, new Date().getFullYear() + 1)];
};
