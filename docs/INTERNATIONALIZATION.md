# Internationalization (i18n) Guide

## Overview

VerusPulse now supports multiple languages using `next-intl`. The application is available in:

- 🇬🇧 **English** (en) - Default
- 🇪🇸 **Spanish** (es)
- 🇫🇷 **French** (fr)
- 🇩🇪 **German** (de)
- 🇨🇳 **Chinese** (zh)
- 🇯🇵 **Japanese** (ja)
- 🇵🇹 **Portuguese** (pt)
- 🇷🇺 **Russian** (ru)

## For Users

### Changing Language

1. **Desktop**: Click the language button (🌐) in the navigation bar
2. **Mobile**: Open the menu and select your preferred language
3. Your language preference is saved and the page will reload in your selected language

### URL Structure

- Default language (English): `https://veruspulse.com/`
- Other languages: `https://veruspulse.com/es/` (Spanish), `/fr/` (French), etc.

## For Developers

### Using Translations in Components

#### Client Components

```tsx
'use client';

import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('common');
  
  return (
    <div>
      <h1>{t('loading')}</h1>
      <button>{t('refresh')}</button>
    </div>
  );
}
```

#### Server Components

```tsx
import { useTranslations } from 'next-intl';

export default function MyPage() {
  const t = useTranslations('dashboard');
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
    </div>
  );
}
```

### Translation File Structure

Translation files are located in `/messages/`:

```
messages/
├── en.json  # English (base)
├── es.json  # Spanish
├── fr.json  # French
├── de.json  # German
├── zh.json  # Chinese
├── ja.json  # Japanese
├── pt.json  # Portuguese
└── ru.json  # Russian
```

### Translation Keys

Translation files are organized by namespace:

```json
{
  "nav": {
    "dashboard": "Dashboard",
    "explorer": "Explorer",
    "verusids": "VerusIDs"
  },
  "common": {
    "loading": "Loading...",
    "error": "Error",
    "retry": "Retry"
  },
  "dashboard": {
    "title": "VerusPulse - The Internet of Value",
    "description": "..."
  }
}
```

### Adding New Translation Keys

1. Add the key to `/messages/en.json` first (base language)
2. Add translations to all other language files
3. Use the key in your component:

```tsx
const t = useTranslations('yourNamespace');
return <div>{t('yourKey')}</div>;
```

### Adding a New Language

1. Create a new translation file: `/messages/[locale].json`
2. Add the locale code to `/i18n.ts`:
   ```ts
   export const locales = ['en', 'es', 'fr', 'de', 'zh', 'ja', 'pt', 'ru', 'your-locale'];
   ```
3. Add the language name to `/components/language-switcher.tsx`:
   ```ts
   const languageNames = {
     'your-locale': { native: 'Native Name', english: 'English Name' }
   };
   ```

### Configuration Files

- **`/i18n.ts`**: Main configuration
- **`/middleware.ts`**: Locale detection and routing
- **`/next.config.js`**: Next.js integration
- **`/app/[locale]/layout.tsx`**: Locale-aware root layout

### Best Practices

1. **Always provide translations for all languages**
   - Use English as fallback during development
   - Fill in all translations before production

2. **Use semantic keys**
   - Good: `dashboard.welcome`
   - Bad: `text1`, `label2`

3. **Group related translations**
   - Use namespaces: `nav`, `common`, `dashboard`, etc.
   - Keep translations organized and easy to find

4. **Test all languages**
   - Check for text overflow in different languages
   - Verify RTL support if needed
   - Test special characters and emojis

5. **Keep translations consistent**
   - Use the same terminology across the app
   - Maintain consistent tone and style

## Technical Details

### Middleware

The middleware handles:
- Locale detection from URL
- Redirecting to the correct locale
- Preserving API routes (no i18n for `/api/*`)
- Static file handling

### Locale Routing

- Default locale (English): No prefix needed
- Other locales: Use prefix (e.g., `/es/dashboard`)
- Automatic redirection based on browser language

### Performance

- Translations are bundled at build time
- No runtime translation loading
- Optimized for production with static generation

## Troubleshooting

### Issue: Translations not showing

1. Check if the translation key exists in the JSON file
2. Verify the namespace matches: `useTranslations('namespace')`
3. Check the browser console for errors

### Issue: Wrong language displayed

1. Clear browser cache and cookies
2. Check the URL - it should include the locale prefix
3. Verify middleware is working correctly

### Issue: Build errors

1. Ensure all translation files have valid JSON
2. Check that all referenced keys exist
3. Verify `next-intl` is properly installed

## Support

For issues or questions:
- Check the [next-intl documentation](https://next-intl-docs.vercel.app/)
- Open an issue on GitHub
- Contact the development team

---

**Last Updated**: October 31, 2025

