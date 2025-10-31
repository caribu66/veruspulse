'use client';

import React, { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveTableProps {
  children: ReactNode;
  className?: string;
}

/**
 * Responsive Table Wrapper
 * Prevents horizontal scroll on mobile by adding proper overflow handling
 */
export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0 scrollbar-thin">
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
          <table
            className={cn('min-w-full divide-y divide-gray-700', className)}
          >
            {children}
          </table>
        </div>
      </div>
    </div>
  );
}

interface ResponsiveTableHeaderProps {
  children: ReactNode;
  className?: string;
}

export function ResponsiveTableHeader({
  children,
  className,
}: ResponsiveTableHeaderProps) {
  return <thead className={cn('bg-white/5', className)}>{children}</thead>;
}

interface ResponsiveTableBodyProps {
  children: ReactNode;
  className?: string;
}

export function ResponsiveTableBody({
  children,
  className,
}: ResponsiveTableBodyProps) {
  return (
    <tbody className={cn('divide-y divide-gray-700 bg-white/5', className)}>
      {children}
    </tbody>
  );
}

interface ResponsiveTableRowProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function ResponsiveTableRow({
  children,
  className,
  onClick,
}: ResponsiveTableRowProps) {
  return (
    <tr
      className={cn(
        'hover:bg-white/10 transition-colors',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

interface ResponsiveTableCellProps {
  children: ReactNode;
  className?: string;
  header?: boolean;
}

export function ResponsiveTableCell({
  children,
  className,
  header,
}: ResponsiveTableCellProps) {
  const Component = header ? 'th' : 'td';

  return (
    <Component
      className={cn(
        'px-3 py-3 text-sm sm:px-6 sm:py-4',
        header &&
          'font-semibold text-left text-gray-300 uppercase tracking-wider',
        !header && 'text-gray-200',
        className
      )}
      scope={header ? 'col' : undefined}
    >
      {children}
    </Component>
  );
}
