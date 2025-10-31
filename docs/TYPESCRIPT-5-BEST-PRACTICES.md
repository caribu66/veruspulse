# TypeScript 5.0+ Best Practices for VerusPulse

This document outlines TypeScript 5.0+ best practices specifically tailored for the VerusPulse dApp. It builds upon modern TypeScript features to improve type safety, developer experience, and code quality.

## Table of Contents

1. [Configuration](#configuration)
2. [Const Assertions (`as const`)](#const-assertions-as-const)
3. [Satisfies Operator](#satisfies-operator)
4. [Type-Only Imports/Exports](#type-only-importsexports)
5. [Exact Optional Property Types](#exact-optional-property-types)
6. [NoUncheckedIndexedAccess](#nouncheckedindexedaccess)
7. [Template Literal Types](#template-literal-types)
8. [Union Types and Discriminated Unions](#union-types-and-discriminated-unions)
9. [Generic Constraints](#generic-constraints)
10. [Type Guards and Narrowing](#type-guards-and-narrowing)
11. [Utility Types](#utility-types)
12. [React-Specific Best Practices](#react-specific-best-practices)
13. [Common Pitfalls to Avoid](#common-pitfalls-to-avoid)

## Configuration

Our `tsconfig.json` is configured with modern TypeScript 5.0+ features:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "allowUnusedLabels": false,
    "allowUnreachableCode": false,
    "exactOptionalPropertyTypes": false,
    "moduleResolution": "bundler"
  }
}
```

### Key Configurations

- **`strict: true`**: Enables all strict type checking options
- **`noUncheckedIndexedAccess: true`**: Makes array/object access safer by returning `undefined`
- **`noImplicitOverride: true`**: Requires explicit `override` keyword when overriding methods
- **`moduleResolution: bundler`**: Optimized for modern bundlers like Next.js/Vite

## Const Assertions (`as const`)

Const assertions create deeply readonly types, preserving literal types instead of widening them.

### ✅ Good: Using `as const`

```29:44:lib/constants/design-tokens.ts
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

// Type: readonly keys
export type IconSize = keyof typeof ICON_SIZES;
```

### ❌ Bad: Without `as const`

```typescript
// ❌ Type gets widened
export const ICON_SIZES = {
  xs: 'h-3 w-3',  // Type: string
  sm: 'h-4 w-4',  // Type: string
};

// ✅ Preserves literal types
export const ICON_SIZES = {
  xs: 'h-3 w-3',  // Type: 'h-3 w-3'
  sm: 'h-4 w-4',  // Type: 'h-4 w-4'
} as const;
```

### Real-World Example from Codebase

```104:123:lib/models/utxo.ts
export const VERUS_STAKING_CONSTANTS = {
  MIN_STAKE_AGE: 2000, // blocks (~33 hours at 60s/block)
  MIN_STAKE_VALUE: 100000000, // 1 VRSC in satoshis
  COOLDOWN_PERIOD: 2000, // blocks after staking
  BLOCK_TIME: 60, // seconds
  MAX_STAKING_PROBABILITY: 1.0,
  MIN_STAKING_PROBABILITY: 0.0,
} as const;

// UTXO eligibility checker
export function isUTXOEligible(utxo: UTXO, currentHeight: number): boolean {
  const age = currentHeight - utxo.creationHeight;
  const isOldEnough = age >= VERUS_STAKING_CONSTANTS.MIN_STAKE_AGE;
  const isLargeEnough = utxo.value >= VERUS_STAKING_CONSTANTS.MIN_STAKE_VALUE;
  const isNotSpent = !utxo.isSpent;
  const isNotInCooldown =
    !utxo.cooldownUntil || utxo.cooldownUntil <= currentHeight;

  return isOldEnough && isLargeEnough && isNotSpent && isNotInCooldown;
}
```

## Satisfies Operator

The `satisfies` operator (TS 4.9+) validates that an expression matches a type without changing its inferred type.

### ✅ Good: Using `satisfies`

```typescript
interface ColorConfig {
  primary: string;
  secondary: string;
}

const theme = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  accent: '#10b981',  // Not in interface, but we want to keep it
} satisfies ColorConfig;

// theme.accent is still available and typed correctly
// theme is validated against ColorConfig
```

### Key Difference: `as const` vs `satisfies`

```typescript
// ❌ Using 'as const' - loses validation
const config = {
  port: 3000,
  host: 'localhost',
  // typo: prot instead of port - no error!
} as const;

// ✅ Using 'satisfies' - validates AND preserves types
const config = {
  port: 3000,
  host: 'localhost',
  prot: 3000,  // Error: Property 'prot' does not exist
} satisfies AppConfig;

// ❌ Using 'as AppConfig' - loses literal types
const config = {
  port: 3000,  // Type: number, not 3000
  host: 'localhost',  // Type: string, not 'localhost'
} as AppConfig;
```

### When to Use Each

- **`as const`**: When you want immutable literal types, no type to satisfy
- **`satisfies`**: When you need to validate against a type AND preserve literal types
- **`as Type`**: When you want type assertion (rare, use sparingly)

## Type-Only Imports/Exports

Type-only imports prevent runtime errors and improve bundling.

### ✅ Good: Type-only imports

```1:6:lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

```typescript
import type { WebSocketManager } from '@/lib/utils/websocket';
import { useWebSocket } from '@/lib/utils/websocket';  // Value import

// OR as a single import
import { useWebSocket, type WebSocketManager } from '@/lib/utils/websocket';
```

### ❌ Bad: Mixing type and value imports

```typescript
import { WebSocketManager, useWebSocket } from '@/lib/utils/websocket';
// If WebSocketManager is only used as a type, you're including unnecessary runtime code
```

## Exact Optional Property Types

With `exactOptionalPropertyTypes: true`, `undefined` and missing are distinct.

### Current Configuration

We set `exactOptionalPropertyTypes: false` because it can be too strict for React/Next.js patterns where optional props can be undefined.

### When to Enable

Consider enabling for:
- Configuration objects
- API request/response types
- Utility functions

```typescript
interface Config {
  port: number;
  host?: string;  // With exactOptionalPropertyTypes: false
                   // Can be string | undefined
                   // or just omitted
}
```

## NoUncheckedIndexedAccess

With `noUncheckedIndexedAccess: true`, array/object access returns `undefined`.

### ✅ Good: Handling undefined

```typescript
const data = ['a', 'b', 'c'];
const item = data[5];  // Type: string | undefined

// Handle undefined
if (item) {
  console.log(item);
}

// Or with optional chaining
console.log(item?.toUpperCase());
```

### ✅ Good: Safe array operations

```typescript
const transactions = block.tx || [];
const firstTx = transactions[0];

if (firstTx) {
  // Type is Transaction, not Transaction | undefined
  console.log(firstTx.txid);
}
```

### Real-World Example

```72:78:lib/utils/websocket.ts
send(data: any): void {
  if (this.ws && this.ws.readyState === WebSocket.OPEN) {
    this.ws.send(JSON.stringify(data));
  } else {
    logger.warn('🚫 WebSocket not connected, cannot send message');
  }
}
```

## Template Literal Types

Create types from string templates.

### ✅ Good: Template literal types

```typescript
type EventName = 'click' | 'hover' | 'focus';
type HandlerName<T extends EventName> = `on${Capitalize<T>}`;

// Type: 'onClick' | 'onHover' | 'onFocus'
const handlers: Record<HandlerName<EventName>, Function> = {
  onClick: () => {},
  onHover: () => {},
  onFocus: () => {},
};

// API routes
type ApiRoute<T extends string> = `/api/${T}`;
type Routes = ApiRoute<'blocks' | 'transactions' | 'addresses'>;
// Type: '/api/blocks' | '/api/transactions' | '/api/addresses'
```

### Advanced: Pattern matching

```typescript
type VerusAddressPrefix = 'R' | 'i' | 'z';
type VerusAddress = `${VerusAddressPrefix}${string}`;

function isValidAddress(address: string): address is VerusAddress {
  return /^[Riz][A-Za-z0-9]+$/.test(address);
}
```

## Union Types and Discriminated Unions

Create typesafe unions with discriminant properties.

### ✅ Good: Discriminated unions

```157:188:lib/utils/websocket.ts
export interface LiveBlockData {
  type: 'new_block';
  block: {
    hash: string;
    height: number;
    time: number;
    size: number;
    nTx: number;
    difficulty: number;
  };
}

export interface LiveTransactionData {
  type: 'new_transaction';
  transaction: {
    txid: string;
    size: number;
    fee: number;
    time: number;
  };
}

export interface LiveMempoolData {
  type: 'mempool_update';
  mempool: {
    size: number;
    bytes: number;
    usage: number;
  };
}

export type LiveData = LiveBlockData | LiveTransactionData | LiveMempoolData;
```

```typescript
// Type-safe handling
function handleLiveData(data: LiveData) {
  switch (data.type) {
    case 'new_block':
      // TypeScript knows data.block exists here
      console.log(data.block.hash);
      break;
    case 'new_transaction':
      // TypeScript knows data.transaction exists here
      console.log(data.transaction.txid);
      break;
  }
}
```

### Real-World Example

```58:67:components/types.ts
export interface StakeRewardInfo {
  isStakeReward: boolean;
  stakeAmount?: number;
  rewardAmount?: number;
  stakedInputs?: number;
  rewardOutputs?: number;
  stakeAge?: number;
  blockHeight?: number;
  blockType?: 'pos' | 'pow';
}
```

## Generic Constraints

Constrain generic types for better type safety.

### ✅ Good: Generic constraints

```245:269:lib/cache/cache-utils.ts
export function withCache<T extends any[], R>(
  cacheKey: string | ((...args: T) => string),
  ttlSeconds: number,
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const key = typeof cacheKey === 'function' ? cacheKey(...args) : cacheKey;

    // Try to get from cache first
    const cached = await CacheManager.get<R>(key);
    if (cached !== null) {
      return cached;
    }

    // If not in cache, execute function and cache result
    try {
      const result = await fn(...args);
      await CacheManager.set(key, result, ttlSeconds);
      return result;
    } catch (error) {
      logger.error(`❌ Error in cached function for key ${key}:`, error);
      throw error;
    }
  };
}
```

### ✅ Good: Extends constraints

```typescript
interface DatabaseEntry {
  id: string;
  createdAt: Date;
}

function getById<T extends DatabaseEntry>(
  entries: T[],
  id: string
): T | undefined {
  return entries.find(entry => entry.id === id);
}

interface User extends DatabaseEntry {
  name: string;
  email: string;
}

const users: User[] = [
  { id: '1', name: 'Alice', email: 'alice@example.com', createdAt: new Date() },
];

const user = getById(users, '1');  // Type: User | undefined
```

### Real-World Example

```17:31:components/achievement-gallery.tsx
export interface AchievementData {
  slug: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'legendary';
  category: 'milestone' | 'performance' | 'consistency' | 'special' | 'elite';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: string;
  unlockValue?: number;
  current?: number;
  target?: number;
  percentage?: number;
  earned?: boolean;
}
```

```typescript
// Type-safe filter
const filtered = achievements.filter(
  a => a.tier === 'gold' || a.tier === 'platinum'
);
```

## Type Guards and Narrowing

Create custom type guards for runtime type checking.

### ✅ Good: Type guards

```typescript
function isValidTxId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value);
}

function isValidBlockHash(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value);
}

// Usage
function processBlockHash(hash: unknown) {
  if (isValidBlockHash(hash)) {
    // TypeScript knows hash is string here
    console.log(hash.toUpperCase());
  }
}
```

### ✅ Good: Assertion functions

```typescript
function assertIsNumber(value: unknown): asserts value is number {
  if (typeof value !== 'number') {
    throw new Error('Expected number');
  }
}

function processValue(value: unknown) {
  assertIsNumber(value);
  // TypeScript knows value is number here
  return value * 2;
}
```

## Utility Types

Use built-in utility types for transformations.

### ✅ Good: Utility types

```typescript
// Partial - make all properties optional
interface User {
  id: string;
  name: string;
  email: string;
}

type PartialUser = Partial<User>;
// { id?: string; name?: string; email?: string }

// Required - make all properties required
type RequiredUser = Required<PartialUser>;
// { id: string; name: string; email: string }

// Pick - select specific properties
type UserId = Pick<User, 'id'>;
// { id: string }

// Omit - exclude specific properties
type UserWithoutId = Omit<User, 'id'>;
// { name: string; email: string }

// Record - create object type
type UserRoles = Record<string, boolean>;
// { [key: string]: boolean }

// Readonly - make all properties readonly
type ReadonlyUser = Readonly<User>;

// Array of partial users
const updates: Partial<User>[] = [
  { name: 'Alice' },
  { email: 'bob@example.com' },
];
```

### Custom Utility Types

```typescript
// Deep partial
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Non-nullable
type NonNullable<T> = T extends null | undefined ? never : T;

// Array element type
type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

type Users = User[];
type UserElement = ArrayElement<Users>;  // User
```

## React-Specific Best Practices

### ✅ Good: Component props typing

```33:43:components/achievement-gallery.tsx
export interface AchievementGalleryProps {
  achievements: AchievementData[];
  recentUnlocks: AchievementData[];
  totalStats: {
    earned: number;
    available: number;
    progress: number;
  };
  rarityStats: Record<string, number>;
  className?: string;
}
```

```79:85:components/achievement-gallery.tsx
export function AchievementGallery({
  achievements,
  recentUnlocks,
  totalStats,
  rarityStats,
  className = '',
}: AchievementGalleryProps) {
  const tAchievements = useTranslations('achievements');
  // ... implementation
}
```

```488:489:components/achievement-gallery.tsx
// Optimize with React.memo for better performance
export const AchievementGalleryMemoized = memo(AchievementGallery);
```

### ✅ Good: Hook typing

```101:154:lib/utils/websocket.ts
export function useWebSocket(
  url: string,
  onMessage: (data: any) => void,
  onError: (error: Event) => void,
  onConnect: () => void,
  onDisconnect: () => void
) {
  const [wsManager, setWsManager] = useState<WebSocketManager | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  // React 18.2: Stable callbacks with useRef to prevent unnecessary re-renders
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);

  // Update refs when callbacks change
  useEffect(() => {
    onMessageRef.current = onMessage;
    onErrorRef.current = onError;
    onConnectRef.current = onConnect;
    onDisconnectRef.current = onDisconnect;
  }, [onMessage, onError, onConnect, onDisconnect]);

  useEffect(() => {
    const manager = new WebSocketManager(
      url,
      (data: any) => onMessageRef.current(data),
      (error: Event) => onErrorRef.current(error),
      () => {
        setIsConnected(true);
        onConnectRef.current();
      },
      () => {
        setIsConnected(false);
        onDisconnectRef.current();
      }
    );

    setWsManager(manager);
    manager.connect();

    return () => {
      manager.disconnect();
    };
  }, [url]); // Only re-run when URL changes

  return {
    wsManager,
    isConnected,
    send: (data: any) => wsManager?.send(data),
    disconnect: () => wsManager?.disconnect(),
    reconnect: () => wsManager?.connect(),
  };
}
```

## Common Pitfalls to Avoid

### ❌ Pitfall 1: Using `any` unnecessarily

```typescript
// ❌ Bad
function process(data: any) {
  return data.value;
}

// ✅ Good
function process<T extends { value: unknown }>(data: T) {
  return data.value;
}

// Or use unknown
function process(data: unknown) {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return (data as { value: unknown }).value;
  }
  throw new Error('Invalid data');
}
```

### ❌ Pitfall 2: Forgetting optional chaining

```typescript
// ❌ Bad - with noUncheckedIndexedAccess: true
const value = data.items[0].name;  // Error: undefined.name

// ✅ Good
const value = data.items[0]?.name;  // Safe
```

### ❌ Pitfall 3: Overusing type assertions

```typescript
// ❌ Bad
const value = someValue as string;

// ✅ Good - use type guards
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

if (isString(someValue)) {
  console.log(someValue);  // Type is string
}
```

### ❌ Pitfall 4: Not using readonly where appropriate

```typescript
// ❌ Bad
const config = {
  port: 3000,
  host: 'localhost',
};

// ✅ Good
const config = {
  port: 3000,
  host: 'localhost',
} as const;

// Or
const config = {
  port: 3000,
  host: 'localhost',
} satisfies Config;
```

### ❌ Pitfall 5: Ignoring strict mode errors

```typescript
// ❌ Bad - disabling checks
// @ts-ignore
const value = undefined.whatever;

// ✅ Good - fix the issue
if (value !== undefined) {
  console.log(value.whatever);
}

// Or handle the case properly
console.log(value?.whatever);
```

## Summary Checklist

When writing TypeScript in VerusPulse, ensure:

- ✅ All type-only imports use `import type`
- ✅ Constants use `as const` when they won't change
- ✅ Use `satisfies` to validate while preserving types
- ✅ Array/object access handles `undefined` (with `noUncheckedIndexedAccess`)
- ✅ Discriminated unions for type-safe branching
- ✅ Generic constraints for reusable functions
- ✅ Type guards for runtime validation
- ✅ Utility types for transformations
- ✅ Memoization with proper typing in React
- ✅ Avoid `any`, use `unknown` for truly unknown types
- ✅ Optional chaining and nullish coalescing
- ✅ Readonly for immutable data

## Additional Resources

- [TypeScript 5.0 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Total TypeScript](https://www.totaltypescript.com/)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

## Next Steps

As TypeScript evolves, consider:

1. **Template literal types** for API routes and validators
2. **Branded types** for domain-specific types (e.g., `VerusAddress`, `BlockHash`)
3. **Recursive types** for tree structures
4. **Conditional types** for advanced type transformations
5. **`satisfies` operator** adoption where appropriate
6. **Strict null checks** review and improvement
