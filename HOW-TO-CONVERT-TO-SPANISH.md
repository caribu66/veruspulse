# How to Convert Components to Spanish

## 🎯 **The Goal**
Make your website properly display Spanish when users select Spanish language.

## 📊 **Current Status**
- **Total Components**: 113
- **Converted**: 2 (2%)
- **Remaining**: 111 (98%)

## ⚡ **Quick Start - 3 Simple Steps**

### **Step 1**: Add the import at the top

```typescript
import { useTranslations } from 'next-intl';
```

### **Step 2**: Add hooks inside your component function

```typescript
export function MyComponent() {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');

  // ... rest of code
}
```

### **Step 3**: Replace text with translation keys

```typescript
// Before:
<h3>Recent Blocks</h3>

// After:
<h3>{t('recentBlocks')}</h3>
```

---

## 📖 **Real Example from Your Codebase**

Let's convert `/components/dashboard-tabs.tsx`:

### **BEFORE** (Original):

```typescript
'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ChartBar, Cube, Users, Activity } from '@phosphor-icons/react';

interface TabConfig {
  value: string;
  label: string;
  icon: React.ComponentType<any>;
}

const tabs: TabConfig[] = [
  {
    value: 'overview',
    label: 'Overview',
    icon: ChartBar,
  },
  {
    value: 'blocks',
    label: 'Blocks',
    icon: Cube,
  },
  {
    value: 'verusids',
    label: 'VerusIDs',
    icon: Users,
  },
  {
    value: 'network',
    label: 'Network Stats',
    icon: Activity,
  },
];

export function DashboardTabs() {
  return (
    <Tabs defaultValue="overview">
      <TabsList>
        {tabs.map(tab => (
          <TabsTrigger key={tab.value} value={tab.value}>
            <tab.icon className="mr-2" />
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
```

### **AFTER** (With translations):

```typescript
'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ChartBar, Cube, Users, Activity } from '@phosphor-icons/react';
import { useTranslations } from 'next-intl'; // ← ADDED

interface TabConfig {
  value: string;
  labelKey: string; // ← CHANGED from 'label' to 'labelKey'
  icon: React.ComponentType<any>;
}

export function DashboardTabs() {
  const t = useTranslations('dashboard'); // ← ADDED
  const tNav = useTranslations('nav');     // ← ADDED

  // ← MOVED inside component so we can use t()
  const tabs: TabConfig[] = [
    {
      value: 'overview',
      labelKey: 'overview', // ← Just the key, not the text
      icon: ChartBar,
    },
    {
      value: 'blocks',
      labelKey: 'blocks',
      icon: Cube,
    },
    {
      value: 'verusids',
      labelKey: 'verusids',
      icon: Users,
    },
    {
      value: 'network',
      labelKey: 'networkStats', // ← Key from messages/en.json
      icon: Activity,
    },
  ];

  return (
    <Tabs defaultValue="overview">
      <TabsList>
        {tabs.map(tab => (
          <TabsTrigger key={tab.value} value={tab.value}>
            <tab.icon className="mr-2" />
            {tab.value === 'overview' || tab.value === 'network'
              ? t(tab.labelKey as any)      // ← Use t() for dashboard keys
              : tNav(tab.labelKey as any)}  // ← Use tNav() for nav keys
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
```

**What changed?**
1. ✅ Added `import { useTranslations } from 'next-intl';`
2. ✅ Added hooks: `const t = useTranslations('dashboard');`
3. ✅ Changed hardcoded text to translation keys
4. ✅ Moved `tabs` array inside component (needed to use translation hooks)

---

## 🔧 **Tool to Find What Needs Converting**

Run this command to see all components that need conversion:

```bash
bash scripts/find-untranslated.sh
```

This shows:
- ❌ Components without translations
- 📊 Progress percentage
- 🎯 Priority components to convert first

---

## 📚 **Translation Keys Reference**

### Where to find available keys:

- **English keys**: `/messages/en.json`
- **Spanish translations**: `/messages/es.json`

### Most common keys you'll use:

#### Dashboard (`dashboard`)
```typescript
const t = useTranslations('dashboard');

t('overview')           // "Resumen" (ES) / "Overview" (EN)
t('recentBlocks')       // "Bloques Recientes"
t('recentTransactions') // "Transacciones Recientes"
t('mempool')            // "Mempool"
t('allBlocks')          // "Todos los Bloques"
t('powOnly')            // "Solo PoW"
t('posOnly')            // "Solo PoS"
t('networkStats')       // "Estadísticas de Red"
```

