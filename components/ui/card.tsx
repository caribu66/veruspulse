'use client';

import React, { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Card Component System
 * Standardized card styles with consistent variants and spacing
 *
 * @example
 * ```tsx
 * <Card variant="elevated" hover="lift">
 *   <CardHeader>
 *     <CardTitle>Title</CardTitle>
 *     <CardDescription>Description</CardDescription>
 *   </CardHeader>
 *   <CardContent>
 *     Content here
 *   </CardContent>
 *   <CardFooter>
 *     <Button>Action</Button>
 *   </CardFooter>
 * </Card>
 * ```
 */

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Card visual style */
  variant?: 'default' | 'elevated' | 'flat' | 'outlined';
  /** Padding size - follows 8pt grid system */
  padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Hover effect */
  hover?: 'none' | 'lift' | 'glow' | 'brighten';
  /** Additional class names */
  className?: string;
  /** Card content */
  children?: ReactNode;
}

export function Card({
  variant = 'default',
  padding = 'md',
  hover = 'none',
  className,
  children,
  onClick,
  ...props
}: CardProps) {
  // Base styles
  const baseStyles = 'rounded-xl transition-all duration-200';

  // Variant styles - Unified, harmonious design (theme-aware)
  const variantStyles = {
    default:
      'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700',
    elevated:
      'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-lg',
    flat: 'bg-white dark:bg-slate-900',
    outlined: 'bg-white dark:bg-slate-900 border-2 border-verus-blue/40',
  } as const;

  // Padding styles - 8pt grid system
  const paddingStyles = {
    none: 'p-0', // 0px
    xs: 'p-2', // 8px - NEW: extra small
    sm: 'p-3 md:p-4', // 12px → 16px
    md: 'p-4 md:p-6', // 16px → 24px
    lg: 'p-6 md:p-8', // 24px → 32px
    xl: 'p-8 md:p-12', // 32px → 48px - NEW: extra large
  } as const;

  // Hover styles - Subtle, professional effects (theme-aware)
  const hoverStyles = {
    none: '',
    lift: 'hover:shadow-xl hover:-translate-y-1 hover:border-verus-blue/40',
    glow: 'hover:border-verus-blue/60 hover:shadow-xl',
    brighten: 'hover:bg-gray-50 dark:hover:bg-slate-800',
  } as const;

  // Clickable cursor
  const clickableStyles = onClick ? 'cursor-pointer' : '';

  return (
    <div
      className={cn(
        baseStyles,
        variantStyles[variant],
        paddingStyles[padding],
        hoverStyles[hover],
        clickableStyles,
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Card Header Component
 * Typically contains title and description
 */
export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: ReactNode;
}

export function CardHeader({ className, children, ...props }: CardHeaderProps) {
  return (
    <div className={cn('flex flex-col space-y-1.5 pb-4', className)} {...props}>
      {children}
    </div>
  );
}

/**
 * Card Title Component
 */
export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  className?: string;
  children?: ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export function CardTitle({
  className,
  children,
  as: Component = 'h3',
  ...props
}: CardTitleProps) {
  return (
    <Component
      className={cn(
        'text-xl md:text-2xl font-bold text-gray-900 dark:text-white',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

/**
 * Card Description Component
 */
export interface CardDescriptionProps
  extends HTMLAttributes<HTMLParagraphElement> {
  className?: string;
  children?: ReactNode;
}

export function CardDescription({
  className,
  children,
  ...props
}: CardDescriptionProps) {
  return (
    <p
      className={cn('text-sm text-gray-600 dark:text-slate-400', className)}
      {...props}
    >
      {children}
    </p>
  );
}

/**
 * Card Content Component
 */
export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: ReactNode;
}

export function CardContent({
  className,
  children,
  ...props
}: CardContentProps) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  );
}

/**
 * Card Footer Component
 */
export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: ReactNode;
}

export function CardFooter({ className, children, ...props }: CardFooterProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 pt-4 border-t border-slate-300 dark:border-slate-700',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Stat Card Component
 * Specialized card for displaying statistics
 */
export interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function StatCard({
  label,
  value,
  change,
  icon,
  trend,
  className,
}: StatCardProps) {
  const trendColors = {
    up: 'text-verus-green',
    down: 'text-verus-red',
    neutral: 'text-gray-500 dark:text-slate-400',
  };

  const trendColor = trend ? trendColors[trend] : 'text-gray-500 dark:text-slate-400';

  return (
    <Card variant="default" hover="glow" className={className}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">
            {label}
          </p>
          <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
            {value}
          </p>
          {change !== undefined && (
            <p className={cn('text-sm mt-2 font-medium', trendColor)}>
              {change > 0 && '+'}
              {change}%
            </p>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 p-2.5 bg-verus-blue/10 border border-verus-blue/20 rounded-lg">
            <span className="text-verus-blue">{icon}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
