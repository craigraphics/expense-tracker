import { cn } from '@/utils/cn';

export const inputClass =
  'h-9 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-fg placeholder:text-fg-3 transition-colors hover:border-fg-3/50 focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20';

export const selectClass = cn(
  inputClass,
  'appearance-none bg-[length:16px] bg-[position:right_8px_center] bg-no-repeat pr-8',
  "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23858da0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]"
);