#### Common UI (`common`)
```typescript
const tCommon = useTranslations('common');

tCommon('loading')   // "Cargando..."
tCommon('error')     // "Error"
tCommon('refresh')   // "Actualizar"
tCommon('retry')     // "Reintentar"
tCommon('back')      // "Atrás"
tCommon('next')      // "Siguiente"
tCommon('previous')  // "Anterior"
tCommon('details')   // "Detalles"
tCommon('view')      // "Ver"
tCommon('filter')    // "Filtrar"
tCommon('sort')      // "Ordenar"
```

#### Blocks (`blocks`)
```typescript
const tBlocks = useTranslations('blocks');

tBlocks('totalBlocks')    // "Total de Bloques"
tBlocks('blockHeight')    // "Altura del Bloque"
tBlocks('transactions')   // "Transacciones"
tBlocks('difficulty')     // "Dificultad"
tBlocks('reward')         // "Recompensa"
tBlocks('size')           // "Tamaño"
tBlocks('miner')          // "Minero"
tBlocks('staker')         // "Staker"
```

#### Network (`network`)
```typescript
const tNetwork = useTranslations('network');

tNetwork('height')        // "Altura"
tNetwork('difficulty')    // "Dificultad"
tNetwork('hashrate')      // "Tasa de Hash"
tNetwork('connections')   // "Conexiones"
tNetwork('mempoolSize')   // "Tamaño del Mempool"
```

---

## 🎯 **Priority Components to Convert**

Start with these high-visibility components:

### 1. **dashboard-tabs.tsx** (Navigation tabs)
- **File**: `/components/dashboard-tabs.tsx`
- **Keys needed**: `dashboard.overview`, `nav.blocks`, `nav.verusids`, `dashboard.networkStats`

### 2. **hero-section.tsx** (Landing page hero)
- **File**: `/components/hero-section.tsx`
- **Keys needed**: `dashboard.welcome`, `dashboard.welcomeMessage`, etc.

### 3. **quick-stats-ticker.tsx** (Stats ticker)
- **File**: `/components/quick-stats-ticker.tsx`
- **Keys needed**: `blocks.totalBlocks`, `network.height`, etc.

### 4. **recent-stakes-timeline.tsx** (Stakes display)
- **File**: `/components/recent-stakes-timeline.tsx`
- **Keys needed**: `staking.recentStakes`, `dashboard.showMore`, `dashboard.showLess`

### 5. **verusid-explorer.tsx** (VerusID explorer)
- **File**: `/components/verusid-explorer.tsx`
- **Keys needed**: `verusid.title`, `verusid.search`, etc.

---

## 🧪 **Testing Your Changes**

### 1. Start the development server:
```bash
npm run dev
```

### 2. Test in English:
```
http://localhost:3000/
```

### 3. Test in Spanish:
```
http://localhost:3000/es
```

### 4. Check the browser console
Look for warnings like:
```
[next-intl] Missing translation key: "myKey"
```

### 5. Visual check
Make sure longer Spanish text doesn't break the layout.

---

## 💡 **Common Patterns**

### Pattern 1: Simple Text Replacement
```typescript
// Before
<h3 className="text-xl">Recent Blocks</h3>

// After
const t = useTranslations('dashboard');
<h3 className="text-xl">{t('recentBlocks')}</h3>
```

### Pattern 2: Button Labels
```typescript
// Before
<button>Refresh</button>

// After
const tCommon = useTranslations('common');
<button>{tCommon('refresh')}</button>
```

### Pattern 3: Select Dropdown Options
```typescript
// Before
<select>
  <option value="all">All Blocks</option>
  <option value="pow">PoW Only</option>
  <option value="pos">PoS Only</option>
</select>

// After
const t = useTranslations('dashboard');
<select>
  <option value="all">{t('allBlocks')}</option>
  <option value="pow">{t('powOnly')}</option>
  <option value="pos">{t('posOnly')}</option>
</select>
```

### Pattern 4: Array of Menu Items
```typescript
// Before (OUTSIDE component - won't work with hooks)
const menuItems = [
  { id: 'overview', label: 'Overview' },
  { id: 'blocks', label: 'Recent Blocks' },
];

export function MyComponent() {
  return (
    <div>
      {menuItems.map(item => (
        <div key={item.id}>{item.label}</div>
      ))}
    </div>
  );
}

// After (INSIDE component - works with hooks)
export function MyComponent() {
  const t = useTranslations('dashboard');

  const menuItems = [
    { id: 'overview', label: t('overview') },
    { id: 'blocks', label: t('recentBlocks') },
  ];

  return (
    <div>
      {menuItems.map(item => (
        <div key={item.id}>{item.label}</div>
      ))}
    </div>
  );
}
```

