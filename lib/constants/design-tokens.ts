/**
 * Design Tokens for VerusPulse
 * Centralized design system constants for consistent UI
 *
 * @module design-tokens
 */

/**
 * Icon Sizes - Consistent sizing based on text context
 * Use these constants for all icon sizing to maintain visual hierarchy
 *
 * @example
 * ```tsx
 * import { ICON_SIZES } from '@/lib/constants/design-tokens';
 * <Search className={ICON_SIZES.md} />
 * ```
 */
export const ICON_SIZES = {
  /** 12px - Tiny indicators, badges */
  xs: 'h-3 w-3',
  /** 16px - Small text (12-14px), inline icons */
  sm: 'h-4 w-4',
  /** 20px - Body text (16px), default size */
  md: 'h-5 w-5',
  /** 24px - Headings (20-24px), prominent icons */
  lg: 'h-6 w-6',
  /** 32px - Large headings, featured icons */
  xl: 'h-8 w-8',
  /** 48px - Hero sections, major features */
  '2xl': 'h-12 w-12',
  /** 64px - Landing pages, major hero elements */
  '3xl': 'h-16 w-16',
} as const;

/**
 * Spacing Scale - 8pt Grid System
 * Consistent spacing for margins, padding, and gaps
 *
 * @example
 * ```tsx
 * import { SPACING } from '@/lib/constants/design-tokens';
 * <div className={`gap-${SPACING.md}`}>
 * ```
 */
export const SPACING = {
  /** 0px - No spacing */
  none: '0',
  /** 4px - Minimal spacing */
  xxs: '1',
  /** 8px - Extra small spacing */
  xs: '2',
  /** 12px - Small spacing */
  sm: '3',
  /** 16px - Medium spacing (default) */
  md: '4',
  /** 20px - Medium-large spacing */
  lg: '5',
  /** 24px - Large spacing */
  xl: '6',
  /** 32px - Extra large spacing */
  '2xl': '8',
  /** 48px - Section spacing */
  '3xl': '12',
  /** 64px - Major section spacing */
  '4xl': '16',
} as const;

/**
 * Border Radius Scale
 * Consistent border radius for UI elements
 *
 * @example
 * ```tsx
 * import { BORDER_RADIUS } from '@/lib/constants/design-tokens';
 * <button className={`rounded-${BORDER_RADIUS.md}`}>
 * ```
 */
export const BORDER_RADIUS = {
  /** No rounding */
  none: 'none',
  /** 4px - Subtle rounding */
  sm: 'sm',
  /** 8px - Standard inputs, small buttons */
  DEFAULT: 'DEFAULT',
  /** 12px - Buttons, cards */
  md: 'md',
  /** 16px - Cards, panels */
  lg: 'lg',
  /** 24px - Large cards, sections */
  xl: 'xl',
  /** 32px - Hero sections, major panels */
  '2xl': '2xl',
  /** Full circle */
  full: 'full',
} as const;

/**
 * Font Sizes - Typography Scale
 * Consistent font sizing across the application
 */
export const FONT_SIZES = {
  /** 10px - Fine print */
  xxs: 'text-[10px]',
  /** 12px - Small labels, captions */
  xs: 'text-xs',
  /** 14px - Body text, labels */
  sm: 'text-sm',
  /** 16px - Default body text */
  base: 'text-base',
  /** 18px - Large body text */
  lg: 'text-lg',
  /** 20px - Small headings */
  xl: 'text-xl',
  /** 24px - Headings */
  '2xl': 'text-2xl',
  /** 30px - Large headings */
  '3xl': 'text-3xl',
  /** 36px - Page titles */
  '4xl': 'text-4xl',
  /** 48px - Hero text */
  '5xl': 'text-5xl',
  /** 60px - Major hero text */
  '6xl': 'text-6xl',
} as const;

/**
 * Font Weights
 * Consistent font weight values
 */
export const FONT_WEIGHTS = {
  light: 'font-light', // 300
  normal: 'font-normal', // 400
  medium: 'font-medium', // 500
  semibold: 'font-semibold', // 600
  bold: 'font-bold', // 700
} as const;

