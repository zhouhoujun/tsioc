# AGENTS.md - Guidelines for Agentic Coding Assistants

This file provides guidance for AI coding agents operating in this repository.

## Repository Overview

`tsioc` is a TypeScript monorepo for a decorator-driven IoC and application framework.

**Core packages:**
- `@tsdi/ioc`: dependency injection container, tokens, metadata, runtime contexts
- `@tsdi/aop`: AOP advice/interceptor layer built on IoC runtime
- `@tsdi/core`: application/module bootstrap, routing abstractions, lifecycle
- Protocol adapters in `packages/`: AMQP, Kafka, MQTT, NATS, Redis, TCP, WS, etc.

**Note:** No Cursor rules (`.cursor/rules/`, `.cursorrules`) or Copilot rules (`.github/copilot-instructions.md`) exist in this repo.

---

## Build Commands

```bash
npm install                      # Install dependencies
npm run build                    # Build entire monorepo
npm run build -- --setvs=4.0.0-beta  # Build with version replacement
npm run build -- --deploy=true   # Build and publish dist packages
./deploy.cmd                     # Alternative deploy script

cd packages/<package-name> && npm run build  # Build single package
```

## Testing Commands

```bash
cd packages/<package-name> && npm test   # Run tests for single package (recommended)
tsdi test                                # Run tests via tsdi CLI (from project root)

# Run a single spec file
cd packages/ioc
npx ts-node -r tsconfig-paths/register -e "const { runTest } = require('@tsdi/unit'); const { ConsoleReporter } = require('@tsdi/unit-console'); runTest('./test/method.spec.ts', { baseURL: __dirname }, ConsoleReporter)"

# Debug tests
cd packages/<package-name> && npx ts-node -r tsconfig-paths/register unit.ts
```

## Linting

```bash
npx eslint "packages/**/*.ts"
```

## TypeScript Configuration

- **Target:** ES2020, **Module:** CommonJS
- **Decorators:** Enabled (`experimentalDecorators`, `emitDecoratorMetadata`)
- **Strict mode:** Enabled (`strict`, `strictNullChecks`, `strictPropertyInitialization`)
- **Path aliases:** `@tsdi/*` → `packages/*` and `packages/services/*`

---

## Code Style Guidelines

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Classes | PascalCase | `Injector`, `ClassRef` |
| Interfaces | PascalCase (no `I` prefix) | `Token`, `Provider` |
| Functions | camelCase | `isArray`, `createInjector` |
| Type aliases | PascalCase | `RecordFactory<T>` |
| Constants/Tokens | PascalCase/SCREAMING_SNAKE | `INJECTOR`, `RECORDS` |
| Private members | No underscore prefix | `private scope?: InjectorScope` |
| Files | kebab-case | `injector.ts`, `class-ref.ts` |

### Imports

- Cross-package: `import { Injector } from '@tsdi/ioc'` (absolute path aliases)
- Same package: `import { isArray } from './utils/chk'` (relative imports)
- Group: external packages first, then internal modules
- Named exports preferred; avoid default exports

### Type Annotations

- Explicit types for public API parameters and return types
- Use type guards (`isXxx()`) for runtime checks
- Available type guards: `isNil()`, `isArray()`, `isFunction()`, `isString()`, `isPromise()`, `isType()`

### Decorator Usage

Decorators are fundamental to this framework:
- `@Abstract()` — Abstract base classes
- `@Injectable()` — Register as injectable service
- `@Singleton()` — Global singleton scope
- `@Module()` (alias `@DIModule`) — Module definition
- `@Inject()` / `@Autowired()` — Property/method injection
- `@Providers([...])` — Private providers for class

### Error Handling

- Extend `Exception` for custom errors
- Use type guards from `@tsdi/ioc/utils/chk` for validation
- `ArgumentException`, `TypeException` are built-in exception types

### JSDoc Comments

Include for public APIs. Use bilingual format (English + Chinese):
```typescript
/**
 * injector. implements {@link Destroyable}
 * IoC 容器，注入器
 */
```

### Testing Conventions

- Test files: `*.spec.ts` in `test/` directory
- Mocha-style `describe`/`it` blocks
- `expect` assertions from `expect` library
- `beforeEach` for setup

---

## File Structure

```
packages/<package-name>/
├── src/
│   ├── index.ts              # Public exports
│   ├── metadata/             # Decorator metadata
│   ├── impl/                 # Implementations
│   ├── handlers/             # Runtime handlers
│   └── utils/                # Utility functions
├── test/*.spec.ts            # Test files
├── taskfile.ts               # Build config (Workflow)
├── unit.ts                   # Test runner entry
└── package.json
```

---

## Key Architecture Patterns

**Provider Types:**
- `ClassProvider`: `{ provide: Token, useClass: Type }`
- `ValueProvider`: `{ provide: Token, useValue: value }`
- `FactoryProvider`: `{ provide: Token, useFactory: fn, deps: [] }`
- `ExistingProvider`: `{ provide: Token, useExisting: Token }`

**Scope Management:** Singleton, Static, Platform, Root

**Layer Dependencies:**
- `ioc` → Foundation (standalone)
- `aop` → Builds on `ioc` runtime contexts
- `core` → Builds on `aop` + `ioc`
- Cross-package changes often require synchronized updates across layers

---

## ESLint Allowances

Permissive config intentional for framework internals: `any` types, empty functions, unused variables, namespaces, and empty interfaces are allowed. Follow existing patterns when editing code.