import React from 'react';
import { cn } from '../../lib/utils';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'indigo';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  pulsing?: boolean;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default:  'bg-slate-100 text-slate-700 border border-slate-200',
  success:  'bg-emerald-50 text-emerald-700 border border-emerald-200',
  warning:  'bg-amber-50 text-amber-700 border border-amber-200',
  danger:   'bg-red-50 text-red-700 border border-red-200',
  info:     'bg-blue-50 text-blue-700 border border-blue-200',
  purple:   'bg-purple-50 text-purple-700 border border-purple-200',
  indigo:   'bg-indigo-50 text-indigo-700 border border-indigo-200',
};

const dotColors: Record<BadgeVariant, string> = {
  default:  'bg-slate-400',
  success:  'bg-emerald-500',
  warning:  'bg-amber-500',
  danger:   'bg-red-500',
  info:     'bg-blue-500',
  purple:   'bg-purple-500',
  indigo:   'bg-indigo-500',
};

export function Badge({ children, variant = 'default', size = 'sm', dot = false, pulsing = false, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        variantClasses[variant],
        className
      )}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          {pulsing
            ? <>
                <span className={cn('absolute inline-flex h-full w-full rounded-full animate-ping opacity-75', dotColors[variant])} />
                <span className={cn('relative inline-flex rounded-full h-1.5 w-1.5', dotColors[variant])} />
              </>
            : <span className={cn('inline-flex rounded-full h-1.5 w-1.5', dotColors[variant])} />
          }
        </span>
      )}
      {children}
    </span>
  );
}
