# Internationalization (i18n) Best Practices

## Overview

This document outlines best practices for implementing and maintaining internationalization in VerusPulse.

## Architecture

### File Structure

```
├── i18n.ts                          # Main i18n configuration
├── middleware.ts                    # Locale routing middleware
├── messages/                        # Translation files
│   ├── en.json
│   ├── es.json
│   └── ...
├── lib/i18n/                        # i18n utilities
│   ├── index.ts                     # Main exports
│   ├── types.ts                     # TypeScript types
│   ├── hooks.ts                     # React hooks
│   ├── utils.ts                     # Utility functions
│   └── metadata.ts                  # SEO metadata
└── components/
    ├── language-switcher.tsx        # Language selector
    └── i18n-error-boundary.tsx      # Error handling
```

## Best Practices

### 1. **Use Type-Safe Translations**

✅ **Good**:
```tsx
import { useTypedTranslations } from '@/lib/i18n/hooks';

function MyComponent() {
  const t = useTypedTranslations('dashboard');
  return <h1>{t('welcome')}</h1>;
}
```

❌ **Bad**:
```tsx
import { useTranslations } from 'next-intl';

function MyComponent() {
  const t = useTranslations('dashboard');
  return <h1>{t('welcom')}</h1>; // Typo not caught
}
```

### 2. **Namespace Organization**

Organize translations by feature/domain:

```json
{
  "nav": {
    "dashboard": "Dashboard",
    "explorer": "Explorer"
  },
  "dashboard": {
    "welcome": "Welcome",
    "stats": "Statistics"
  }
}
```

✅ **Good**: Specific namespaces
❌ **Bad**: Everything in one namespace

### 3. **Use Dedicated Hooks**

```tsx
// Use dedicated hooks for common namespaces
import { useNavTranslations, useDashboardTranslations } from '@/lib/i18n/hooks';

function MyComponent() {
  const nav = useNavTranslations();
  const dash = useDashboardTranslations();

  return (
    <>
      <h1>{nav('dashboard')}</h1>
      <p>{dash('welcome')}</p>
    </>
  );
}
```

### 4. **Error Handling**

Always wrap i18n-dependent components with error boundaries:

```tsx
import { I18nErrorBoundary } from '@/components/i18n-error-boundary';

function App() {
  return (
    <I18nErrorBoundary>
      <MyI18nComponent />
    </I18nErrorBoundary>
  );
}
```

### 5. **SEO Optimization**

Use the metadata generator for proper SEO:

```tsx
import { generateMetadata } from '@/lib/i18n/metadata';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return generateMetadata(locale);
}
```

### 6. **Accessibility**

Add proper ARIA labels and language attributes:

```tsx
<button
  aria-label={t('actions.close')}
  lang={locale}
>
  {t('close')}
</button>
```

### 7. **Performance**

- ✅ Use `useCallback` for translation functions in event handlers
- ✅ Memoize translated content when appropriate
- ✅ Lazy-load large translation files

```tsx
import { useCallback } from 'react';

function MyComponent() {
  const t = useTranslations('common');

  const handleClick = useCallback(() => {
    alert(t('success'));
  }, [t]);

  return <button onClick={handleClick}>{t('submit')}</button>;
}
```

### 8. **Translation Keys**

Use descriptive, hierarchical keys:

✅ **Good**:
```json
{
  "user": {
    "profile": {
      "title": "User Profile",
      "actions": {
        "edit": "Edit Profile",
        "save": "Save Changes"
      }
    }
  }
}
```

❌ **Bad**:
```json
{
  "t1": "User Profile",
  "t2": "Edit Profile",
  "t3": "Save Changes"
}
```

### 9. **Dynamic Content**

Use interpolation for dynamic content:

```tsx
// Translation file
{
  "greeting": "Hello {name}!",
  "items": "You have {count} items"
}

// Component
const message = t('greeting', { name: 'John' });
const count = t('items', { count: 5 });
```

### 10. **Pluralization**

Handle plural forms correctly:

```json
{
  "items": {
    "one": "{count} item",
    "other": "{count} items"
  }
}
```

### 11. **Date and Number Formatting**

Use Intl APIs for locale-aware formatting:

```tsx
import { useLocale } from 'next-intl';

function MyComponent() {
  const locale = useLocale();

  const formatted = new Intl.NumberFormat(locale).format(1234.56);
  const date = new Intl.DateTimeFormat(locale).format(new Date());

  return <div>{formatted} - {date}</div>;
}
```

### 12. **Testing**

Test all languages:

```tsx
import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';

test('renders in Spanish', () => {
  const messages = {
    common: { greeting: 'Hola' }
  };

  const { getByText } = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <MyComponent />
    </NextIntlClientProvider>
  );

  expect(getByText('Hola')).toBeInTheDocument();
});
```

## Common Pitfalls

### ❌ Don't: Hardcode text

```tsx
// Bad
<button>Click me</button>

// Good
<button>{t('actions.click')}</button>
```

### ❌ Don't: Concatenate translations

```tsx
// Bad
const message = t('hello') + ' ' + t('world');

// Good - Use a single translation key
const message = t('helloWorld');
```

### ❌ Don't: Use translations in calculations

```tsx
// Bad
const label = isMorning ? t('morning') : t('evening');
// This creates dependencies on render

// Good - Use a translation key
const label = t(isMorning ? 'greetings.morning' : 'greetings.evening');
```

## Migration Guide

### Adding a New Language

1. Create translation file: `messages/[locale].json`
2. Add locale to `i18n.ts`: `export const locales = [..., 'new-locale']`
3. Add metadata to `lib/i18n/types.ts`
4. Add SEO metadata to `lib/i18n/metadata.ts`
5. Test all pages with new language

### Adding New Translation Keys

1. Add to English (`messages/en.json`) first
2. Add to all other language files
3. Update TypeScript types if needed
4. Use in components with proper hooks

## Performance Considerations

1. **Bundle Size**: Each language adds ~10-20KB to bundle
2. **Loading**: Translations are loaded on-demand per route
3. **Caching**: Translations are cached after first load
4. **Build Time**: Static generation creates pages for all locales

## Monitoring

Track i18n errors in production:

```tsx
componentDidCatch(error: Error) {
  if (error.message.includes('translation')) {
    // Log to error tracking service
    console.error('i18n Error:', error);
  }
}
```

## Resources

- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [MDN: Intl API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl)
- [W3C i18n Best Practices](https://www.w3.org/International/questions/qa-i18n)

## Checklist for New Features

- [ ] All text is externalized to translation files
- [ ] Translation keys follow naming convention
- [ ] All languages have translations
- [ ] Proper namespace used
- [ ] Error boundaries in place
- [ ] Accessibility attributes added
- [ ] SEO metadata configured
- [ ] Tests include i18n scenarios
- [ ] Documentation updated

---

**Last Updated**: October 31, 2025
**Maintainer**: VerusPulse Team

