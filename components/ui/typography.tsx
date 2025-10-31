'use client';

import React, { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ArrowSquareOut } from '@phosphor-icons/react';

/**
 * Typography Component System
 * Standardized heading and text components with consistent hierarchy
 *
 * @example
 * ```tsx
 * <Heading as="h1">Page Title</Heading>
 * <Heading as="h2" weight="semibold">Section Title</Heading>
 * <Text>Regular paragraph text</Text>
 * <Text size="sm" muted>Secondary information</Text>
 * ```
 */

export type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
export type TextSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl';
export type FontWeight = 'normal' | 'medium' | 'semibold' | 'bold';

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Heading level (also determines size) */
  as?: HeadingLevel;
  /** Custom size (overrides default for level) */
  size?: HeadingLevel;
  /** Font weight */
  weight?: FontWeight;
  /** Additional classes */
  className?: string;
  /** Content */
  children: ReactNode;
}

/**
 * Heading Component
 * Semantic headings with responsive sizing
 */
export function Heading({
  as = 'h2',
  size,
  weight = 'bold',
  className,
  children,
  ...props
}: HeadingProps) {
  const Component = as;
  const effectiveSize = size || as;

  // Responsive sizing - mobile first
  const sizeClasses: Record<HeadingLevel, string> = {
    h1: 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl',
    h2: 'text-2xl sm:text-3xl md:text-4xl',
    h3: 'text-xl sm:text-2xl md:text-3xl',
    h4: 'text-lg sm:text-xl md:text-2xl',
    h5: 'text-base sm:text-lg md:text-xl',
    h6: 'text-sm sm:text-base md:text-lg',
  };

  const weightClasses: Record<FontWeight, string> = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  };

  return (
    <Component
      className={cn(
        sizeClasses[effectiveSize],
        weightClasses[weight],
        'text-gray-900 dark:text-white',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

/**
 * Display Heading Component
 * Extra large heading for hero sections
 */
export interface DisplayHeadingProps extends Omit<HeadingProps, 'as' | 'size'> {
  as?: Extract<HeadingLevel, 'h1' | 'h2'>;
}

export function DisplayHeading({
  as = 'h1',
  weight = 'bold',
  className,
  children,
  ...props
}: DisplayHeadingProps) {
  const Component = as;

  return (
    <Component
      className={cn(
        'text-4xl sm:text-5xl md:text-6xl lg:text-7xl',
        `font-${weight}`,
        'text-gray-900 dark:text-white',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

/**
 * Text Component
 * Body text with variants
 */
export interface TextProps extends HTMLAttributes<HTMLElement> {
  /** Text size */
  size?: TextSize;
  /** Font weight */
  weight?: FontWeight;
  /** Muted appearance (secondary text) */
  muted?: boolean;
  /** Dimmed appearance (tertiary text) */
  dimmed?: boolean;
  /** Monospace font (for code/hashes) */
  mono?: boolean;
  /** As element (default: p) */
  as?: 'p' | 'span' | 'div' | 'label';
  /** Additional classes */
  className?: string;
  /** Content */
  children: ReactNode;
}

export function Text({
  size = 'base',
  weight = 'normal',
  muted = false,
  dimmed = false,
  mono = false,
  as: Component = 'p',
  className,
  children,
  ...props
}: TextProps) {
  const sizeClasses: Record<TextSize, string> = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  const weightClasses: Record<FontWeight, string> = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  };

  // Color classes
  const colorClass = dimmed
    ? 'text-gray-500 dark:text-gray-400'
    : muted
      ? 'text-gray-400 dark:text-gray-500'
      : 'text-gray-900 dark:text-white';

  return React.createElement(
    Component,
    {
      className: cn(
        sizeClasses[size],
        weightClasses[weight],
        colorClass,
        mono && 'font-mono',
        'leading-relaxed',
        className
      ),
      ...props,
    },
    children
  );
}

/**
 * Code Component
 * Inline code or code blocks
 */
export interface CodeProps extends HTMLAttributes<HTMLElement> {
  /** Block display (vs inline) */
  block?: boolean;
  /** Language for syntax highlighting */
  language?: string;
  /** Additional classes */
  className?: string;
  /** Content */
  children: ReactNode;
}

export function Code({
  block = false,
  language,
  className,
  children,
  ...props
}: CodeProps) {
  if (block) {
    return (
      <pre
        className={cn(
          'bg-gray-100 dark:bg-black/40 border border-gray-300 dark:border-white/10 rounded-lg p-4 overflow-x-auto',
          'text-sm font-mono',
          className
        )}
        {...props}
      >
        <code className="text-gray-300">{children}</code>
      </pre>
    );
  }

  return (
    <code
      className={cn(
        'bg-gray-200 dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded px-1.5 py-0.5',
        'text-sm font-mono text-gray-700 dark:text-gray-300',
        className
      )}
      {...props}
    >
      {children}
    </code>
  );
}

/**
 * Label Component
 * Form labels with optional required indicator
 */
export interface LabelProps extends HTMLAttributes<HTMLLabelElement> {
  /** HTML for attribute */
  htmlFor?: string;
  /** Show required indicator */
  required?: boolean;
  /** Additional classes */
  className?: string;
  /** Content */
  children: ReactNode;
}

export function Label({
  htmlFor,
  required,
  className,
  children,
  ...props
}: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        'block text-sm font-medium text-gray-300 mb-2',
        required && 'after:content-["*"] after:ml-1 after:text-red-400',
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
}

/**
 * Lead Text Component
 * Larger text for introductions
 */
export type LeadProps = Omit<TextProps, 'size'>;

export function Lead({ className, children, ...props }: LeadProps) {
  return (
    <Text
      size="lg"
      className={cn('text-gray-300 leading-relaxed', className)}
      {...props}
    >
      {children}
    </Text>
  );
}

/**
 * Muted Text Component
 * Convenience component for secondary text
 */
export function Muted({
  className,
  children,
  ...props
}: Omit<TextProps, 'muted'>) {
  return (
    <Text size="sm" muted className={className} {...props}>
      {children}
    </Text>
  );
}

/**
 * Link Component
 * Styled link with hover effects
 */
export interface LinkProps extends HTMLAttributes<HTMLAnchorElement> {
  href: string;
  external?: boolean;
  className?: string;
  children: ReactNode;
}

export function TextLink({
  href,
  external,
  className,
  children,
  ...props
}: LinkProps) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className={cn(
        'text-blue-400 hover:text-blue-300 underline transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 rounded',
        className
      )}
      {...props}
    >
      {children}
      {external && (
        <ArrowSquareOut
          className="inline-block h-3 w-3 ml-1"
          aria-label="Opens in new window"
        />
      )}
    </a>
  );
}

/**
 * Blockquote Component
 */
export interface BlockquoteProps extends HTMLAttributes<HTMLQuoteElement> {
  cite?: string;
  className?: string;
  children: ReactNode;
}

export function Blockquote({
  cite,
  className,
  children,
  ...props
}: BlockquoteProps) {
  return (
    <blockquote
      cite={cite}
      className={cn(
        'border-l-4 border-blue-500 pl-4 py-2',
        'text-gray-300 italic',
        className
      )}
      {...props}
    >
      {children}
    </blockquote>
  );
}

/**
 * List Components
 */
export interface ListProps
  extends HTMLAttributes<HTMLUListElement | HTMLOListElement> {
  ordered?: boolean;
  className?: string;
  children: ReactNode;
}

export function List({
  ordered = false,
  className,
  children,
  ...props
}: ListProps) {
  const Component = ordered ? 'ol' : 'ul';

  return (
    <Component
      className={cn(
        'space-y-2 text-gray-300',
        ordered ? 'list-decimal' : 'list-disc',
        'list-inside',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export function ListItem({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLLIElement>) {
  return (
    <li className={cn('text-sm', className)} {...props}>
      {children}
    </li>
  );
}
