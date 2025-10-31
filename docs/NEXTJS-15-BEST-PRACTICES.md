# Next.js 15.5.4 Best Practices Implementation

## Overview

This document outlines all Next.js 15 best practices implemented in VerusPulse, along with usage guidelines and benefits.

## 📋 Table of Contents

1. [Configuration](#configuration)
2. [Performance Optimizations](#performance-optimizations)
3. [Type Safety](#type-safety)
4. [Code Quality](#code-quality)
5. [SEO & Metadata](#seo--metadata)
6. [Security](#security)
7. [Testing](#testing)
8. [Development Workflow](#development-workflow)

## Configuration

### next.config.js

#### Turbopack (Development)
```javascript
turbo: {
  rules: {
    '*.svg': {
      loaders: ['@svgr/webpack'],
      as: '*.js',
    },
  },
}
```
**Benefits:**
- ⚡ Up to 700x faster than Webpack
- 🔄 Faster HMR (Hot Module Replacement)
- 💾 Lower memory usage

**Usage:**
```bash
npm run dev:turbo
```

#### Package Import Optimization
```javascript
optimizePackageImports: [
  '@phosphor-icons/react',
  'lucide-react',
  'date-fns',
  'echarts',
  'echarts-for-react',
]
```
**Benefits:**
- 📦 Smaller bundle sizes (reduces icon library imports from 500KB to <50KB)
- ⚡ Faster page loads
- 🎯 Tree-shaking improvements

#### Security Headers
Comprehensive security headers including:
- Strict-Transport-Security
- X-Frame-Options
- X-Content-Type-Options
- CSP (Content Security Policy)
- Permissions-Policy

**Benefits:**
- 🔒 Protection against XSS, clickjacking, MIME sniffing
- 🛡️ Enhanced security posture
- ✅ Better security audit scores

#### Image Optimization
```javascript
images: {
  formats: ['image/webp', 'image/avif'],
  minimumCacheTTL: 60,
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
}
```
**Benefits:**
- 🖼️ Automatic format conversion (WebP/AVIF)
- 📱 Responsive image serving
- ⚡ Reduced bandwidth usage (up to 50% smaller)

#### Code Splitting
```javascript
webpack: (config, { dev }) => {
  if (!dev) {
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          name: 'vendor',
          test: /node_modules/,
          priority: 20,
        },
        common: {
          name: 'common',
          minChunks: 2,
          priority: 10,
        },
      },
    };
  }
}
```
**Benefits:**
- 📦 Smaller initial bundle
- ⚡ Faster page loads
- 💾 Better caching strategy

### tsconfig.json

#### Strict Type Checking
```json
{
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitOverride": true
}
```
**Benefits:**
- 🐛 Catch more bugs at compile time
- 📝 Better code documentation
- 🔍 Improved IDE intellisense

### .eslintrc.json

#### Enhanced Rules
- React hooks validation
- Accessibility checks
- TypeScript best practices
- Next.js specific rules

**Usage:**
```bash
npm run lint           # Check for issues
npm run lint:fix       # Auto-fix issues
npm run lint:strict    # Zero warnings allowed
```

## Performance Optimizations

### 1. Lazy Loading Components
```typescript
const NetworkDashboard = lazy(() =>
  import('./network-dashboard').then(mod => ({ default: mod.NetworkDashboard }))
);
```
**Benefits:**
- 📦 Reduced initial bundle size
- ⚡ Faster initial page load
- 🎯 Load code only when needed

### 2. React.memo for Expensive Components
```typescript
export const ExpensiveComponent = React.memo(function ExpensiveComponent(props) {
  // Component logic
});
```

### 3. Optimize Package Imports
```typescript
// ❌ Bad: Imports entire library
import { Icon } from '@phosphor-icons/react';

// ✅ Good: Tree-shakeable with optimizePackageImports
import { Icon } from '@phosphor-icons/react'; // Automatically optimized!
```

### 4. Server Components by Default
```typescript
// app/page.tsx - Server Component by default
export default async function Page() {
  const data = await fetchData(); // Runs on server
  return <div>{data}</div>;
}
```

**Only use 'use client' when needed:**
- useState, useEffect, or other hooks
- Event handlers
- Browser-only APIs
- Third-party libraries that require client rendering

## Type Safety

### Type Checking Scripts
```bash
npm run type-check         # Check types
npm run type-check:watch   # Watch mode
npm run validate           # Type check + lint + format
```

### Pre-build Type Checking
Automatically runs before build:
```json
"prebuild": "npm run type-check"
```

### Type-safe Environment Variables
```typescript
// lib/config/env.ts
export const env = {
  rpcHost: process.env.VERUS_RPC_HOST!,
  rpcUser: process.env.VERUS_RPC_USER!,
  rpcPassword: process.env.VERUS_RPC_PASSWORD!,
} as const;
```

## Code Quality

### Prettier Configuration
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

### Git Hooks (Husky + lint-staged)
Automatically runs on commit:
- ESLint
- Prettier
- Type checking

### Scripts for Code Quality
```bash
npm run validate        # Check everything
npm run validate:fix    # Fix everything
npm run format          # Format all files
npm run format:check    # Check formatting
```

## SEO & Metadata

### Metadata API
```typescript
// app/page.tsx
import { generateBaseMetadata } from '@/lib/seo/metadata';

export const metadata = generateBaseMetadata({
  title: 'Home',
  description: 'Custom description',
});
```

### Dynamic Metadata
```typescript
// app/block/[hash]/page.tsx
export async function generateMetadata({ params }) {
  const block = await fetchBlock(params.hash);
  return generateBlockMetadata({
    hash: params.hash,
    height: block.height,
    transactions: block.tx.length,
  });
}
```

### Sitemap Generation
```typescript
// app/sitemap.ts
export default async function sitemap() {
  return [
    {
      url: 'https://veruspulse.com',
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1.0,
    },
    // ... more URLs
  ];
}
```

### Robots.txt
```typescript
// app/robots.ts
export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    },
    sitemap: 'https://veruspulse.com/sitemap.xml',
  };
}
```

### JSON-LD Structured Data
```tsx
import { OrganizationSchema, WebApplicationSchema } from '@/lib/seo/json-ld';

export default function Layout({ children }) {
  return (
    <html>
      <body>
        {children}
        <OrganizationSchema />
        <WebApplicationSchema />
      </body>
    </html>
  );
}
```

## Security

### Environment Variables
- ✅ All secrets in `.env` (not committed)
- ✅ Example file: `env.example`
- ✅ Validation on startup
- ✅ Type-safe access

### Security Headers
Automatically applied to all routes:
- HSTS (HTTP Strict Transport Security)
- XSS Protection
- Frame Options
- Content Type Options
- Referrer Policy

### CSP (Content Security Policy)
Configure in `next.config.js` for additional protection.

### Rate Limiting
Implemented at API route level:
```typescript
// app/api/example/route.ts
import { rateLimiter } from '@/lib/middleware/rate-limiter';

export async function GET(request: Request) {
  await rateLimiter(request);
  // ... handle request
}
```

## Testing

### Unit Tests (Jest)
```bash
npm test              # Run once
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
npm run test:ci       # CI mode
```

### E2E Tests (Playwright)
```bash
npm run test:e2e           # Headless
npm run test:e2e:headed    # With browser
npm run test:e2e:ui        # Interactive UI
```

### Integration Tests
```bash
npm run test:integrity           # Data integrity
npm run test:integrity:verusid   # VerusID specific
```

### Load Tests
```bash
npm run test:load          # Standard load test
npm run test:load:spike    # Spike test
npm run test:load:stress   # Stress test
```

## Development Workflow

### Daily Development
```bash
# Start development server
npm run dev

# Or with Turbopack (faster)
npm run dev:turbo

# Before committing
npm run validate

# Auto-fix issues
npm run validate:fix
```

### Before Deploying
```bash
# Full validation
npm run validate

# Run tests
npm run test:all

# Build production
npm run build

# Test production build locally
npm run start
```

### CI/CD Integration
```yaml
# GitHub Actions example
- name: Validate
  run: npm run validate

- name: Test
  run: npm run test:ci

- name: Build
  run: npm run build
```

### Code Review Checklist
- [ ] All TypeScript errors resolved
- [ ] No ESLint warnings
- [ ] Code is formatted with Prettier
- [ ] Tests pass
- [ ] No console errors in browser
- [ ] Performance is acceptable
- [ ] Accessibility tested
- [ ] Mobile responsive

## Performance Monitoring

### Built-in Tools
```bash
# Bundle analysis
npm run analyze

# Performance monitoring (in app)
# Enabled via ENABLE_PERFORMANCE_MONITORING=true
```

### Metrics to Watch
- **FCP** (First Contentful Paint): < 1.8s
- **LCP** (Largest Contentful Paint): < 2.5s
- **TTI** (Time to Interactive): < 3.8s
- **CLS** (Cumulative Layout Shift): < 0.1
- **FID** (First Input Delay): < 100ms

### Lighthouse Scores
Target scores:
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 100

## Advanced Patterns

### Server Actions (Next.js 15)
```typescript
'use server';

export async function submitForm(formData: FormData) {
  // Server-side logic
  await saveToDB(formData);
  revalidatePath('/');
}
```

### Streaming with Suspense
```typescript
import { Suspense } from 'react';

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <SlowComponent />
    </Suspense>
  );
}
```

### Parallel Data Fetching
```typescript
export default async function Page() {
  // Fetch in parallel
  const [blocks, transactions, stats] = await Promise.all([
    getBlocks(),
    getTransactions(),
    getStats(),
  ]);

  return <Dashboard {...{ blocks, transactions, stats }} />;
}
```

### Incremental Static Regeneration (ISR)
```typescript
export const revalidate = 60; // Revalidate every 60 seconds

export default async function Page() {
  const data = await fetchData();
  return <div>{data}</div>;
}
```

## Resources

### Official Documentation
- [Next.js 15 Docs](https://nextjs.org/docs)
- [React 18 Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Performance
- [Web.dev Performance](https://web.dev/performance/)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)

### Security
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)

### Testing
- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)

## Summary of Improvements

✅ **Performance**
- Turbopack support for faster development
- Package import optimization
- Advanced code splitting
- Image optimization

✅ **Type Safety**
- Stricter TypeScript configuration
- Pre-build type checking
- Type-safe environment variables

✅ **Code Quality**
- Enhanced ESLint rules
- Prettier formatting
- Git hooks for quality gates
- Comprehensive scripts

✅ **SEO**
- Metadata generation utilities
- Dynamic sitemap
- Robots.txt
- JSON-LD structured data

✅ **Security**
- Comprehensive security headers
- Environment variable management
- Rate limiting
- CSRF protection

✅ **Developer Experience**
- Better npm scripts
- Clear documentation
- Type checking in watch mode
- Fast feedback loops

✅ **Future-Ready**
- React Compiler configuration
- Migration guides
- Scalable architecture

