'use client';

import React, { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

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
    const tCommon = useTranslations('common');
    // Base styles
    const baseStyles =
      'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    // Variant styles - Using Official Verus Brand Colors
    const variantStyles = {
      primary:
        'bg-verus-blue text-white hover:bg-verus-blue-light focus:ring-verus-blue active:bg-verus-blue-dark shadow-sm',
      secondary:
        'bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-slate-700 focus:ring-verus-blue/50',
      ghost:
        'bg-transparent text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-800/50 border border-gray-200 dark:border-slate-700 focus:ring-verus-blue/50',
      danger:
        'bg-verus-red text-white hover:bg-verus-red-light focus:ring-verus-red active:bg-verus-red-dark shadow-sm',
      success:
        'bg-verus-green text-white hover:bg-verus-green-light focus:ring-verus-green active:bg-verus-green-dark shadow-sm',
    } as const;

    // Size styles - WCAG compliant with proper spacing
    const sizeStyles = {
      sm: 'text-sm px-4 py-2 min-h-[44px] gap-2', // 8px gap for breathing room
      md: 'text-base px-6 py-2.5 min-h-[48px] gap-2.5', // 10px gap
      lg: 'text-lg px-8 py-3 min-h-[52px] gap-3', // 12px gap
    } as const;

    // Icon sizing based on button size
    const iconSizeMap = {
      sm: 'h-4 w-4', // 16px icons for small buttons
      md: 'h-5 w-5', // 20px icons for medium buttons
      lg: 'h-6 w-6', // 24px icons for large buttons
    } as const;

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
            className={cn('animate-spin flex-shrink-0', iconSizeMap[size])}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            role="status"
            aria-label={tCommon("loading")}
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
             />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
             />
          </svg>
        )}
        {!loading && icon && (
          <span className={cn('flex-shrink-0 flex items-center', iconSizeMap[size])}>
            {icon}
          </span>
        )}
        {children && <span className="flex items-center">{children}</span>}
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
    // Square sizing - WCAG compliant with proper padding
    const sizeStyles = {
      sm: 'p-2.5 min-w-[44px] min-h-[44px]', // 10px padding for breathing room
      md: 'p-3 min-w-[48px] min-h-[48px]', // 12px padding
      lg: 'p-4 min-w-[52px] min-h-[52px]', // 16px padding
    };

    // Icon sizing for icon-only buttons
    const iconSizeMap = {
      sm: 'h-4 w-4', // 16px icon
      md: 'h-5 w-5', // 20px icon
      lg: 'h-6 w-6', // 24px icon
    };

    return (
      <Button
        ref={ref}
        size={size}
        className={cn(sizeStyles[size], 'aspect-square', className)}
        {...props}
      >
        <span className={cn('flex items-center justify-center', iconSizeMap[size])}>
          {icon}
        </span>
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
  const tCommon = useTranslations('common');
  return (
    <div
      className={cn(
        'inline-flex',
        orientation === 'horizontal' ? 'flex-row gap-3' : 'flex-col gap-3', // Increased from gap-2 to gap-3 for better breathing room
        className
      )}
      role="group"
    >
      {children}
    </div>
  );
}
