'use client';

import React, { HTMLAttributes, ReactNode } from 'react';
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

  // Variant styles - Solid, professional design (theme-aware)
  const variantStyles = {
    default:
      'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700',
    elevated:
      'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-xl',
    flat: 'bg-white dark:bg-slate-900',
    outlined: 'bg-white dark:bg-slate-900 border-2 border-verus-blue/40',
  };

  // Padding styles - 8pt grid system
  const paddingStyles = {
    none: 'p-0', // 0px
    xs: 'p-2', // 8px - NEW: extra small
    sm: 'p-3 md:p-4', // 12px → 16px
    md: 'p-4 md:p-6', // 16px → 24px
    lg: 'p-6 md:p-8', // 24px → 32px
    xl: 'p-8 md:p-12', // 32px → 48px - NEW: extra large
  };

  // Hover styles - Subtle, professional effects (theme-aware)
  const hoverStyles = {
    none: '',
    lift: 'hover:shadow-2xl hover:-translate-y-0.5',
    glow: 'hover:border-verus-blue/60 hover:shadow-lg',
    brighten: 'hover:bg-slate-700 dark:hover:bg-slate-700',
  };

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
    up: 'text-green-400',
    down: 'text-red-400',
    neutral: 'text-gray-400',
  };

  const trendColor = trend ? trendColors[trend] : 'text-gray-400';

  return (
    <Card variant="elevated" hover="glow" className={className}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">
            {label}
          </p>
          <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          {change !== undefined && (
            <p className={cn('text-sm mt-1', trendColor)}>
              {change > 0 && '+'}
              {change}%
            </p>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 p-3 bg-gray-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
