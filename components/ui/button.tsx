'use client';

import React, { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Button Component System
 * Standardized button styles with consistent variants and sizes
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="md" onClick={handleClick}>
 *   Click me
 * </Button>
 * ```
 *
 * @example
 * ```tsx
 * <Button variant="ghost" size="sm" icon={<Plus />} fullWidth>
 *   Add Item
 * </Button>
 * ```
 */

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button visual style */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Make button full width */
  fullWidth?: boolean;
  /** Show loading spinner */
  loading?: boolean;
  /** Icon to show before text */
  icon?: ReactNode;
  /** Additional class names */
  className?: string;
  /** Button content */
  children?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      icon,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseStyles =
      'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    // Variant styles
    const variantStyles = {
      primary:
        'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 active:bg-blue-800',
      secondary:
        'bg-slate-800 border border-slate-700 text-white hover:bg-white/20 focus:ring-white/50 border border-white/20',
      ghost:
        'bg-transparent text-white hover:bg-slate-800 border border-slate-700 focus:ring-white/50',
      danger:
        'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 active:bg-red-800',
      success:
        'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 active:bg-green-800',
    };

    // Size styles - WCAG compliant touch targets
    const sizeStyles = {
      sm: 'text-sm px-4 py-2 min-h-[44px] gap-1.5', // Updated to 44px minimum for WCAG AA
      md: 'text-base px-5 py-2.5 min-h-[48px] gap-2', // Increased for better hierarchy
      lg: 'text-lg px-6 py-3 min-h-[52px] gap-2.5',
    };

    // Full width styles
    const widthStyles = fullWidth ? 'w-full' : '';

    // Loading/disabled states
    const stateStyles =
      loading || disabled ? '' : 'hover:scale-[1.02] active:scale-[0.98]';

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          widthStyles,
          stateStyles,
          className
        )}
        disabled={loading || disabled}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            role="status"
            aria-label="Loading"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {!loading && icon && <span className="flex-shrink-0">{icon}</span>}
        {children && <span>{children}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };

/**
 * Icon Button Component
 * Square button optimized for icons
 */
export interface IconButtonProps
  extends Omit<ButtonProps, 'icon' | 'children'> {
  icon: ReactNode;
  'aria-label': string; // Required for accessibility
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = 'md', className, ...props }, ref) => {
    // Square sizing - WCAG compliant
    const sizeStyles = {
      sm: 'p-2 min-w-[44px] min-h-[44px]', // Updated to 44px minimum for WCAG AA
      md: 'p-2.5 min-w-[48px] min-h-[48px]', // Increased for better hierarchy
      lg: 'p-3 min-w-[52px] min-h-[52px]',
    };

    return (
      <Button
        ref={ref}
        size={size}
        className={cn(sizeStyles[size], className)}
        {...props}
      >
        {icon}
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';

/**
 * Button Group Component
 * Groups buttons together with proper spacing
 */
export interface ButtonGroupProps {
  children: ReactNode;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export function ButtonGroup({
  children,
  className,
  orientation = 'horizontal',
}: ButtonGroupProps) {
  return (
    <div
      className={cn(
        'inline-flex',
        orientation === 'horizontal' ? 'flex-row gap-2' : 'flex-col gap-2',
        className
      )}
      role="group"
    >
      {children}
    </div>
  );
}
