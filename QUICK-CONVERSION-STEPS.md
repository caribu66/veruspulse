# Quick Component Conversion Steps

## 🚀 Fast 3-Step Process

### Step 1: Add Import (Top of file)

```typescript
import { useTranslations } from 'next-intl';
```

### Step 2: Add Translation Hooks (Inside component)

```typescript
export function MyComponent() {
  // Add these at the top of your component
  const t = useTranslations('dashboard');      // For dashboard items
  const tBlocks = useTranslations('blocks');   // For block-related items
  const tCommon = useTranslations('common');   // For common UI elements
  const tNetwork = useTranslations('network'); // For network stats

  // ... rest of component
}
```

### Step 3: Replace Hardcoded Strings

Find and replace pattern:

| **Before** | **After** | **Namespace** |
|------------|-----------|---------------|
| `"Recent Blocks"` | `{t('recentBlocks')}` | dashboard |
| `"All Blocks"` | `{t('allBlocks')}` | dashboard |
| `"PoW Only"` | `{t('powOnly')}` | dashboard |
| `"PoS Only"` | `{t('posOnly')}` | dashboard |
| `"Overview"` | `{t('overview')}` | dashboard |
| `"Mempool"` | `{t('mempool')}` | dashboard |
| `"Total Blocks"` | `{tBlocks('totalBlocks')}` | blocks |
| `"Block Height"` | `{tBlocks('blockHeight')}` | blocks |
| `"Transactions"` | `{tBlocks('transactions')}` | blocks |
| `"Difficulty"` | `{tBlocks('difficulty')}` | blocks |
| `"Size"` | `{tBlocks('size')}` | blocks |
| `"Reward"` | `{tBlocks('reward')}` | blocks |
| `"Refresh"` | `{tCommon('refresh')}` | common |
| `"Loading..."` | `{tCommon('loading')}` | common |
| `"Error"` | `{tCommon('error')}` | common |
| `"Retry"` | `{tCommon('retry')}` | common |
| `"Back"` | `{tCommon('back')}` | common |
| `"Time"` | `{tCommon('time')}` | common |
| `"Connections"` | `{tNetwork('connections')}` | network |
| `"Hashrate"` | `{tNetwork('hashrate')}` | network |

## 📝 Full Example

### Before:
```typescript
'use client';

import { useState } from 'react';

export function BlocksExplorer() {
  const [filterType, setFilterType] = useState('all');

  return (
    <div>
      <h3>Recent Blocks</h3>
      <select value={filterType} onChange={e => setFilterType(e.target.value)}>
        <option value="all">All Blocks</option>
        <option value="pow">PoW Only</option>
        <option value="pos">PoS Only</option>
      </select>
      <button>Refresh</button>
    </div>
  );
}
```

### After:
```typescript
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';  // ← Step 1: Add import

export function BlocksExplorer() {
  // Step 2: Add translation hooks
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');

  const [filterType, setFilterType] = useState('all');

  return (
    <div>
      {/* Step 3: Replace strings */}
      <h3>{t('recentBlocks')}</h3>
      <select value={filterType} onChange={e => setFilterType(e.target.value)}>
        <option value="all">{t('allBlocks')}</option>
        <option value="pow">{t('powOnly')}</option>
        <option value="pos">{t('posOnly')}</option>
      </select>
      <button>{tCommon('refresh')}</button>
    </div>
  );
}
```

## 🔍 Finding Hardcoded Strings

Use grep to find components with hardcoded English:

```bash
# Find "Recent Blocks" in components
grep -r "Recent Blocks" components/

# Find common phrases
grep -r "Total Blocks\|All Blocks\|Loading..." components/

# Find components without translation imports
grep -L "useTranslations" components/*.tsx
```

## ⚡ Common Patterns

### Pattern 1: Headings
```typescript
// Before
<h3>Recent Blocks</h3>

// After
const t = useTranslations('dashboard');
<h3>{t('recentBlocks')}</h3>
```

### Pattern 2: Buttons
```typescript
// Before
<button>Refresh</button>

// After
const tCommon = useTranslations('common');
<button>{tCommon('refresh')}</button>
```

### Pattern 3: Select Options
```typescript
// Before
<select>
  <option value="all">All Blocks</option>
  <option value="pow">PoW Only</option>
</select>

// After
const t = useTranslations('dashboard');
<select>
  <option value="all">{t('allBlocks')}</option>
  <option value="pow">{t('powOnly')}</option>
</select>
```