### Pattern 5: Conditional Text
```typescript
// Before
<span>{isLoading ? 'Loading...' : 'Refresh'}</span>

// After
const tCommon = useTranslations('common');
<span>{isLoading ? tCommon('loading') : tCommon('refresh')}</span>
```

---

## ❌ **Common Mistakes & Solutions**

### Mistake 1: Using hooks outside component
```typescript
// ❌ WRONG - hooks can't be used here
const t = useTranslations('dashboard');

export function MyComponent() {
  return <h3>{t('title')}</h3>;
}

// ✅ CORRECT - hooks inside component
export function MyComponent() {
  const t = useTranslations('dashboard');
  return <h3>{t('title')}</h3>;
}
```

### Mistake 2: Using non-existent keys
```typescript
// ❌ WRONG - key doesn't exist in messages files
const t = useTranslations('dashboard');
<h3>{t('myCustomKey')}</h3>  // Will show warning

// ✅ CORRECT - use existing keys or add new ones
// First add to messages/en.json and messages/es.json:
// "myCustomKey": "My Custom Text"
// Then use it:
<h3>{t('myCustomKey')}</h3>
```

### Mistake 3: Forgetting 'use client'
```typescript
// ❌ WRONG - will cause error in server components
export function MyComponent() {
  const t = useTranslations('dashboard');
  ...
}

// ✅ CORRECT - add 'use client' at top
'use client';

export function MyComponent() {
  const t = useTranslations('dashboard');
  ...
}
```

---

## 📝 **Step-by-Step Conversion Workflow**

### For each component:

1. **Open the file**
   ```bash
   code components/dashboard-tabs.tsx
   ```

2. **Add import** (at top of file)
   ```typescript
   import { useTranslations } from 'next-intl';
   ```

3. **Add hooks** (inside component)
   ```typescript
   const t = useTranslations('dashboard');
   const tCommon = useTranslations('common');
   ```

4. **Find hardcoded strings**
   - Use Find (Ctrl+F or Cmd+F)
   - Search for common phrases: `"Recent"`, `"Total"`, `"Loading"`, etc.

5. **Replace with translation keys**
   ```typescript
   // Find this:
   "Recent Blocks"
   // Replace with:
   {t('recentBlocks')}
   ```

6. **Test in browser**
   - English: `http://localhost:3000/`
   - Spanish: `http://localhost:3000/es`

7. **Check console** for missing key warnings

8. **Commit your changes**
   ```bash
   git add components/dashboard-tabs.tsx
   git commit -m "feat: add Spanish translations to dashboard-tabs"
   ```

---

## 🚀 **Batch Conversion Tips**

### Convert similar components together:

**Group 1**: Navigation components
- `components/dashboard-tabs.tsx`
- `components/enhanced-navigation-bar.tsx`
- `components/mobile-bottom-nav.tsx`

**Group 2**: Block-related components
- `components/blocks-explorer.tsx` ✅ (partially done)
- `components/block/*` (all files in block folder)

**Group 3**: VerusID components
- `components/verusid-explorer.tsx`
- `components/verusid/*` (all files in verusid folder)

**Group 4**: Staking components
- `components/recent-stakes-timeline.tsx`
- `components/verusid-staking-dashboard.tsx`

---

## 📦 **Progress Tracking**

Run this command anytime to see your progress:

```bash
bash scripts/find-untranslated.sh
```

You'll see:
- ✅ Components already converted (green)
- ⏳ Components that need conversion (red)
- Progress percentage

---

## 🎓 **Additional Resources**

- **Translation Guide**: `/SPANISH-TRANSLATION-GUIDE.md`
- **Summary Document**: `/TRANSLATION-UPDATE-SUMMARY.md`
- **Example Component**: `/components/live-data.tsx` (already converted)
- **English Keys**: `/messages/en.json` (all available keys)
- **Spanish Translations**: `/messages/es.json` (all Spanish text)
- **next-intl Docs**: https://next-intl-docs.vercel.app/

---

## ✅ **Quick Checklist**

For each component you convert:

- [ ] Added `import { useTranslations } from 'next-intl';`
- [ ] Added hooks inside component function
- [ ] Replaced all hardcoded English strings
- [ ] Tested in English (`/`)
- [ ] Tested in Spanish (`/es`)
- [ ] No console warnings
- [ ] Layout looks good in both languages
- [ ] Committed changes

---

## 🎉 **You're Ready!**

Pick a component from the priority list and start converting. The process is repetitive and straightforward - you'll get faster with each one!

**Start here**: `/components/dashboard-tabs.tsx` (small, easy component to start with)

**Command to open it**:
```bash
code components/dashboard-tabs.tsx
```

Good luck! 🚀

