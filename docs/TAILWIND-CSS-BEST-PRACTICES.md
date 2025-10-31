# Tailwind CSS 3.4.18 Best Practices for VerusPulse

This document outlines Tailwind CSS 3.4.18 best practices specifically tailored for the VerusPulse dApp. It builds upon modern utility-first patterns to improve maintainability, performance, and developer experience.

## Table of Contents

1. [Configuration](#configuration)
2. [Utility Classes vs. Custom CSS](#utility-classes-vs-custom-css)
3. [Responsive Design](#responsive-design)
4. [Dark Mode](#dark-mode)
5. [Component Patterns](#component-patterns)
6. [Color System](#color-system)
7. [Spacing & Layout](#spacing--layout)
8. [Typography](#typography)
9. [Performance Optimization](#performance-optimization)
10. [Arbitrary Values](#arbitrary-values)
11. [Common Patterns](#common-patterns)
12. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)

## Configuration

Our `tailwind.config.js` is optimized for VerusPulse's design system:

```1:88:tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Verus Official Brand Colors - From Official Media Assets
      colors: {
        verus: {
          // Primary Brand Color - Verus Blue (Main usage)
          blue: '#3165d4', // Official Verus Blue - primary actions, links, emphasis
          'blue-light': '#4a7ce8', // Lighter blue for hover states
          'blue-dark': '#2650b3', // Darker blue for pressed states

          // Official Additional Palette
          green: '#4AA658', // Official Verus Green - success states, positive metrics
          'green-light': '#5cb96a', // Lighter green for hover
          'green-dark': '#3d8a49', // Darker green for active states

          red: '#D4313E', // Official Verus Red - error states, alerts
          'red-light': '#e04b56', // Lighter red for hover
          'red-dark': '#b52732', // Darker red for active states

          // Official Text Palette
          'text-dark': '#1C1C1C', // Official dark text
          'text-grey': '#959595', // Official dark grey text
          'text-light-grey': '#D6D6D6', // Official light grey text

          // Neutral Backgrounds
          dark: '#0a0e1a', // Primary dark background
          'dark-secondary': '#141b2d', // Secondary dark background
          'dark-tertiary': '#1a2332', // Tertiary dark (cards, panels)

          // Semantic Colors (using official palette only)
          success: '#4AA658', // Success (official green)
          warning: '#f59e0b', // Warning (amber - no official alternative)
          error: '#D4313E', // Error (official red)
          info: '#3165d4', // Info (uses official blue)
        },

        // Override default Tailwind colors to use Verus palette
        primary: {
          DEFAULT: '#3165d4',
          50: '#eff4ff',
          100: '#dbe7fe',
          200: '#bfd4fe',
          300: '#93b5fd',
          400: '#4a7ce8',
          500: '#3165d4',
          600: '#2650b3',
          700: '#1e3f8f',
          800: '#1e3576',
          900: '#1d2f62',
        },
        secondary: {
          DEFAULT: '#4AA658',
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#5cb96a',
          500: '#4AA658',
          600: '#3d8a49',
          700: '#2f6d39',
          800: '#235730',
          900: '#1a4726',
        },
        accent: {
          DEFAULT: '#D4313E',
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#e04b56',
          500: '#D4313E',
          600: '#b52732',
          700: '#991b1b',
          800: '#7f1d1d',
          900: '#641e1e',
        },
      },

      // Standardized breakpoints for consistent responsive design
      screens: {
        xs: '375px', // Small phones
        sm: '640px', // Large phones (Tailwind default)
        md: '768px', // Tablets (Tailwind default)
        lg: '1024px', // Laptops (Tailwind default)
        xl: '1280px', // Desktops (Tailwind default)
        '2xl': '1536px', // Large desktops (Tailwind default)
      },
```

### Key Configuration Details

- **`darkMode: 'class'`**: Manual dark mode control via class
- **Content paths**: Scans all component files for class usage
- **Extended theme**: Custom colors, breakpoints, and spacing
- **Design tokens**: Integration with centralized design system

## Utility Classes vs. Custom CSS

### ✅ Good: Use Utility Classes

```tsx
<div className="flex items-center justify-between p-6 bg-white dark:bg-slate-900 rounded-lg shadow-md">
  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Title</h2>
  <button className="px-4 py-2 bg-verus-blue text-white rounded hover:bg-verus-blue-light">
    Action
  </button>
</div>
```

### ❌ Bad: Writing Custom CSS

```tsx
// ❌ Avoid - Write custom CSS
<div className="my-custom-card">
  <h2 className="my-custom-title">Title</h2>
  <button className="my-custom-button">Action</button>
</div>

// And in CSS file:
.my-custom-card { /* lots of CSS */ }
.my-custom-title { /* lots of CSS */ }
.my-custom-button { /* lots of CSS */ }
```

### When to Use Component Classes

Use component classes for:
- Reusable, complex components (via `@apply`)
- Third-party integration where utilities aren't feasible
- Design system abstractions

```css
/* ✅ Good: Button component abstraction */
.btn-primary {
  @apply px-6 py-3 bg-verus-blue text-white rounded-lg font-medium;
  @apply hover:bg-verus-blue-light transition-colors duration-200;
  @apply focus:outline-none focus:ring-2 focus:ring-verus-blue focus:ring-offset-2;
}
```

## Responsive Design

### Mobile-First Approach

Always start with mobile styles, then add larger breakpoints:

```tsx
// ✅ Good: Mobile-first
<div className="p-4 md:p-6 lg:p-8">
  <h1 className="text-2xl md:text-3xl lg:text-4xl">Title</h1>
</div>

// ❌ Bad: Desktop-first
<div className="p-8 lg:p-6 md:p-4">
  <h1 className="text-4xl lg:text-3xl md:text-2xl">Title</h1>
</div>
```

### Breakpoint Strategy

```tsx
// Standard responsive grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* cards */}
</div>

// Responsive spacing
<div className="space-y-4 md:space-y-6 lg:space-y-8">
  {/* content */}
</div>

// Responsive typography
<h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl">
  Responsive Heading
</h1>
```

### Real-World Example

```86:154:components/ui/card.tsx
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
```

## Dark Mode

### Class-Based Dark Mode

Since we use `darkMode: 'class'`, always check for `.dark` class:

```tsx
// ✅ Good: Dark mode with class
<div className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white">
  Content
</div>

// ✅ Good: Dark mode with opacity
<div className="bg-blue-500/10 dark:bg-blue-500/20">
  Semi-transparent background
</div>
```

### Design Tokens Integration

```322:339:lib/constants/design-tokens.ts
export const HOVER_PATTERNS = {
  /** Standard card hover - subtle border and background change */
  card: 'hover:border-slate-600/50 hover:bg-slate-700/30 transition-all duration-200',
  /** Card hover with brand accent - blue border highlight */
  cardAccent: 'hover:border-verus-blue/60 hover:bg-slate-700/30 transition-all duration-200',
  /** Button hover - scale effect for interactivity */
  button: 'hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200',
  /** Icon hover - subtle scale for feedback */
  icon: 'hover:scale-110 active:scale-95 transition-transform duration-200',
  /** Background hover only - for clickable backgrounds */
  background: 'hover:bg-slate-700/50 transition-colors duration-200',
  /** Border hover only - for subtle interactions */
  border: 'hover:border-slate-600/50 transition-colors duration-200',
  /** Group hover - for revealing elements on parent hover */
  groupReveal: 'group-hover:opacity-100 opacity-0 transition-opacity duration-200',
  /** Interactive element - combination of background and border */
  interactive: 'hover:bg-slate-700/30 hover:border-slate-600/40 transition-all duration-200',
} as const;
```

## Component Patterns

### ✅ Good: Component with Variants

```40:98:components/ui/card.tsx
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
    lift: 'hover:shadow-xl hover:-translate-y-1 hover:border-verus-blue/40',
    glow: 'hover:border-verus-blue/60 hover:shadow-xl',
    brighten: 'hover:bg-gray-50 dark:hover:bg-slate-800',
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
```

### ✅ Good: Button Component

```43:145:components/ui/button.tsx
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
    };

    // Size styles - WCAG compliant with proper spacing
    const sizeStyles = {
      sm: 'text-sm px-4 py-2 min-h-[44px] gap-2', // 8px gap for breathing room
      md: 'text-base px-6 py-2.5 min-h-[48px] gap-2.5', // 10px gap
      lg: 'text-lg px-8 py-3 min-h-[52px] gap-3', // 12px gap
    };

    // Icon sizing based on button size
    const iconSizeMap = {
      sm: 'h-4 w-4', // 16px icons for small buttons
      md: 'h-5 w-5', // 20px icons for medium buttons
      lg: 'h-6 w-6', // 24px icons for large buttons
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
```

## Color System

### Official Verus Colors

Always use the official Verus brand colors:

```tsx
// Primary brand color
<div className="bg-verus-blue text-white">Blue</div>
<div className="bg-verus-blue-light hover:bg-verus-blue">Light Blue</div>
<div className="bg-verus-blue-dark">Dark Blue</div>

// Success state
<div className="bg-verus-green text-white">Green</div>

// Error state
<div className="bg-verus-red text-white">Red</div>

// With opacity
<div className="bg-verus-blue/10 text-verus-blue">
  Semi-transparent background
</div>
```

### Semantic Colors

```tsx
// Use semantic colors for states
<button className="bg-verus-success hover:bg-verus-green-light">
  Success
</button>
<button className="bg-verus-error hover:bg-verus-red-light">
  Error
</button>
<button className="bg-verus-warning">
  Warning
</button>
<button className="bg-verus-info">
  Info
</button>
```

## Spacing & Layout

### 8pt Grid System

Follow the 8pt grid system for consistent spacing:

```tsx
// Good spacing scale
<div className="p-2">8px</div>
<div className="p-4">16px (base)</div>
<div className="p-6">24px</div>
<div className="p-8">32px</div>
<div className="p-12">48px</div>
<div className="p-16">64px</div>
```

### Spacing Utilities

```56:85:lib/constants/design-tokens.ts
export const SPACING = {
  /** 0px - No spacing */
  none: '0',
  /** 2px - Micro spacing */
  micro: '0.5',
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
  /** 40px - Section spacing */
  '3xl': '10',
  /** 48px - Major section spacing */
  '4xl': '12',
  /** 64px - Hero section spacing */
  '5xl': '16',
  /** 80px - Page section spacing */
  '6xl': '20',
  /** 96px - Major page spacing */
  '7xl': '24',
} as const;
```

### Layout Patterns

```259:281:lib/constants/design-tokens.ts
export const LAYOUTS = {
  /** Centered content with max width and improved padding */
  container: 'max-w-7xl mx-auto px-6 sm:px-8 lg:px-12',
  /** Container with tighter padding for mobile */
  containerTight: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  /** Flex row with center alignment */
  flexCenter: 'flex items-center justify-center',
  /** Flex row with space between */
  flexBetween: 'flex items-center justify-between',
  /** Flex column */
  flexCol: 'flex flex-col',
  /** Grid with responsive columns */
  gridResponsive:
    'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  /** Section spacing pattern */
  section: 'py-16 lg:py-24',
  /** Card spacing pattern */
  card: 'p-6 lg:p-8',
  /** Button spacing pattern */
  button: 'px-6 py-3',
  /** Input spacing pattern */
  input: 'px-4 py-3',
} as const;
```

## Typography

### Type Scale

Use the standardized typography scale:

```tsx
// Heading hierarchy
<h1 className="text-5xl font-bold">H1 - 48px</h1>
<h2 className="text-4xl font-bold">H2 - 36px</h2>
<h3 className="text-3xl font-semibold">H3 - 30px</h3>
<h4 className="text-2xl font-semibold">H4 - 24px</h4>
<h5 className="text-xl font-semibold">H5 - 20px</h5>
<h6 className="text-lg font-semibold">H6 - 18px</h6>

// Body text
<p className="text-base">Base - 16px</p>
<p className="text-sm">Small - 14px</p>
<p className="text-xs">Extra Small - 12px</p>
```

### Font Sizes

```120:143:lib/constants/design-tokens.ts
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
```

## Performance Optimization

### Content Configuration

Ensure Tailwind scans all your files:

```js
content: [
  './pages/**/*.{js,ts,jsx,tsx,mdx}',
  './components/**/*.{js,ts,jsx,tsx,mdx}',
  './app/**/*.{js,ts,jsx,tsx,mdx}',
],
```

### JIT Mode

Tailwind CSS 3.4.18 uses JIT by default - no configuration needed!

### Purge Strategy

Tailwind automatically purges unused styles in production builds.

### CSS Bundle Size

```tsx
// ✅ Good: Use utilities efficiently
<div className="flex items-center">

// ❌ Bad: Over-engineering
<div className="flex flex-row items-center justify-start">

// ✅ Good: Shorthand
<div className="bg-blue-500">

// ❌ Bad: Longhand
<div className="bg-blue-500 text-blue-500">
```

## Arbitrary Values

### When to Use

Use arbitrary values sparingly for one-off values not in the design system:

```tsx
// ✅ Good: One-off spacing
<div className="pt-[120px]">

// ✅ Good: One-off color
<div className="bg-[#1a2332]">

// ✅ Good: Dynamic values
<div style={{ height: `${customHeight}px` }}>

// ❌ Bad: Should use design token
<div className="p-[16px]">  {/* Should use p-4 */}
```

### Arbitrary Properties

For properties not supported by Tailwind:

```tsx
// CSS Grid with arbitrary properties
<div className="[grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">

// Custom cursor
<div className="cursor-[url(custom.svg),auto]">

// Aspect ratio
<div className="aspect-[21/9]">
```

## Common Patterns

### Card Components

```tsx
<Card variant="elevated" padding="md" hover="glow">
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

### Loading States

```tsx
<div className="animate-pulse">
  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
</div>
```

### Focus States

```tsx
<button className="focus:outline-none focus:ring-2 focus:ring-verus-blue focus:ring-offset-2">
  Button
</button>
```

### Hover States

```tsx
<button className="hover:bg-verus-blue-light transition-colors duration-200">
  Hover Me
</button>
```

### Group Hover

```tsx
<div className="group">
  <div className="group-hover:opacity-100 opacity-0">
    Hidden content
  </div>
</div>
```

### Mobile Optimizations

```48:103:components/mobile-optimizations.tsx
export function MobileLoadingSpinner({
  size = 'medium',
}: {
  size?: 'small' | 'medium' | 'large';
}) {
  const tCommon = useTranslations('common');
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12',
  };

  return (
    <div className="flex items-center justify-center p-4">
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-verus-blue border-t-transparent`}
        role="status"
        aria-label={tCommon("loading")}
      >
        <span className="sr-only">{tCommon("loading")}</span>
      </div>
    </div>
  );
}

// Mobile-optimized card component
export function MobileCard({
  children,
  className = '',
  onClick,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  [key: string]: any;
}) {
  const { isMobile, isTouchDevice } = useMobileOptimizations();

  return (
    <div
      className={`
        theme-card rounded-xl p-4 transition-all duration-200
        ${isMobile ? 'p-3' : 'p-6'}
        ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''}
        ${isTouchDevice ? 'touch-manipulation' : ''}
        ${className}
      `}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}
```

## Anti-Patterns to Avoid

### ❌ Antipattern 1: Utility Chaining

```tsx
// ❌ Bad: Too many utilities
<div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer">

// ✅ Good: Extract to component
<Card hover="lift">...</Card>
```

### ❌ Antipattern 2: Inline Styles

```tsx
// ❌ Bad: Use Tailwind utilities instead
<div style={{ padding: '16px', background: '#fff' }}>

// ✅ Good: Use utilities
<div className="p-4 bg-white">
```

### ❌ Antipattern 3: Custom CSS for Utilities

```css
/* ❌ Bad: Don't recreate utilities */
.my-button {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  background: blue;
  color: white;
  border-radius: 0.5rem;
}

/* ✅ Good: Use @apply or utility classes */
.my-button {
  @apply flex items-center px-4 py-2 bg-verus-blue text-white rounded-lg;
}
```

### ❌ Antipattern 4: Inconsistent Spacing

```tsx
// ❌ Bad: Random spacing values
<div className="p-3.5">
<div className="p-7">
<div className="p-[13px]">

// ✅ Good: Use standard scale
<div className="p-3">
<div className="p-6">
<div className="p-4">
```

### ❌ Antipattern 5: Ignoring Dark Mode

```tsx
// ❌ Bad: Only light mode
<div className="bg-white text-gray-900">

// ✅ Good: Include dark mode
<div className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white">
```

### ❌ Antipattern 6: Overusing Arbitrary Values

```tsx
// ❌ Bad: Arbitrary for everything
<div className="w-[18.75rem] p-[1.25rem] text-[0.9375rem]">

// ✅ Good: Use design tokens
<div className="w-80 p-5 text-sm">
```

## Summary Checklist

When writing Tailwind CSS in VerusPulse, ensure:

- ✅ Use utility classes instead of custom CSS
- ✅ Follow mobile-first responsive design
- ✅ Include dark mode for all color and background utilities
- ✅ Use official Verus brand colors (verus-blue, verus-green, verus-red)
- ✅ Follow the 8pt grid system for spacing
- ✅ Use standardized typography scale
- ✅ Extract repeated patterns into components
- ✅ Optimize for production with proper content paths
- ✅ Use arbitrary values only when necessary
- ✅ Follow WCAG accessibility guidelines for focus states
- ✅ Use design tokens from `lib/constants/design-tokens.ts`
- ✅ Implement proper hover and focus states
- ✅ Consider mobile touch targets (min 44px)
- ✅ Use semantic HTML with proper Tailwind styling
- ✅ Avoid inline styles unless absolutely necessary

## Additional Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Tailwind CSS 3.4 Release Notes](https://tailwindcss.com/docs/upgrade-guide)
- [Tailwind UI Components](https://tailwindui.com/components)
- [Headless UI](https://headlessui.com/) - Accessible components for Tailwind

## Next Steps

Consider these improvements:

1. **Custom Plugins**: Add Tailwind plugins for common patterns
2. **Container Queries**: Implement responsive containers
3. **Typography Plugin**: Enhanced typography utilities
4. **Forms Plugin**: Better form styling
5. **Aspect Ratio**: Native aspect ratio utilities
6. **Backdrop Blur**: Enhanced backdrop effects
7. **Ring Utilities**: Focus ring enhancements
