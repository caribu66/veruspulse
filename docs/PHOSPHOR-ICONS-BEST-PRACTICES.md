# Phosphor Icons Best Practices for VerusPulse

This guide covers best practices for using [Phosphor Icons](https://phosphoricons.com/) (v2.1.7) in the VerusPulse dApp codebase.

---

## Table of Contents

1. [Installation & Setup](#installation--setup)
2. [Import Patterns](#import-patterns)
3. [Type Safety](#type-safety)
4. [Icon Sizing](#icon-sizing)
5. [Icon Weights & Styles](#icon-weights--styles)
6. [Dynamic Icon Rendering](#dynamic-icon-rendering)
7. [Accessibility](#accessibility)
8. [Performance Optimization](#performance-optimization)
9. [Common Patterns](#common-patterns)
10. [Anti-Patterns](#anti-patterns)

---

## Installation & Setup

### Package Version

VerusPulse uses **Phosphor Icons React v2.1.7**:

```json:package.json
"@phosphor-icons/react": "^2.1.7"
```

### Design Token Integration

Icons in VerusPulse are standardized using the `ICON_SIZES` design token from `lib/constants/design-tokens.ts`:

```typescript:lib/constants/design-tokens.ts
export const ICON_SIZES = {
  /** 12px - For text-xs (12px) - badges, tiny indicators */
  xs: 'h-3 w-3',
  /** 16px - For text-sm (14px) and text-base (16px) - buttons, inline icons */
  sm: 'h-4 w-4',
  /** 20px - For text-lg (18px) and text-xl (20px) - default for most UI */
  md: 'h-5 w-5',
  /** 24px - For text-2xl (24px) - headings, prominent icons */
  lg: 'h-6 w-6',
  /** 32px - For text-3xl (30px) and text-4xl (36px) - large headings */
  xl: 'h-8 w-8',
  /** 48px - For text-5xl (48px) - hero sections, major features */
  '2xl': 'h-12 w-12',
  /** 64px - For text-6xl+ (60px+) - landing pages, major hero elements */
  '3xl': 'h-16 w-16',
} as const;
```

---

## Import Patterns

### ✅ Direct Import

**Best for:** Single icon usage in components

```typescript
import { MagnifyingGlass, Bell, Gear } from '@phosphor-icons/react';

function SearchButton() {
  return (
    <button aria-label="Search">
      <MagnifyingGlass className="h-4 w-4" />
    </button>
  );
}
```

### ✅ Named Import Groups

**Best for:** Organizing related icons

```typescript:components/quick-actions.tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  MagnifyingGlass,
  ArrowsClockwise,
  Gear,
  Bell,
  DownloadSimple,
  UploadSimple,
  Funnel,
  BookmarkSimple,
} from '@phosphor-icons/react';
```

### ❌ Avoid Wildcard Imports

```typescript
// ❌ Bad - imports entire library, increases bundle size
import * as PhosphorIcons from '@phosphor-icons/react';
```

---

## Type Safety

### ✅ Proper Icon Component Typing

When passing icons as props or storing them in arrays, use the correct TypeScript type:

```typescript:components/quick-actions.tsx
interface QuickAction {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  action: () => void;
  badge?: string | number;
  disabled?: boolean;
}
```

### ✅ Using `as const` for Icon Maps

```typescript:lib/achievement-icons.tsx
export const achievementIcons = {
  // Milestone icons
  target: Target,
  award: Medal,
  trophy: Trophy,
  crown: Crown,
  star: Star,
  coins: Coins,
  gem: Diamond,

  // Performance icons
  zap: Lightning,
  'trending-up': TrendUp,
  activity: ArrowsLeftRight,
  flame: Fire,
  'calendar-check': CalendarCheck,
  sparkles: Sparkle,

  // Time-based icons
  clock: Clock,
  history: ClockCounterClockwise,
  hourglass: Hourglass,
  calendar: Calendar,
  timer: Timer,

  // Special icons
  gift: Gift,
  medal: Medal,
  'refresh-cw': ArrowsClockwise,
  diamond: DiamondsFour,
  users: UsersThree,
  'calendar-days': CalendarBlank,
} as const;
```

### ✅ Strongly Typed Icon References

```typescript:lib/achievement-icons.tsx
export type AchievementIcon = keyof typeof achievementIcons;

export interface AchievementIconProps {
  name: AchievementIcon;
  className?: string;
  size?: number;
}

export function AchievementIconComponent({
  name,
  className = 'h-6 w-6',
  size = 24,
}: AchievementIconProps) {
  const IconComponent = achievementIcons[name];

  if (!IconComponent) {
    console.warn(`Unknown achievement icon: ${name}`);
    return <Target className={className} size={size} />; // Fallback icon
  }

  return <IconComponent className={className} size={size} />;
}
```

---

## Icon Sizing

### ✅ Using Design Tokens

**Always use `ICON_SIZES` from design tokens for consistency:**

```typescript:components/enhanced-navigation-bar.tsx
import { ICON_SIZES } from '@/lib/constants/design-tokens';

// In component:
<Icon className={ICON_SIZES.sm} />
```

### ✅ Common Size Patterns

```typescript
// Navigation icons - small
<Icon className="h-4 w-4" /> // ICON_SIZES.sm

// Button icons - medium
<Icon className="h-5 w-5" /> // ICON_SIZES.md

// Section headers - large
<Icon className="h-6 w-6" /> // ICON_SIZES.lg

// Hero sections - extra large
<Icon className="h-12 w-12" /> // ICON_SIZES['2xl']
```

### ✅ Responsive Icon Sizing

```typescript:components/mobile-optimizations.tsx
const sizeClasses = {
  small: isMobile ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm',
  medium: isMobile ? 'px-4 py-2 text-sm' : 'px-6 py-3 text-base',
  large: isMobile ? 'px-6 py-3 text-base' : 'px-8 py-4 text-lg',
} as const;
```

---

## Icon Weights & Styles

Phosphor Icons support 6 weights: **thin**, **light**, **regular**, **bold**, **fill**, **duotone**.

### ✅ Weight Patterns

```typescript:lib/utils/block-icons.tsx
export function getBlockIcon(blocktype?: string, className?: string) {
  const iconClass = className || 'h-4 w-4';

  if (blocktype === 'minted') {
    // Proof of Stake (PoS) - Staking/Coins icon
    return (
      <span title="Proof of Stake (PoS)">
        <Coins className={`${iconClass} text-green-400`} weight="fill" />
      </span>
    );
  } else {
    // Proof of Work (PoW) - Mining/Hammer icon
    return (
      <span title="Proof of Work (PoW)">
        <Hammer className={`${iconClass} text-yellow-400`} weight="fill" />
      </span>
    );
  }
}
```

### Weight Guidelines

- **regular** (default): Standard UI elements, most common
- **bold**: Emphasis, active states, important actions
- **fill**: Distinguishing block types, prominent features
- **thin**: Decorative, subtle indicators
- **light**: Soft UI elements
- **duotone**: Hero sections, featured content

---

## Dynamic Icon Rendering

### ✅ Storing Icons in Data Structures

**Pattern:** Store icon components directly in arrays/objects

```typescript:components/quick-actions.tsx
const actions: QuickAction[] = [
  {
    id: 'search',
    icon: MagnifyingGlass,
    label: tCommon("search"),
    action: onSearch || (() => {}),
  },
  {
    id: 'refresh',
    icon: ArrowsClockwise,
    label: tCommon("refresh"),
    action: handleRefresh,
    disabled: isRefreshing,
  },
  // ... more actions
];
```

### ✅ Rendering Dynamic Icons

```typescript:components/quick-actions.tsx
return (
  <div className={cn('flex items-center space-x-1', className)}>
    {actions.map(action => {
      const Icon = action.icon; // Extract icon component
      return (
        <button
          key={action.id}
          onClick={action.action}
          disabled={action.disabled}
        >
          <Icon
            className={cn('h-4 w-4', action.disabled && 'animate-spin')}
          />
          {showLabels && !compact && (
            <span className="text-sm font-medium">{action.label}</span>
          )}
        </button>
      );
    })}
  </div>
);
```

### ✅ Conditional Icon Selection

```typescript:lib/achievement-icons.tsx
export function AchievementIconComponent({
  name,
  className = 'h-6 w-6',
  size = 24,
}: AchievementIconProps) {
  const IconComponent = achievementIcons[name];

  if (!IconComponent) {
    console.warn(`Unknown achievement icon: ${name}`);
    return <Target className={className} size={size} />; // Fallback icon
  }

  return <IconComponent className={className} size={size} />;
}
```

---

## Accessibility

### ✅ Providing Text Labels

**Every interactive icon should have a text label or aria-label:**

```typescript:components/quick-actions.tsx
<button
  onClick={action.action}
  disabled={action.disabled}
  title={action.label}
  aria-label={action.label}
>
  <Icon className={cn('h-4 w-4', action.disabled && 'animate-spin')} />
  {showLabels && !compact && (
    <span className="text-sm font-medium">{action.label}</span>
  )}
</button>
```

### ✅ Using `aria-hidden` for Decorative Icons

```typescript:components/language-switcher.tsx
<Check className="h-5 w-5" weight="bold" aria-hidden="true" />
```

### ✅ Icon-Text Pairing Best Practices

```typescript:components/enhanced-navigation-bar.tsx
<button
  onClick={() => onTabChange(item.key)}
  aria-current={isActive ? 'page' : undefined}
  title={item.label}
>
  <Icon className={`${ICON_SIZES.sm}`} />
  <span>{item.label}</span>
</button>
```

### Minimum Sizes for Accessibility

- **Touch targets:** Minimum 44x44px (iOS) or 48x48px (Material Design)
- **Visual icon size:** Minimum 16px for readability
- **Text + icon spacing:** 4-8px gap

---

## Performance Optimization

### ✅ Tree Shaking

Phosphor Icons supports tree shaking automatically when using named imports:

```typescript
// ✅ Good - only imports what's needed
import { MagnifyingGlass, Bell } from '@phosphor-icons/react';

// ❌ Bad - increases bundle size
import * as PhosphorIcons from '@phosphor-icons/react';
```

### ✅ Lazy Loading Icons

For icons used in conditional rendering or less-common UI states, consider lazy loading:

```typescript
const ConditionalIcon = lazy(() =>
  import('@phosphor-icons/react').then(mod => ({
    default: mod.SpecialIcon
  }))
);
```

### ✅ Memoization for Icon Lists

When rendering large icon lists, memoize the icon array:

```typescript
const navigationItems = useMemo(
  () => [
    {
      key: 'dashboard' as ExplorerTab,
      label: t('dashboard'),
      icon: ChartBar,
      shortcut: '⌥1',
    },
    {
      key: 'explorer' as ExplorerTab,
      label: t('explorer'),
      icon: MagnifyingGlass,
      shortcut: '⌥2',
    },
    {
      key: 'verusids' as ExplorerTab,
      label: t('verusids'),
      icon: UsersThree,
      shortcut: '⌥3',
    },
  ],
  [t]
);
```

---

## Common Patterns

### Pattern 1: Icon with Loading State

```typescript:components/quick-actions.tsx
<Icon
  className={cn('h-4 w-4', action.disabled && 'animate-spin')}
/>
```

### Pattern 2: Icon with Conditional Styling

```typescript:components/enhanced-navigation-bar.tsx
<Icon
  className={`${ICON_SIZES.sm} ${
    isActive
      ? 'text-verus-blue'
      : 'group-hover:text-verus-blue dark:group-hover:text-verus-blue'
  }`}
/>
```

### Pattern 3: Icon with `cn` Utility

```typescript:components/quick-actions.tsx
<Icon
  className={cn('h-4 w-4', action.disabled && 'animate-spin')}
/>
```

### Pattern 4: Icon with Weight and Custom Styling

```typescript:components/blocks-explorer.tsx
<DownloadSimple className="h-4 w-4 text-verus-blue" />
```

```typescript:components/verus-explorer.tsx
<DiscordLogo
  className="h-4 w-4 text-[#5865F2] group-hover:scale-110 transition-transform duration-200"
  weight="fill"
/>
```

### Pattern 5: Icon with Drop Shadow

```typescript:components/donation-widget.tsx
<Heart
  className="h-5 w-5 fill-current drop-shadow-[0_2px_8px_rgba(255,255,255,0.5)]"
  weight="fill"
/>
```

### Pattern 6: Icon in Conditional Block Type Display

```typescript:lib/utils/block-icons.tsx
export function getBlockIcon(blocktype?: string, className?: string) {
  const iconClass = className || 'h-4 w-4';

  if (blocktype === 'minted') {
    return (
      <span title="Proof of Stake (PoS)">
        <Coins className={`${iconClass} text-green-400`} weight="fill" />
      </span>
    );
  } else {
    return (
      <span title="Proof of Work (PoW)">
        <Hammer className={`${iconClass} text-yellow-400`} weight="fill" />
      </span>
    );
  }
}
```

---

## Anti-Patterns

### ❌ Inline Hardcoded Sizes Without Context

```typescript
// ❌ Bad - Magic number, not semantic
<Icon className="h-4.5 w-4.5" />

// ✅ Good - Uses design token
<Icon className={ICON_SIZES.sm} />
```

### ❌ Missing Accessibility Attributes

```typescript
// ❌ Bad - No label for screen readers
<button onClick={handleClick}>
  <Icon className="h-4 w-4" />
</button>

// ✅ Good - Has aria-label
<button onClick={handleClick} aria-label="Search">
  <Icon className="h-4 w-4" />
</button>
```

### ❌ Incorrect Type for Icon Props

```typescript
// ❌ Bad - Too loose
interface Props {
  icon: any;
}

// ✅ Good - Properly typed
interface Props {
  icon: React.ComponentType<{ className?: string }>;
}
```

### ❌ Inconsistent Sizing Across Similar UI

```typescript
// ❌ Bad - Different sizes for same purpose
<Icon className="h-4 w-4" /> // In one place
<Icon className="h-5 w-5" /> // In similar place

// ✅ Good - Consistent using design tokens
<Icon className={ICON_SIZES.sm} />
```

### ❌ String Concatenation for Icon Classes

```typescript
// ❌ Bad - Hard to read and maintain
className={`h-4 w-4 ${isActive ? 'text-verus-blue' : 'text-gray-500'}`}

// ✅ Good - Uses cn utility
className={cn(ICON_SIZES.sm, isActive ? 'text-verus-blue' : 'text-gray-500')}
```

---

## Quick Reference

### Common Icon Sets in VerusPulse

#### Navigation
- `ChartBar` - Dashboard
- `MagnifyingGlass` - Search/Explorer
- `UsersThree` - VerusIDs
- `List` - Mobile menu

#### Actions
- `ArrowsClockwise` - Refresh
- `DownloadSimple` - Export/Download
- `UploadSimple` - Import/Upload
- `Gear` - Settings
- `Bell` - Notifications
- `Funnel` - Filter
- `BookmarkSimple` - Bookmark

#### Blockchain
- `Hash` - Block hash
- `Clock` - Time/Confirmation
- `Coins` - PoS (Minted)
- `Hammer` - PoW (Mined)
- `Lightning` - Fast/New
- `Pulse` - Live data
- `Network` - Network status

#### Status
- `CheckCircle` - Success
- `WarningCircle` - Warning
- `X` - Error/Close
- `Check` - Verified

#### Social
- `DiscordLogo` - Discord
- `XLogo` - X/Twitter

### Size Guidelines

| Context | Size | Token |
|---------|------|-------|
| Badges, tiny indicators | 12px | `ICON_SIZES.xs` |
| Buttons, inline icons | 16px | `ICON_SIZES.sm` |
| Default UI | 20px | `ICON_SIZES.md` |
| Headings, prominent | 24px | `ICON_SIZES.lg` |
| Large headings | 32px | `ICON_SIZES.xl` |
| Hero sections | 48px | `ICON_SIZES['2xl']` |
| Major hero elements | 64px | `ICON_SIZES['3xl']` |

---

## Resources

- [Phosphor Icons Official Site](https://phosphoricons.com/)
- [Phosphor Icons React Documentation](https://github.com/phosphor-icons/react)
- [VerusPulse Design Tokens](../../lib/constants/design-tokens.ts)
- [Phosphor Icons v2 Release Notes](https://github.com/phosphor-icons/core/releases/tag/v2.0.0)

---

## Summary

### Key Takeaways

1. ✅ Always use `ICON_SIZES` design tokens for consistency
2. ✅ Type icon props as `React.ComponentType<{ className?: string }>`
3. ✅ Provide `aria-label` or text labels for all interactive icons
4. ✅ Use named imports for tree shaking
5. ✅ Apply `cn()` utility for conditional icon classes
6. ✅ Use `as const` for icon maps and data structures
7. ✅ Prefer explicit weights (`weight="fill"`, `weight="bold"`) for emphasis
8. ✅ Store icon components directly in arrays for dynamic rendering

### Common Mistakes to Avoid

❌ Hardcoded pixel values instead of design tokens
❌ Missing accessibility labels
❌ Inconsistent sizing across similar UI
❌ String concatenation for conditional classes
❌ Wildcard imports
❌ Weak typing (`any`) for icon props

---

**Last Updated:** December 2024
**Icon Library Version:** Phosphor Icons v2.1.7
**Framework:** React + Next.js