### Pattern 4: Error Messages
```typescript
// Before
<div>Connection Error</div>
<p>Unable to connect to the network</p>

// After
const tErrors = useTranslations('errors');
<div>{tErrors('connectionError')}</div>
<p>{tErrors('connectionErrorMessage')}</p>
```

### Pattern 5: Array of Items
```typescript
// Before
const sections = [
  { key: 'overview', label: 'Overview' },
  { key: 'blocks', label: 'Recent Blocks' },
];

// After
const t = useTranslations('dashboard');
const sections = [
  { key: 'overview', label: t('overview') },
  { key: 'blocks', label: t('recentBlocks') },
];
```

## 🎯 Translation Key Finder

Not sure which key to use? Check these files:

1. **`/messages/en.json`** - See all available English keys
2. **`/messages/es.json`** - See Spanish translations

### Quick Key Lookup:

```bash
# Find a specific translation
grep -i "recent blocks" messages/en.json

# See all dashboard keys
grep -A 20 '"dashboard":' messages/en.json

# See all common keys
grep -A 50 '"common":' messages/en.json
```

## 🧪 Testing After Conversion

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Test English:**
   ```
   http://localhost:3000/
   ```

3. **Test Spanish:**
   ```
   http://localhost:3000/es
   ```

4. **Check console:** Look for any missing translation warnings

5. **Visual check:** Make sure layout doesn't break with longer Spanish text

## ✅ Checklist for Each Component

- [ ] Added `import { useTranslations } from 'next-intl';`
- [ ] Added translation hooks (`const t = useTranslations(...)`)
- [ ] Replaced all hardcoded strings
- [ ] Tested in English (`/`)
- [ ] Tested in Spanish (`/es`)
- [ ] No console errors
- [ ] Layout looks good in both languages

## 🏆 Priority Components List

Convert these first (high user visibility):

1. ✅ `/components/live-data.tsx` (DONE)
2. ✅ `/components/blocks-explorer.tsx` (IN PROGRESS)
3. `/components/verusid-explorer.tsx`
4. `/components/dashboard-tabs.tsx`
5. `/components/recent-stakes-timeline.tsx`
6. `/components/verusid-staking-dashboard.tsx`
7. `/components/hero-section.tsx`
8. `/components/quick-stats-ticker.tsx`
9. `/components/mempool-explorer.tsx`
10. `/components/transactions-explorer.tsx`

## 💡 Pro Tips

### Tip 1: Use Multiple Namespaces
Don't be afraid to use multiple translation namespaces in one component:

```typescript
const t = useTranslations('dashboard');
const tBlocks = useTranslations('blocks');
const tCommon = useTranslations('common');
```

### Tip 2: Translation Keys Must Exist
Before using a key like `t('myKey')`, make sure it exists in BOTH:
- `/messages/en.json`
- `/messages/es.json`

### Tip 3: Keep Original English for Reference
Use git diff to see what you changed:
```bash
git diff components/blocks-explorer.tsx
```

### Tip 4: Batch Similar Components
Convert all block-related components together, then all VerusID components, etc.

### Tip 5: Search & Replace in Editor
Use your editor's find/replace across files:
- Find: `"Recent Blocks"`
- Replace: `{t('recentBlocks')}`

## 🐛 Common Issues

### Issue 1: "Missing translation key"
**Error:** Console shows missing key warning

**Fix:** Add the key to both `en.json` and `es.json`

### Issue 2: "useTranslations can only be used in client components"
**Error:** Server component error

**Fix:** Add `'use client'` at the top of the file

### Issue 3: Layout breaks with Spanish
**Problem:** Spanish text is longer and breaks design

**Fix:** Use CSS classes that handle overflow:
```typescript
className="truncate"  // or
className="whitespace-nowrap overflow-hidden"
```

## 🎓 Learning Resources

- **next-intl docs**: https://next-intl-docs.vercel.app/
- **Translation files**: `/messages/en.json` and `/messages/es.json`
- **Examples**: Look at `/components/live-data.tsx` (already converted)

---

## ⚡ Quick Command Reference

```bash
# Find hardcoded strings
grep -r "Recent Blocks\|Total Blocks\|Loading..." components/

# See which components need conversion
find components -name "*.tsx" -exec grep -L "useTranslations" {} \;

# Test translations
npm run dev
# Visit: http://localhost:3000/es

# Check for errors
# Open browser console and look for warnings
```

---

**Remember:** You're not changing functionality, just replacing hardcoded English with translation keys. The app should work exactly the same, but now it will support Spanish! 🎉

