# VerusPulse UI/UX Best Practices Guide
**Version:** 1.0  
**Last Updated:** October 31, 2025

This guide outlines the UI/UX standards and best practices for VerusPulse development team.

---

## Table of Contents
1. [Design Principles](#design-principles)
2. [Component Usage](#component-usage)
3. [Accessibility Guidelines](#accessibility-guidelines)
4. [Color System](#color-system)
5. [Typography](#typography)
6. [Spacing & Layout](#spacing--layout)
7. [Form Design](#form-design)
8. [Loading States](#loading-states)
9. [Error Handling](#error-handling)
10. [Mobile Optimization](#mobile-optimization)
11. [Performance Guidelines](#performance-guidelines)

---

## Design Principles

### 1. **User-Centric Design**
- Always prioritize user needs over technical convenience
- Provide clear feedback for all user actions
- Make common tasks easy, advanced features discoverable

### 2. **Consistency**
- Use the same patterns throughout the application
- Follow established component APIs
- Maintain visual hierarchy across all pages

### 3. **Accessibility First**
- Design for keyboard navigation from the start
- Provide text alternatives for all visual content
- Ensure color contrast meets WCAG AA standards
- Support screen readers with proper ARIA labels

### 4. **Progressive Enhancement**
- Core functionality works without JavaScript
- Enhanced features gracefully degrade
- Support older browsers where feasible

### 5. **Performance**
- Lazy load components and routes
- Optimize images and assets
- Minimize layout shifts
- Target < 3s load time on 3G

---

## Component Usage

### Buttons

✅ **DO:**
```tsx
import { Button } from '@/components/ui/button';

// Standard button with proper accessibility
<Button 
  variant="primary" 
  size="md" 
  onClick={handleClick}
>
  Save Changes
</Button>

// Loading state
<Button loading>
  Saving...
</Button>

// Icon button with aria-label
<Button 
  variant="ghost" 
  size="sm"
  icon={<X />}
  aria-label="Close dialog"
/>
```

❌ **DON'T:**
```tsx
// Missing accessible label for icon button
<button><X /></button>

// Using generic styles instead of component
<div className="btn" onClick={handleClick}>Click</div>

// Missing loading state feedback
<button disabled={loading}>Save</button>
```

### Forms

✅ **DO:**
```tsx
import { Input } from '@/components/ui/input';

// Comprehensive form input
<Input
  label="Email Address"
  type="email"
  required
  helperText="We'll never share your email"
  error={errors.email}
  validate={(value) => ({
    valid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message: !value.includes('@') ? 'Must include @' : undefined
  })}
/>
```

❌ **DON'T:**
```tsx
// Missing label and validation
<input type="email" placeholder="Email" />

// Error message without proper ARIA
<input type="email" className="error" />
<span>Invalid email</span>
```

### Loading States

✅ **DO:**
```tsx
import { LoadingSpinner, LoadingSkeleton } from '@/components/ui/loading-state';

// Skeleton for content loading
<LoadingSkeleton variant="rectangular" height={200} />

// Spinner for actions
<LoadingSpinner message="Loading data..." centered />

// Overlay for blocking operations
<LoadingOverlay show={loading} message="Processing..." />
```

❌ **DON'T:**
```tsx
// Generic loading without context
{loading && <div>Loading...</div>}

// No loading indicator
<button onClick={async () => await saveData()}>Save</button>
```

### Error States

✅ **DO:**
```tsx
import { ErrorState, EmptyState } from '@/components/ui/error-state';

// Error with retry
<ErrorState
  type="error"
  title="Failed to Load Data"
  message="We couldn't fetch the blockchain data. Please try again."
  showRetry
  onRetry={refetch}
/>

// Empty state
<EmptyState
  icon={<MagnifyingGlass size={48} />}
  title="No Results Found"
  description="Try adjusting your search or filters"
  action={{
    label: 'Clear Filters',
    onClick: clearFilters
  }}
/>
```

❌ **DON'T:**
```tsx
// Generic error without action
{error && <div>Error!</div>}

// Empty state that looks like error
{data.length === 0 && <div className="text-red-500">No data</div>}
```

---

## Accessibility Guidelines

### Keyboard Navigation

**Requirements:**
- All interactive elements must be keyboard accessible
- Focus indicators must be clearly visible
- Tab order must be logical
- Keyboard shortcuts for common actions

✅ **DO:**
```tsx
// Proper focus management
<button 
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
  Click me
</button>

// Skip navigation
<a href="#main-content" className="skip-link">
  Skip to main content
</a>
```

### ARIA Labels

**When to Use:**
- Icon-only buttons → `aria-label`
- Form inputs → `aria-describedby` for errors/help
- Live regions → `aria-live`, `aria-atomic`
- Complex widgets → `role`, `aria-expanded`, etc.

✅ **DO:**
```tsx
<button aria-label="Close dialog">
  <X />
</button>

<input
  aria-invalid={hasError}
  aria-describedby={hasError ? "error-id" : "help-id"}
/>
<span id="help-id">Enter your email address</span>
{hasError && <span id="error-id" role="alert">Invalid email</span>}
```

### Color Contrast

**Minimum Requirements (WCAG AA):**
- Normal text: 4.5:1 contrast ratio
- Large text (18pt+): 3:1 contrast ratio
- Interactive elements: 3:1 contrast ratio

**Test with:**
- Chrome DevTools Lighthouse
- WebAIM Contrast Checker
- axe DevTools

### Screen Reader Support

✅ **DO:**
```tsx
// Provide text alternatives
<img src="chart.png" alt="Revenue chart showing 25% growth" />

// Use semantic HTML
<nav>
  <ul>
    <li><a href="/">Home</a></li>
  </ul>
</nav>

// Announce dynamic content
<div aria-live="polite" aria-atomic="true">
  {message}
</div>
```

---

## Color System

### Official Verus Brand Colors

```css
/* Primary - Use for main actions and links */
--verus-blue: #3165d4;
--verus-blue-light: #4a7ce8;
--verus-blue-dark: #2650b3;

/* Success - Use for positive actions and confirmations */
--verus-green: #4AA658;
--verus-green-light: #5cb96a;
--verus-green-dark: #3d8a49;

/* Error/Danger - Use for errors and destructive actions */
--verus-red: #D4313E;
--verus-red-light: #e04b56;
--verus-red-dark: #b52732;

/* Warning - Use sparingly for caution */
--color-warning: #f59e0b;
```

### Color Usage Guidelines

✅ **DO:**
- Use Verus blue for primary actions
- Use Verus green for success states
- Use Verus red for errors and alerts
- Maintain color consistency across similar elements

❌ **DON'T:**
- Use random Tailwind colors (e.g., `text-purple-500`)
- Convey information through color alone
- Use low-contrast color combinations

### Dark vs Light Theme

**Always consider both themes:**
```tsx
// Use theme-aware classes
<div className="bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">
  Content
</div>

// Or use CSS variables
<div style={{ 
  background: 'var(--bg-primary)', 
  color: 'var(--text-primary)' 
}}>
  Content
</div>
```

---

## Typography

### Font Scale

| Style | Size | Use Case |
|-------|------|----------|
| h1 | 3.75rem (60px) | Page titles |
| h2 | 3rem (48px) | Section headers |
| h3 | 2.125rem (34px) | Subsection headers |
| h4 | 1.5rem (24px) | Card titles |
| body | 1rem (16px) | Body text |
| small | 0.875rem (14px) | Helper text |
| caption | 0.75rem (12px) | Labels, metadata |

### Line Height Guidelines

- **Headlines (h1-h3):** 1.1-1.3
- **Body text:** 1.5-1.6
- **Small text:** 1.4-1.5

### Font Weight Guidelines

- **Light (300):** Large display text
- **Regular (400):** Body text
- **Medium (500):** Subheadings, buttons
- **Semibold (600):** Important text
- **Bold (700):** Emphasis, headers

✅ **DO:**
```tsx
<h1 className="text-5xl font-light leading-tight">
  VerusPulse
</h1>
<p className="text-base leading-relaxed">
  Explore the Verus blockchain...
</p>
```

❌ **DON'T:**
```tsx
// All caps without letter spacing
<h1 style={{ textTransform: 'uppercase' }}>TITLE</h1>

// Line height too tight
<p className="leading-none">Long paragraph...</p>
```

---

## Spacing & Layout

### 8-Point Grid System

Use multiples of 8px (or 4px for fine-tuning):
- **4px** - Micro spacing (gaps between related items)
- **8px** - Small spacing (form field gaps)
- **16px** - Medium spacing (section gaps)
- **24px** - Large spacing (component gaps)
- **32px** - XL spacing (major sections)
- **48px+** - XXL spacing (page sections)

### Responsive Breakpoints

```javascript
const breakpoints = {
  xs: '375px',  // Small phones
  sm: '640px',  // Large phones
  md: '768px',  // Tablets
  lg: '1024px', // Laptops
  xl: '1280px', // Desktops
  '2xl': '1536px' // Large desktops
};
```

### Layout Patterns

✅ **DO:**
```tsx
// Consistent spacing with gap utilities
<div className="flex gap-4">
  <Card />
  <Card />
</div>

// Responsive padding
<div className="px-4 md:px-6 lg:px-8">
  Content
</div>
```

---

## Form Design

### Form Layout

✅ **DO:**
```tsx
<form onSubmit={handleSubmit} className="space-y-6">
  {/* Group related fields */}
  <fieldset className="space-y-4">
    <legend className="text-lg font-semibold mb-4">
      Personal Information
    </legend>
    
    <Input
      label="First Name"
      name="firstName"
      required
      error={errors.firstName}
    />
    
    <Input
      label="Email"
      type="email"
      name="email"
      required
      helperText="We'll never share your email"
      error={errors.email}
    />
  </fieldset>

  <div className="flex justify-end gap-3">
    <Button variant="secondary" type="button">
      Cancel
    </Button>
    <Button variant="primary" type="submit" loading={submitting}>
      Submit
    </Button>
  </div>
</form>
```

### Validation

**Real-time vs On-blur:**
- **Real-time:** Password strength, username availability
- **On-blur:** Email format, required fields
- **On-submit:** Final validation before API call

✅ **DO:**
```tsx
<Input
  label="Email"
  type="email"
  validate={(value) => {
    if (!value) return { valid: false, message: 'Email is required' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return { valid: false, message: 'Please enter a valid email' };
    }
    return { valid: true };
  }}
/>
```

### Error Messages

**Good error messages are:**
- **Specific:** "Email must include @" not "Invalid input"
- **Helpful:** "Password must be at least 8 characters"
- **Positive:** "Enter your email" not "Don't leave this blank"
- **Actionable:** Tell users how to fix the error

---

## Loading States

### When to Show Loading

1. **Initial Page Load** - Skeleton loaders
2. **Data Fetching** - Spinner or progress bar
3. **Form Submission** - Button loading state
4. **Background Updates** - Subtle indicator

### Types of Loading Indicators

| Type | Use Case | Example |
|------|----------|---------|
| Spinner | Action feedback | Button click, API call |
| Skeleton | Content placeholder | Cards, tables, lists |
| Progress Bar | Known duration | File upload, processing |
| Overlay | Blocking operation | Payment processing |

### Loading State Examples

```tsx
// Button loading
<Button loading>Saving...</Button>

// Content loading with skeleton
{loading ? (
  <LoadingSkeleton variant="rectangular" height={200} />
) : (
  <Chart data={data} />
)}

// Overlay for critical operations
<LoadingOverlay 
  show={processing}
  message="Processing payment..."
  progress={uploadProgress}
/>
```

---

## Error Handling

### Error Hierarchy

1. **Field-level errors** - Inline validation messages
2. **Form-level errors** - Summary at top of form
3. **Page-level errors** - Error state component
4. **App-level errors** - Error boundary

### Error Recovery

✅ **DO:**
```tsx
<ErrorState
  type="error"
  title="Connection Failed"
  message="We couldn't connect to the blockchain node. This might be a temporary issue."
  showRetry
  onRetry={refetch}
  action={{
    label: 'Check Status',
    onClick: () => router.push('/status')
  }}
/>
```

### Empty States vs Errors

**Empty State:** No data available (not an error)
```tsx
<EmptyState
  title="No Transactions Yet"
  description="Transactions will appear here once they're broadcast"
/>
```

**Error State:** Something went wrong
```tsx
<ErrorState
  type="error"
  title="Failed to Load Transactions"
  message="We couldn't fetch your transactions"
  showRetry
  onRetry={refetch}
/>
```

---

## Mobile Optimization

### Touch Targets

**Minimum size:** 44x44px (Apple) or 48x48px (Material Design)

✅ **DO:**
```tsx
<Button size="md">  // min-h-[48px]
  Click me
</Button>
```

### Mobile-Specific Patterns

```tsx
// Mobile-optimized input
<Input
  type="email"           // Triggers email keyboard
  autoComplete="email"   // Better autofill
  inputMode="email"      // iOS keyboard hint
/>

// Touch-friendly spacing
<div className="flex gap-3">  // Larger gaps on mobile
  <Button />
  <Button />
</div>
```

### Responsive Typography

```tsx
// Adjust sizes for mobile
<h1 className="text-4xl md:text-5xl lg:text-6xl">
  Title
</h1>

// Readable body text
<p className="text-base md:text-lg leading-relaxed">
  Body content...
</p>
```

---

## Performance Guidelines

### Component Optimization

✅ **DO:**
```tsx
// Lazy load heavy components
const HeavyChart = lazy(() => import('./heavy-chart'));

// Memoize expensive calculations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// Prevent unnecessary re-renders
const MemoizedComponent = React.memo(Component);
```

### Image Optimization

```tsx
// Use Next.js Image component
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="VerusPulse"
  width={200}
  height={50}
  priority  // For above-the-fold images
/>
```

### Bundle Size

- Lazy load routes and heavy components
- Use dynamic imports for optional features
- Tree-shake unused code
- Monitor bundle size in CI/CD

---

## Code Review Checklist

### Before Submitting PR

- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are visible
- [ ] Color contrast meets WCAG AA
- [ ] Loading states are implemented
- [ ] Error states have retry functionality
- [ ] Form validation provides helpful messages
- [ ] Mobile touch targets are 44px minimum
- [ ] Components are responsive (mobile, tablet, desktop)
- [ ] Dark and light themes both work
- [ ] Screen reader tested (if possible)
- [ ] No console errors or warnings
- [ ] Performance tested (Lighthouse score > 90)

### Accessibility Tests

1. **Keyboard Navigation:** Tab through entire flow
2. **Screen Reader:** Test with VoiceOver/NVDA
3. **Color Blindness:** Use browser extension
4. **Contrast:** Check with DevTools or WebAIM
5. **Zoom:** Test at 200% zoom level

---

## Resources

### Official Documentation
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Material Design](https://m3.material.io/)
- [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/)

### Tools
- **Accessibility:** axe DevTools, Pa11y, WAVE
- **Design:** Figma, Sketch
- **Testing:** Playwright, Lighthouse CI

### Learning
- [A11y Project](https://www.a11yproject.com/)
- [Inclusive Components](https://inclusive-components.design/)
- [Every Layout](https://every-layout.dev/)

---

## Conclusion

These best practices ensure VerusPulse provides an excellent, accessible user experience for all users. When in doubt, prioritize:

1. **Accessibility** - Make it usable for everyone
2. **Clarity** - Make it easy to understand
3. **Consistency** - Follow established patterns
4. **Performance** - Make it fast and responsive

**Remember:** Good UX is invisible - users shouldn't notice the interface, they should accomplish their goals effortlessly.


