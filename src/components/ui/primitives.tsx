import React from 'react';
import { cn } from '@/utils/cn';
import { categoryColor } from '@/utils/chartColors';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

const buttonBase =
  'inline-flex items-center justify-center gap-1.5 rounded-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  secondary: 'bg-surface border border-line-strong text-fg hover:bg-surface-2',
  ghost: 'text-fg-2 hover:text-fg hover:bg-surface-2',
  // on-accent is white in light and near-black in dark, which also reads on the lighter dark-mode red
  danger: 'bg-negative text-on-accent hover:opacity-90',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-9 px-4 text-sm',
};

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }
>(({ variant = 'secondary', size = 'md', className, type = 'button', ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)}
    {...props}
  />
));
Button.displayName = 'Button';

export const IconButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: 'default' | 'danger' }
>(({ label, tone = 'default', className, type = 'button', ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    aria-label={label}
    title={label}
    className={cn(
      'inline-flex h-8 w-8 items-center justify-center rounded-sm text-fg-3 transition-colors disabled:opacity-40 [&_svg]:h-4 [&_svg]:w-4',
      tone === 'danger'
        ? 'hover:text-negative hover:bg-negative-soft'
        : 'hover:text-fg hover:bg-surface-2',
      className
    )}
    {...props}
  />
));
IconButton.displayName = 'IconButton';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('rounded-md border border-line bg-surface shadow-[var(--shadow-card)]', className)} {...props} />
);

/** A row of headline figures in one bordered strip, split by hairlines (2 columns on phones, 4 on desktop). */
export const StatGroup: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div
    className={cn(
      'grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line shadow-[var(--shadow-card)] lg:grid-cols-4',
      className
    )}
    {...props}
  />
);

export const Stat: React.FC<{ label: string; children: React.ReactNode; footer?: React.ReactNode; className?: string }> = ({
  label,
  children,
  footer,
  className,
}) => (
  <div className={cn('flex min-w-0 flex-col bg-surface px-4 py-4 sm:px-5 sm:py-5', className)}>
    <span className="text-xs font-medium text-fg-3">{label}</span>
    <div className="mt-1.5">{children}</div>
    {footer && <div className="mt-auto pt-3 text-xs text-fg-3">{footer}</div>}
  </div>
);

export const CardHeader: React.FC<{ title: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode; className?: string }> = ({
  title,
  subtitle,
  action,
  className,
}) => (
  <div className={cn('flex items-start justify-between gap-3 px-5 pt-5 pb-4', className)}>
    <div className="min-w-0">
      <h3 className="text-sm font-semibold text-fg">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-fg-3">{subtitle}</p>}
    </div>
    {action}
  </div>
);

export const CategoryDot: React.FC<{ category?: string; className?: string }> = ({ category, className }) => (
  <span
    aria-hidden
    className={cn('inline-block h-2 w-2 shrink-0 rounded-xs', className)}
    style={{ backgroundColor: categoryColor(category) }}
  />
);

export const CategoryTag: React.FC<{ category?: string; className?: string }> = ({ category, className }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 rounded-xs bg-surface-2 px-1.5 py-0.5 text-xs font-medium text-fg-2',
      className
    )}
  >
    <CategoryDot category={category} />
    {category || 'Other'}
  </span>
);

/** Checkbox used for "paid" and for selecting predictions. */
export const Checkbox: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  className?: string;
}> = ({ checked, onChange, label, className }) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={checked}
    aria-label={label}
    title={label}
    onClick={() => onChange(!checked)}
    className={cn(
      'inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-xs border transition-colors',
      checked
        ? 'border-accent bg-accent text-on-accent'
        : 'border-line-strong bg-surface hover:border-fg-3',
      className
    )}
  >
    {checked && (
      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="m3.5 8.5 3 3 6-7" />
      </svg>
    )}
  </button>
);

export const Segmented = <T extends string>({
  value,
  options,
  onChange,
  className,
  size = 'md',
}: {
  value: T;
  options: Array<{ value: T; label: React.ReactNode }>;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}) => (
  <div role="tablist" className={cn('inline-flex rounded-sm bg-surface-2 p-0.5', className)}>
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        role="tab"
        aria-selected={o.value === value}
        onClick={() => onChange(o.value)}
        className={cn(
          'rounded-xs font-medium transition-colors',
          size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3.5 text-[13px]',
          o.value === value
            ? 'bg-surface text-fg shadow-[0_0_0_1px_var(--color-line)]'
            : 'text-fg-3 hover:text-fg'
        )}
      >
        {o.label}
      </button>
    ))}
  </div>
);