/**
 * Shadow/Elevation Levels
 * Consistent shadow system for depth hierarchy
 *
 * @example
 * ```tsx
 * import { ELEVATION } from '@/lib/constants/design-tokens';
 * <div className={ELEVATION.raised}>
 * ```
 */
export const ELEVATION = {
  /** No shadow - flat on surface */
  none: '',
  /** Subtle shadow - barely raised */
  base: 'shadow-sm',
  /** Light shadow - standard cards */
  raised: 'shadow-md',
  /** Medium shadow - hovered elements */
  floating: 'shadow-lg',
  /** Strong shadow - modals, overlays */
  overlay: 'shadow-xl',
  /** Maximum shadow - full-screen overlays */
  modal: 'shadow-2xl',
} as const;

/**
 * Z-Index Scale
 * Consistent stacking order
 */
export const Z_INDEX = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modalBackdrop: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
} as const;

/**
 * Breakpoints - Responsive Design
 * Screen size breakpoints (matches Tailwind config)
 */
export const BREAKPOINTS = {
  xs: '375px', // Small phones
  sm: '640px', // Large phones
  md: '768px', // Tablets
  lg: '1024px', // Laptops
  xl: '1280px', // Desktops
  '2xl': '1536px', // Large desktops
} as const;

/**
 * Animation Durations
 * Consistent timing for transitions and animations
 */
export const ANIMATION_DURATION = {
  /** 75ms - Instant feedback */
  instant: 'duration-75',
  /** 150ms - Quick transitions */
  fast: 'duration-150',
  /** 300ms - Standard transitions */
  normal: 'duration-300',
  /** 500ms - Slower transitions */
  slow: 'duration-500',
  /** 700ms - Dramatic transitions */
  slower: 'duration-700',
} as const;

/**
 * Animation Easings
 * Consistent easing functions
 */
export const ANIMATION_EASING = {
  linear: 'ease-linear',
  in: 'ease-in',
  out: 'ease-out',
  inOut: 'ease-in-out',
} as const;

/**
 * Transition Utilities
 * Pre-configured transition combinations
 */
export const TRANSITIONS = {
  /** Standard transition for all properties */
  all: 'transition-all duration-300 ease-in-out',
  /** Color transitions */
  colors: 'transition-colors duration-200 ease-in-out',
  /** Transform transitions (scale, rotate, translate) */
  transform: 'transition-transform duration-300 ease-out',
  /** Opacity transitions */
  opacity: 'transition-opacity duration-200 ease-in-out',
  /** Fast transitions for interactive elements */
  fast: 'transition-all duration-150 ease-out',
} as const;

/**
 * Common Layout Patterns
 * Reusable layout utilities
 */
export const LAYOUTS = {
  /** Centered content with max width */
  container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  /** Flex row with center alignment */
  flexCenter: 'flex items-center justify-center',
  /** Flex row with space between */
  flexBetween: 'flex items-center justify-between',
  /** Flex column */
  flexCol: 'flex flex-col',
  /** Grid with responsive columns */
  gridResponsive:
    'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
} as const;

/**
 * Color Utilities
 * Common color combinations (references CSS variables)
 */
export const COLORS = {
  verusBlue: 'bg-verus-blue text-white',
  verusGreen: 'bg-verus-green text-white',
  verusRed: 'bg-verus-red text-white',
  success: 'bg-green-500 text-white',
  warning: 'bg-yellow-500 text-black',
  error: 'bg-red-500 text-white',
  info: 'bg-blue-500 text-white',
} as const;

// Type exports for better TypeScript support
export type IconSize = keyof typeof ICON_SIZES;
export type SpacingSize = keyof typeof SPACING;
export type BorderRadiusSize = keyof typeof BORDER_RADIUS;
export type FontSize = keyof typeof FONT_SIZES;
export type FontWeight = keyof typeof FONT_WEIGHTS;
export type ElevationLevel = keyof typeof ELEVATION;
export type Breakpoint = keyof typeof BREAKPOINTS;
export type AnimationDuration = keyof typeof ANIMATION_DURATION;
export type AnimationEasing = keyof typeof ANIMATION_EASING;
