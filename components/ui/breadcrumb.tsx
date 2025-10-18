'use client';

import React, { ReactNode } from 'react';
import Link from 'next/link';
import { CaretRight, House } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

/**
 * Breadcrumb Navigation Component
 * Provides contextual navigation showing the current page hierarchy
 *
 * @example
 * ```tsx
 * <Breadcrumb>
 *   <BreadcrumbItem href="/">House</BreadcrumbItem>
 *   <BreadcrumbItem href="/blocks">Blocks</BreadcrumbItem>
 *   <BreadcrumbItem current>Block #12345</BreadcrumbItem>
 * </Breadcrumb>
 * ```
 */

export interface BreadcrumbProps {
  children: ReactNode;
  className?: string;
  separator?: ReactNode;
}

export function Breadcrumb({
  children,
  className,
  separator = <CaretRight className="h-4 w-4 text-gray-500" />,
}: BreadcrumbProps) {
  const childrenArray = React.Children.toArray(children);

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center space-x-2 text-sm', className)}
    >
      <ol className="flex items-center space-x-2 list-none">
        {childrenArray.map((child, index) => (
          <li key={index} className="flex items-center space-x-2">
            {child}
            {index < childrenArray.length - 1 && (
              <span className="flex-shrink-0" aria-hidden="true">
                {separator}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Breadcrumb Item Component
 */
export interface BreadcrumbItemProps {
  children: ReactNode;
  href?: string;
  current?: boolean;
  icon?: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function BreadcrumbItem({
  children,
  href,
  current = false,
  icon,
  className,
  onClick,
}: BreadcrumbItemProps) {
  const baseStyles = 'flex items-center gap-1.5 transition-colors';
  const linkStyles = current
    ? 'text-white font-medium cursor-default'
    : 'text-gray-400 hover:text-white';

  const content = (
    <>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="truncate max-w-[200px] sm:max-w-none">{children}</span>
    </>
  );

  if (current) {
    return (
      <span
        className={cn(baseStyles, linkStyles, className)}
        aria-current="page"
      >
        {content}
      </span>
    );
  }

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={cn(baseStyles, linkStyles, className)}
      >
        {content}
      </button>
    );
  }

  if (href) {
    return (
      <Link href={href} className={cn(baseStyles, linkStyles, className)}>
        {content}
      </Link>
    );
  }

  return (
    <span className={cn(baseStyles, linkStyles, className)}>{content}</span>
  );
}

/**
 * Breadcrumb with House Icon
 * Convenience component for common home breadcrumb
 */
export interface BreadcrumbWithHouseProps {
  items: Array<{
    label: string;
    href?: string;
    current?: boolean;
  }>;
  homeHref?: string;
  className?: string;
}

export function BreadcrumbWithHouse({
  items,
  homeHref = '/',
  className,
}: BreadcrumbWithHouseProps) {
  return (
    <Breadcrumb className={className}>
      <BreadcrumbItem href={homeHref} icon={<House className="h-4 w-4" />}>
        House
      </BreadcrumbItem>
      {items.map((item, index) => (
        <BreadcrumbItem
          key={index}
          href={item.href}
          current={item.current || index === items.length - 1}
        >
          {item.label}
        </BreadcrumbItem>
      ))}
    </Breadcrumb>
  );
}

/**
 * Collapsible Breadcrumb
 * Automatically collapses middle items on small screens
 */
export interface CollapsibleBreadcrumbProps {
  items: Array<{
    label: string;
    href?: string;
    icon?: ReactNode;
  }>;
  maxItems?: number;
  className?: string;
}

export function CollapsibleBreadcrumb({
  items,
  maxItems = 3,
  className,
}: CollapsibleBreadcrumbProps) {
  const [expanded, setExpanded] = React.useState(false);

  if (items.length <= maxItems || expanded) {
    return (
      <Breadcrumb className={className}>
        {items.map((item, index) => (
          <BreadcrumbItem
            key={index}
            href={item.href}
            icon={item.icon}
            current={index === items.length - 1}
          >
            {item.label}
          </BreadcrumbItem>
        ))}
      </Breadcrumb>
    );
  }

  // Show first item, ellipsis, and last 2 items
  const firstItem = items[0];
  const lastItems = items.slice(-2);
  const hiddenCount = items.length - 3;

  return (
    <Breadcrumb className={className}>
      <BreadcrumbItem href={firstItem.href} icon={firstItem.icon}>
        {firstItem.label}
      </BreadcrumbItem>

      <BreadcrumbItem>
        <button
          onClick={() => setExpanded(true)}
          className="text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-colors"
          aria-label={`Show ${hiddenCount} hidden items`}
        >
          ...
        </button>
      </BreadcrumbItem>

      {lastItems.map((item, index) => (
        <BreadcrumbItem
          key={index}
          href={item.href}
          icon={item.icon}
          current={index === lastItems.length - 1}
        >
          {item.label}
        </BreadcrumbItem>
      ))}
    </Breadcrumb>
  );
}
