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
  default:  'text-slate-700',
  success:  'text-emerald-700',
  warning:  'text-amber-700',
  danger:   'text-red-700',
  info:     'text-blue-700',
  purple:   'text-purple-700',
  indigo:   'text-indigo-700',
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
        'inline-flex items-center gap-1.5 font-semibold',
        size === 'sm' ? 'text-xs' : 'text-sm',
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
