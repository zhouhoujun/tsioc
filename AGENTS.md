# AGENTS.md - Guidelines for Agentic Coding Assistants

This file provides guidance for AI coding agents operating in this repository.

## Repository Overview

`tsioc` is a TypeScript monorepo for a decorator-driven IoC and application framework.

**Core packages:**
- `@tsdi/ioc`: dependency injection container, tokens, metadata, runtime contexts
- `@tsdi/aop`: AOP advice/interceptor layer built on IoC runtime
- `@tsdi/core`: application/module bootstrap, routing abstractions, lifecycle
- `packages/services/*`: protocol adapters (AMQP, Kafka, MQTT, NATS, Redis, TCP, WS, etc.)

## Build Commands

```bash
# Install dependencies
npm install

# Build entire monorepo
npm run build

# Build with version replacement
npm run build -- --setvs=4.0.0-beta

# Build and publish dist packages
npm run build -- --deploy=true

# Build a single package
cd packages/<package-name>
npm run build
# or: ts-node -r tsconfig-paths/register taskfile.ts
```

## Testing Commands

```bash
# Run tests for a single package
cd packages/<package-name>
npm test

# Run tests for ioc package
cd packages/ioc && npm test

# Run a single spec file
cd packages/ioc
npx ts-node -r tsconfig-paths/register -e "const { runTest } = require('@tsdi/unit'); const { ConsoleReporter } = require('@tsdi/unit-console'); runTest('./test/method.spec.ts', { baseURL: __dirname }, ConsoleReporter)"

# Run tests with debug output
cd packages/<package-name>
npx ts-node -r tsconfig-paths/register unit.ts
```

## Linting

```bash
# Lint all TypeScript files
npx eslint "packages/**/*.ts"
```

## TypeScript Configuration

- **Target:** ES2020
- **Module:** CommonJS
- **Decorators:** Enabled with `emitDecoratorMetadata`
- **Strict mode:** Enabled (strictNullChecks, strictPropertyInitialization)
- **Path aliases:** `@tsdi/*` maps to `packages/*` and `packages/services/*`

## Code Style Guidelines

### Naming Conventions

- **Classes:** PascalCase (`Injector`, `ClassRef`, `ModuleMetadata`)
- **Interfaces:** PascalCase, often with `I` prefix avoided (`Token`, not `IToken`)
- **Functions:** camelCase (`isArray`, `createInjector`, `getClassRef`)
- **Type aliases:** PascalCase (`RecordFactory<T>`, `MethodType<T>`)
- **Constants/Tokens:** PascalCase or SCREAMING_SNAKE_CASE for module-level constants
- **Private members:** No underscore prefix; use `private` keyword
- **Files:** kebab-case (`context.ts`, `injector.ts`, `class-ref.ts`)

### Imports

- Use absolute path aliases: `import { Injector } from '@tsdi/ioc'`
- Group imports: external packages first, then internal modules
- Named exports preferred; default exports avoided for modules

```typescript
import { OnDestroy, Destroyable, DestroyCallback } from './destroy';
import { AbstractType, Type } from './types';
import { isArray } from './utils/chk';
```

### Type Annotations

- Always use explicit types for function parameters and return types
- Use `any` sparingly; ESLint allows it but prefer specificity
- Use type guards and type predicates where applicable
- Template generics: `<T>` or `<T = any>` with constraints when needed

```typescript
export abstract class Injector implements Destroyable, OnDestroy {
    abstract get<T>(token: Token<T>, notFoundValue?: T, flags?: InjectFlags, context?: RunContext): T;
}
```

### Decorator Usage

Decorators are fundamental to this framework. Key decorators:

- `@Abstract()` for abstract base classes
- `@Injectable()`, `@Module()`, `@Singleton()` for class metadata
- `@Autowired()`, `@Inject()` for property/method injection

```typescript
@Abstract()
export abstract class Injector implements Destroyable, OnDestroy { }

@Injectable()
class PersonService { }

@Singleton('PersonService')
class PersonServiceImpl { }
```

### Error Handling

- Extend `Exception` for custom errors
- Use type guards and assertion functions for runtime checks
- Leverage `isNil()`, `isArray()`, `isFunction()` utilities

```typescript
export class Exception extends Error {
    constructor(message: string, readonly code?: any) {
        super(message);
        // ... proper prototype chain handling
    }
}

export class ArgumentException extends Exception {
    constructor(message?: string | string[]) {
        super(isArray(message) ? message.join('\n') : message || '');
    }
}
```

### JSDoc Comments

- Include JSDoc for public APIs, classes, and significant methods
- Document template types with `@template`
- Include `@returns` for methods returning values
- Use bilingual comments (English + Chinese) as seen in existing code

```typescript
/**
 * injector.
 * implements {@link Destroyable}
 * 
 * IoC 容器，注入器
 */
@Abstract()
export abstract class Injector implements Destroyable, OnDestroy { }
```

### Testing Conventions

- Test files: `*.spec.ts` in package `test/` directory
- Use Mocha-style `describe`/`it` blocks
- Use `expect` assertions from the `expect` library
- Use `beforeEach` for setup; group related tests in `describe` blocks

```typescript
import expect from 'expect';

describe('method exec test', () => {
    let container: Container;
    beforeEach(() => {
        container = createInjector();
    });

    it('show has prop metadata', () => {
        const refs = getClassRef(MethodTest2);
        expect(refs.hasMetadata(Inject, 'property')).toBeTruthy();
    });
});
```

### File Structure

```
packages/<package-name>/
├── src/
│   ├── index.ts          # Public exports
│   ├── injector.ts        # Main class/interface
│   ├── metadata/          # Decorator metadata
│   ├── impl/              # Implementations
│   ├── handlers/          # Runtime handlers
│   ├── utils/             # Utility functions
│   └── types.ts           # Type definitions
├── test/
│   └── *.spec.ts          # Test files
├── taskfile.ts            # Build configuration
├── unit.ts                # Test runner
└── package.json
```

### Key Patterns

- **Dependency Injection:** Token-based resolution with decorators
- **Provider Types:** ClassProvider, ValueProvider, FactoryProvider, ExistingProvider
- **Scope Management:** Singleton, Static, Platform, Root scopes
- **Context Propagation:** RunContext for thread-safe resolution
- **AOP Interceptors:** Adviser/aspect matching join points by metadata

### Architecture Notes

- **IoC layer** (`packages/ioc`): Foundation - resolution, injection, lifecycle
- **AOP layer** (`packages/aop`): Builds on IoC runtime contexts
- **Core layer** (`packages/core`): Application bootstrap and module system
- Cross-package changes often require synchronized updates across these layers

### ESLint Configuration

The project uses a permissive ESLint config that allows:
- `any` types (`@typescript-eslint/no-explicit-any: off`)
- Empty functions (`@typescript-eslint/no-empty-function: off`)
- Unused variables (`@typescript-eslint/no-unused-vars: off`)
- Namespaces (`@typescript-eslint/no-namespace: off`)
- Empty interfaces (`@typescript-eslint/no-empty-interface: off`)

These allowances are intentional for framework internals. Follow existing patterns when editing code.
