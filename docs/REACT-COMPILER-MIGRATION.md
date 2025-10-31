# React Compiler Migration Guide

## Overview

React Compiler (formerly "React Forget") is an experimental feature that automatically optimizes React components by memoizing them at build time. This eliminates the need for manual `useMemo`, `useCallback`, and `React.memo` optimizations.

## Current Status

- **React Version**: 18.2.0
- **Compiler Support**: Not yet available for React 18
- **Target Version**: React 19+

## Prerequisites for Migration

1. **Upgrade to React 19**
   ```bash
   npm install react@19 react-dom@19
   ```

2. **Install React Compiler**
   ```bash
   npm install --save-dev babel-plugin-react-compiler
   npm install react-compiler-runtime
   ```

3. **Update Next.js** (if needed)
   ```bash
   npm install next@latest
   ```

## Configuration Steps

### 1. Enable Babel Configuration

The `babel.config.js` file is already prepared. Uncomment the React Compiler plugin:

```javascript
plugins: [
  ['babel-plugin-react-compiler', {
    compilationMode: 'annotation',
    runtimeModule: 'react-compiler-runtime',
  }]
]
```

### 2. Update next.config.js

Add React Compiler to experimental features:

```javascript
experimental: {
  reactCompiler: true,
}
```

### 3. Compilation Modes

Choose a compilation mode based on your needs:

- **`annotation`**: Only compile components with `"use memo"` directive (recommended)
- **`all`**: Compile all components automatically
- **`infer`**: Intelligently determine which components to compile

### 4. Opt-in Components (annotation mode)

Add the `"use memo"` directive to components you want optimized:

```tsx
'use client';
'use memo'; // React Compiler will optimize this component

export function MyComponent() {
  // Automatically memoized by React Compiler
  return <div>Hello World</div>;
}
```

## Migration Strategy

### Phase 1: Preparation
- [ ] Audit existing `useMemo`, `useCallback`, `React.memo` usage
- [ ] Document performance-critical components
- [ ] Set up performance benchmarks

### Phase 2: Testing
- [ ] Upgrade dependencies in development environment
- [ ] Enable React Compiler with `annotation` mode
- [ ] Test critical user flows
- [ ] Monitor bundle size changes
- [ ] Run performance tests

### Phase 3: Gradual Rollout
- [ ] Add `"use memo"` to 10-20% of components
- [ ] Monitor for issues in production
- [ ] Gradually increase coverage
- [ ] Remove manual optimizations where appropriate

### Phase 4: Full Migration
- [ ] Consider switching to `all` or `infer` mode
- [ ] Remove unnecessary manual memoization
- [ ] Update component guidelines
- [ ] Document best practices

## Components to Prioritize

Based on current codebase analysis, prioritize these components:

### High Priority (Performance Critical)
1. `components/verus-explorer.tsx` - Main explorer with heavy state
2. `components/network-dashboard.tsx` - Real-time network data
3. `components/blocks-explorer.tsx` - List rendering
4. `components/verusid-staking-dashboard.tsx` - Complex calculations
5. `components/charts/*` - Visualization components

### Medium Priority
- All explorer components
- Data table components
- Chart components
- Modal and overlay components

### Low Priority
- Static layout components
- Simple presentational components
- Error boundaries

## Expected Benefits

### Performance Improvements
- **Reduced re-renders**: Automatic memoization prevents unnecessary renders
- **Better DX**: No need to manually optimize with `useMemo`/`useCallback`
- **Cleaner code**: Remove manual optimization boilerplate

### Bundle Size
- Slight increase due to runtime (~5-10KB)
- Offset by removal of manual memoization code

## Potential Issues & Solutions

### Issue: Compilation Errors
**Solution**: Use `annotation` mode and gradually opt-in components

### Issue: Runtime Behavior Changes
**Solution**: Thoroughly test components before and after compilation

### Issue: Debugging Difficulty
**Solution**: Disable compiler for specific components using `"use no memo"` directive

### Issue: Third-party Library Conflicts
**Solution**: Configure `sources` option to exclude problematic libraries

## Rollback Plan

If issues arise:

1. **Disable compiler in next.config.js**
   ```javascript
   experimental: {
     reactCompiler: false,
   }
   ```

2. **Remove plugin from babel.config.js**

3. **Keep manual optimizations** as fallback

## Monitoring

Track these metrics after enabling React Compiler:

- **Build time**: Should remain similar or slightly increase
- **Bundle size**: Monitor for significant changes
- **Runtime performance**: Track FPS, Time to Interactive
- **Error rates**: Monitor Sentry for new issues
- **User reports**: Watch for UI bugs or performance regressions

## Resources

- [React Compiler Documentation](https://react.dev/learn/react-compiler)
- [Next.js React Compiler Guide](https://nextjs.org/docs/app/api-reference/next-config-js/reactCompiler)
- [Babel Plugin Repository](https://github.com/facebook/react/tree/main/compiler)

## Timeline

- **React 19 Stable Release**: Q1 2025 (estimated)
- **Internal Testing**: 1-2 weeks after release
- **Gradual Rollout**: 2-4 weeks
- **Full Migration**: 4-8 weeks

## Checklist Before Migration

- [ ] React 19 is stable and released
- [ ] Next.js supports React 19
- [ ] All dependencies are compatible
- [ ] Performance baseline is established
- [ ] Rollback plan is documented
- [ ] Team is trained on new patterns

