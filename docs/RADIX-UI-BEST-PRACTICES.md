# Radix UI Best Practices for VerusPulse

This guide covers best practices for using [Radix UI Primitives](https://www.radix-ui.com/) in the VerusPulse dApp codebase.

---

## Table of Contents

1. [Introduction](#introduction)
2. [Installation & Setup](#installation--setup)
3. [Component Wrapping Patterns](#component-wrapping-patterns)
4. [TypeScript Integration](#typescript-integration)
5. [Styling with Tailwind](#styling-with-tailwind)
6. [Accessibility Best Practices](#accessibility-best-practices)
7. [Progress Component](#progress-component)
8. [Common Patterns](#common-patterns)
9. [Performance Optimization](#performance-optimization)
10. [Anti-Patterns](#anti-patterns)

---

## Introduction

### What is Radix UI?

Radix UI is a low-level UI primitive library built on top of React. It provides:

- **Unstyled components** - Full control over styling
- **Accessibility** - Built-in ARIA attributes, keyboard navigation, and focus management
- **Composability** - Headless primitives you can customize
- **Type Safety** - Full TypeScript support
- **Performance** - Lightweight, tree-shakeable packages

### Current Usage in VerusPulse

VerusPulse currently uses:

- **`@radix-ui/react-progress`** v1.1.7 - For progress bars and loading indicators

Future Radix components can be added as needed (Dialog, DropdownMenu, Popover, etc.).

---

## Installation & Setup

### Installing Radix UI Components

Install individual Radix primitives as needed:

```bash
# Progress component (currently used)
npm install @radix-ui/react-progress

# Other common primitives (available when needed)
npm install @radix-ui/react-dialog
npm install @radix-ui/react-dropdown-menu
npm install @radix-ui/react-popover
npm install @radix-ui/react-tooltip
npm install @radix-ui/react-select
```

### Package Management

**Package Version:**

```json:package.json
{
  "dependencies": {
    "@radix-ui/react-progress": "^1.1.7"
  }
}
```

**Why Individual Packages?**

Each Radix UI component is its own package. This approach:
- ✅ Reduces bundle size (only import what you need)
- ✅ Better tree-shaking
- ✅ Clear dependency tracking
- ✅ Easier updates

---

## Component Wrapping Patterns

### ✅ The Wrapper Pattern

**Always wrap Radix primitives in custom components** for consistency and brand alignment.

#### Example: Progress Component

```typescript:components/ui/progress.tsx
'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';

import { cn } from '@/lib/utils';

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      'relative h-4 w-full overflow-hidden rounded-full bg-secondary',
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-primary transition-all"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
```

#### Why This Pattern?

1. **Consistent Styling** - All Progress bars use the same visual style
2. **Type Safety** - Proper TypeScript forwarding
3. **Accessibility Preserved** - Radix primitives handle ARIA automatically
4. **Customizable** - Still accepts `className` and `value` props
5. **Brand Alignment** - Uses `cn` utility and Verus design tokens

---

## TypeScript Integration

### ✅ Proper Ref Forwarding

Use `React.forwardRef` with the correct TypeScript types:

```typescript
import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';

// Correct: Use ElementRef and ComponentPropsWithoutRef
const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,  // Ref type
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>  // Props type
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root ref={ref} {...props} />
));
```

### ✅ Display Names

**Always set displayName** for better debugging:

```typescript
Progress.displayName = ProgressPrimitive.Root.displayName;
```

This appears correctly in React DevTools.

### ✅ Type-Safe Props Extension

Extend Radix props while maintaining type safety:

```typescript
import * as ProgressPrimitive from '@radix-ui/react-progress';

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  value?: number;
  className?: string;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, ...props }, ref) => (
  // Implementation
));
```

---

## Styling with Tailwind

### ✅ Using `cn` Utility

**Always use the `cn` utility** to combine Tailwind classes:

```typescript
import { cn } from '@/lib/utils';

<ProgressPrimitive.Root
  className={cn(
    'relative h-4 w-full overflow-hidden rounded-full bg-secondary',
    className  // Allow customization
  )}
  {...props}
/>
```

### ✅ Theme-Aware Styling

Use semantic color tokens for proper theme support:

```typescript
// ✅ Good - Theme-aware colors
className="bg-secondary text-secondary-foreground"

// ❌ Bad - Hardcoded colors
className="bg-slate-200 text-slate-900"
```

### ✅ Transition & Animation Classes

Add smooth transitions for state changes:

```typescript
<ProgressPrimitive.Indicator
  className="h-full w-full flex-1 bg-primary transition-all"
  style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
/>
```

The `transition-all` class ensures smooth value changes.

---

## Accessibility Best Practices

### ✅ Built-in Accessibility

Radix UI components include built-in accessibility:

- **ARIA attributes** - Automatically managed
- **Keyboard navigation** - Full keyboard support
- **Focus management** - Logical tab order
- **Screen reader support** - Proper roles and labels

### ✅ Don't Override Accessibility

**Never remove or override** Radix's accessibility features:

```typescript
// ❌ Bad - Removing ARIA
<div role={null} aria-label={undefined}>

// ✅ Good - Let Radix handle it
<Progress value={percentage} />
```

### ✅ Providing Context

Add descriptive labels in the UI:

```typescript:components/daemon-monitor-dashboard.tsx
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <TrendUp className="h-5 w-5" />
      Sync Progress
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">
            Verification Progress
          </span>
          <span className="text-sm text-gray-500">
            {stats.syncProgress.percentage.toFixed(2)}%
          </span>
        </div>
        <Progress
          value={stats.syncProgress.percentage}
          className="h-2"
        />
      </div>
    </div>
  </CardContent>
</Card>
```

### ✅ Live Regions for Dynamic Content

Use `aria-live` regions for updating progress:

```typescript
<div aria-live="polite" aria-atomic="true">
  <Progress value={progress} />
  <span>{progress}%</span>
</div>
```

---

## Progress Component

### Basic Usage

```typescript
import { Progress } from '@/components/ui/progress';

function SyncProgress() {
  return (
    <Progress value={75} className="h-2" />
  );
}
```

### With Labels

```typescript:components/daemon-monitor-dashboard.tsx
<div>
  <div className="flex justify-between items-center mb-2">
    <span className="text-sm font-medium">
      Verification Progress
    </span>
    <span className="text-sm text-gray-500">
      {stats.syncProgress.percentage.toFixed(2)}%
    </span>
  </div>
  <Progress
    value={stats.syncProgress.percentage}
    className="h-2"
  />
</div>
```

### Height Variations

```typescript
// Thin progress bar
<Progress value={50} className="h-1" />

// Default height
<Progress value={50} className="h-2" />

// Thick progress bar
<Progress value={50} className="h-4" />
```

### Conditional Rendering

Show progress only when value is present:

```typescript
{stats.syncProgress && (
  <Progress value={stats.syncProgress.percentage} />
)}
```

### Animation

The indicator uses a smooth transform animation:

```typescript
<ProgressPrimitive.Indicator
  className="h-full w-full flex-1 bg-primary transition-all"
  style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
/>
```

This creates a smooth left-to-right fill animation.

---

## Common Patterns

### Pattern 1: Progress with Status

Combine progress bars with status indicators:

```typescript
{stats.syncProgress.isSyncing ? (
  <div className="space-y-4">
    <Progress value={stats.syncProgress.percentage} />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <p className="text-sm text-gray-500">Blocks Behind</p>
        <p className="text-lg font-semibold">
          {formatNumber(stats.syncProgress.blocksBehind)}
        </p>
      </div>
      <div>
        <p className="text-sm text-gray-500">Est. Time Remaining</p>
        <p className="text-lg font-semibold">
          {stats.syncProgress.estimatedTimeRemaining.toFixed(1)} minutes
        </p>
      </div>
    </div>
  </div>
) : (
  <div className="flex items-center gap-2 text-green-600">
    <CheckCircle className="h-5 w-5" />
    <span className="font-medium">Fully Synced!</span>
  </div>
)}
```

### Pattern 2: Custom Progress Bar (Non-Radix)

For non-accessible decorative progress, use custom bars:

```typescript:components/enhanced-loading-screen.tsx
<div className="mb-4">
  <div className="flex justify-between text-xs text-blue-300 mb-2">
    <span>Progress</span>
    <span>{Math.round(progress)}%</span>
  </div>
  <div className="w-full bg-white/10 rounded-full h-2">
    <div
      className="bg-gradient-to-r from-verus-blue to-verus-green h-2 rounded-full transition-all duration-500 ease-out"
      style={{ width: `${progress}%` }}
    />
  </div>
</div>
```

**Note:** This is a decorative bar. For user-facing progress (sync, uploads), use the Radix Progress component.

### Pattern 3: Multiple Progress Bars

Display multiple progress indicators in a card:

```typescript
<Card>
  <CardHeader>
    <CardTitle>Network Status</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span>Sync Progress</span>
        <span>{syncProgress}%</span>
      </div>
      <Progress value={syncProgress} className="h-2" />
    </div>
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span>Mempool Usage</span>
        <span>{mempoolUsage}%</span>
      </div>
      <Progress value={mempoolUsage} className="h-2" />
    </div>
  </CardContent>
</Card>
```

---

## Performance Optimization

### ✅ Import Only What You Need

Radix packages are tree-shakeable:

```typescript
// ✅ Good - Named imports
import { Root, Indicator } from '@radix-ui/react-progress';

// ✅ Good - Namespace import for multiple primitives
import * as ProgressPrimitive from '@radix-ui/react-progress';
```

### ✅ Memoize Progress Values

When progress values update frequently, consider memoization:

```typescript
const displayProgress = useMemo(
  () => Math.round(progress),
  [progress]
);

<Progress value={displayProgress} />
```

### ✅ Lazy Loading

Lazy load Radix components in non-critical paths:

```typescript
const Progress = lazy(() => import('@/components/ui/progress'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Progress value={50} />
    </Suspense>
  );
}
```

---

## Anti-Patterns

### ❌ Direct Radix Usage Without Wrapping

```typescript
// ❌ Bad - No consistent styling
import * as ProgressPrimitive from '@radix-ui/react-progress';

function Component() {
  return <ProgressPrimitive.Root />;
}

// ✅ Good - Wrapped with consistent styling
import { Progress } from '@/components/ui/progress';

function Component() {
  return <Progress value={50} />;
}
```

### ❌ Removing Built-in Accessibility

```typescript
// ❌ Bad - Overriding ARIA attributes
<ProgressPrimitive.Root role="none" aria-label="" />

// ✅ Good - Let Radix handle accessibility
<Progress value={50} />
```

### ❌ Ignoring Type Safety

```typescript
// ❌ Bad - Loose typing
const Progress = React.forwardRef((props: any) => (/* ... */));

// ✅ Good - Proper typing
const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (/* ... */));
```

### ❌ Hardcoded Colors

```typescript
// ❌ Bad - Theme-unaware
<Progress className="bg-blue-500" />

// ✅ Good - Theme-aware
<Progress className="bg-primary" />
```

### ❌ Missing Display Names

```typescript
// ❌ Bad - No displayName
const Progress = React.forwardRef(/* ... */);

// ✅ Good - Proper displayName
Progress.displayName = ProgressPrimitive.Root.displayName;
```

### ❌ No Value Validation

```typescript
// ❌ Bad - No validation
<Progress value={progress} />

// ✅ Good - Validated value
<Progress value={Math.min(100, Math.max(0, progress))} />

// Or in the wrapper:
const Progress = React.forwardRef(({ value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    value={Math.min(100, Math.max(0, value || 0))}
    {...props}
  />
));
```

---

## Future Radix Components

When adding new Radix UI components, follow this process:

### 1. Install Package

```bash
npm install @radix-ui/react-[component-name]
```

### 2. Create Wrapper Component

```typescript:components/ui/[component-name].tsx
'use client';

import * as React from 'react';
import * as ComponentPrimitive from '@radix-ui/react-[component-name]';
import { cn } from '@/lib/utils';

const Component = React.forwardRef<
  React.ElementRef<typeof ComponentPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ComponentPrimitive.Root>
>(({ className, ...props }, ref) => (
  <ComponentPrimitive.Root
    ref={ref}
    className={cn('base-styles', className)}
    {...props}
  />
));
Component.displayName = ComponentPrimitive.Root.displayName;

export { Component };
```

### 3. Export from UI Index

```typescript:components/ui/index.ts
export { Progress } from './progress';
export { Dialog } from './dialog';
export { DropdownMenu } from './dropdown-menu';
```

### 4. Document Usage

Add examples and patterns to this guide.

---

## Common Radix Components to Consider

When needed, consider these Radix components:

### Dialog

Modal dialogs and alerts:
```bash
npm install @radix-ui/react-dialog
```

### DropdownMenu

Dropdown menus and selectors:
```bash
npm install @radix-ui/react-dropdown-menu
```

### Tooltip

Tooltips and popovers:
```bash
npm install @radix-ui/react-tooltip
npm install @radix-ui/react-popover
```

### Select

Custom select dropdowns:
```bash
npm install @radix-ui/react-select
```

### Tabs

Tab interfaces:
```bash
npm install @radix-ui/react-tabs
```

### Accordion

Collapsible sections:
```bash
npm install @radix-ui/react-accordion
```

---

## Resources

- [Radix UI Official Docs](https://www.radix-ui.com/)
- [Radix UI Progress Component](https://www.radix-ui.com/primitives/docs/components/progress)
- [Radix UI Accessibility](https://www.radix-ui.com/primitives/docs/overview/accessibility)
- [Radix UI Styling Guide](https://www.radix-ui.com/primitives/docs/guides/styling)
- [VerusPulse UI Components](../../components/ui/progress.tsx)

---

## Summary

### Key Takeaways

1. ✅ Always wrap Radix primitives in custom components for consistency
2. ✅ Use proper TypeScript typing with `forwardRef` and `ElementRef`
3. ✅ Set `displayName` for better debugging
4. ✅ Use `cn` utility for Tailwind class management
5. ✅ Preserve built-in accessibility features
6. ✅ Use theme-aware semantic colors (`bg-primary`, `text-secondary`)
7. ✅ Add smooth transitions for state changes
8. ✅ Provide descriptive labels for context
9. ✅ Import only what you need (tree-shaking)

### Common Mistakes to Avoid

❌ Using Radix components directly without wrapping
❌ Removing or overriding accessibility features
❌ Hardcoding colors instead of semantic tokens
❌ Missing `displayName` assignments
❌ Loose TypeScript typing
❌ No validation of prop values

---

**Last Updated:** December 2024
**Current Radix Version:** v1.1.7
**Framework:** React + Next.js + TypeScript
**Styling:** Tailwind CSS

