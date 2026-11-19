import React from 'react';
import { cn } from '@/utils/cn';
import { categoryColor } from '@/utils/chartColors';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

const buttonBase =
  'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-hover shadow-sm',
  secondary: 'bg-surface border border-line-strong text-fg hover:bg-surface-2',
  ghost: 'text-fg-2 hover:text-fg hover:bg-surface-2',
  danger: 'bg-negative text-white hover:opacity-90',
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
      'inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-3 transition-colors disabled:opacity-40 [&_svg]:h-4 [&_svg]:w-4',
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
  <div className={cn('rounded-xl border border-line bg-surface shadow-[var(--shadow-card)]', className)} {...props} />
);

export const CardHeader: React.FC<{ title: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode; className?: string }> = ({
  title,
  subtitle,
  action,
  className,
}) => (
  <div className={cn('flex items-start justify-between gap-3 px-5 pt-4 pb-3', className)}>
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
    className={cn('inline-block h-2 w-2 shrink-0 rounded-full', className)}
    style={{ backgroundColor: categoryColor(category) }}
  />
);

export const CategoryTag: React.FC<{ category?: string; className?: string }> = ({ category, className }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-2 py-0.5 text-xs font-medium text-fg-2',
      className
    )}
  >
    <CategoryDot category={category} />
    {category || 'Other'}
  </span>
);

/** Rounded checkbox used for "paid" and for selecting predictions. */
export const CheckCircle: React.FC<{
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
      'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
      checked
        ? 'border-accent bg-accent text-white'
        : 'border-line-strong bg-surface hover:border-accent',
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
  <div role="tablist" className={cn('inline-flex rounded-lg bg-surface-2 p-0.5', className)}>
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        role="tab"
        aria-selected={o.value === value}
        onClick={() => onChange(o.value)}
        className={cn(
          'rounded-md font-medium transition-colors',
          size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3.5 text-[13px]',
          o.value === value
            ? 'bg-surface text-fg shadow-[var(--shadow-card)]'
            : 'text-fg-3 hover:text-fg'
        )}
      >
        {o.label}
      </button>
    ))}
  </div>
);
