import React from 'react';
import { cn } from '@/utils/cn';

/**
 * The "split month" mark: one month as two cells, the first half filled.
 * Drawn on a 24-unit grid; the tile follows the ink accent so it flips with the theme.
 * public/favicon.svg and the PWA icons are the same drawing with fixed colors.
 */
export const Logo: React.FC<{ size?: number; className?: string }> = ({ size = 28, className }) => {
  // Keep the corner radius small in real pixels at every size (3px up to 32px, 4px above)
  const radius = ((size <= 32 ? 3 : 4) * 24) / size;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      className={cn('block shrink-0 text-on-accent', className)}
    >
      <rect width="24" height="24" rx={radius} className="fill-accent" />
      <rect x="5.5" y="6" width="5.75" height="12" rx="1" fill="currentColor" />
      <rect x="13.25" y="6.75" width="4.5" height="10.5" rx="0.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
};
