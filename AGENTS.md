# AGENTS.md - Guidelines for Agentic Coding Assistants

This file provides guidance for AI coding agents operating in this repository.

## Repository Overview

`tsioc` is a TypeScript monorepo for a decorator-driven IoC and application framework.

**Core packages:**
- `@tsdi/ioc`: dependency injection container, tokens, metadata, runtime contexts
- `@tsdi/aop`: AOP advice/interceptor layer built on IoC runtime
- `@tsdi/core`: application/module bootstrap, routing abstractions, lifecycle

**Integration packages:**
- `packages/services/*`: Protocol adapters (amqp, coap, http, kafka, mqtt, nats, redis, tcp, udp, ws)
- `packages/transport/*`: Transport utilities (json, packet, stream, text)
- `packages/common/http`: HTTP abstractions shared across services

**Observability packages:**
- `health`: Health check module with indicators
- `metrics`: Metrics collection (counters, gauges, histograms, Prometheus exports)
- `tracing`: Distributed tracing with span creation and context propagation
- `discovery`: Service discovery abstractions
- `config`: Configuration management and environment-aware config loading

**Additional packages:**
- `i18n`: Internationalization module
- `annotations`: Build tooling for ES5 uglify compatibility
- `common/http`: Shared HTTP abstractions
- `common/transport`: Shared transport utilities

**Note:** No Cursor rules or Copilot rules exist. CLAUDE.md also exists with additional guidance.

---

## Build Commands

```bash
npm install                      # Install dependencies
npm run build                    # Build entire monorepo (runs taskfile.ts)
npm run build -- --setvs=4.0.0-beta  # Build with version replacement
npm run build -- --deploy=true   # Build and publish dist packages

cd packages/<package-name> && npm run build  # Build single package
# Equivalent: ts-node -r tsconfig-paths/register taskfile.ts
```

**Build output:** Generated under `dist/<package-name>/`. Do not edit generated files.

## Testing Commands

```bash
cd packages/<package-name> && npm test   # Run tests for single package (recommended)
tsdi test                                # Run tests via tsdi CLI (from project root)

# Run a single spec file
cd packages/ioc
npx ts-node -r tsconfig-paths/register -e "const { runTest } = require('@tsdi/unit'); const { ConsoleReporter } = require('@tsdi/unit-console'); runTest('./test/method.spec.ts', { baseURL: __dirname }, ConsoleReporter)"

# Debug tests in VSCode
# .vscode/launch.json contains pre-configured debug targets for each package
# Select "test <package>" from VSCode debug menu
```

**Test framework:** Uses `@tsdi/unit` (custom), not Jest/Mocha directly. Mocha-style `describe`/`it` blocks with `expect` assertions.

## Linting

```bash
npx eslint "packages/**/*.ts"
```

**Note:** No `.eslintrc` config file exists. ESLint uses defaults from `package.json` devDependencies. The config is intentionally permissive for framework internals: `any` types, empty functions, unused variables, namespaces, and empty interfaces are allowed. Follow existing patterns when editing code.

## TypeScript Configuration

- **Target:** ES2020, **Module:** CommonJS
- **Decorators:** Enabled (`experimentalDecorators`, `emitDecoratorMetadata`)
- **Strict mode:** Enabled (`strict`, `strictNullChecks`, `strictPropertyInitialization`)
- **Path aliases:** `@tsdi/*` → `packages/*`, `packages/services/*`, `packages/transport/*`

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
- Two test styles supported by `@tsdi/unit`:
  - **Mocha-style**: `describe()`, `it()`, `beforeEach()` with `expect` library
  - **Decorator-style**: `@Suite`, `@Test`, `@BeforeEach` decorators with IoC-injected `Expect`
- Container setup: Use `createInjector()` from `@tsdi/ioc`, not `new Container()`
- Integration tests: Bootstrap with `Application.run(TestModule)`, cleanup with `ctx.destroy()`

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

## Release and Deployment

**Note:** No automated CI/CD configured. All operations are manual local executions.

```bash
npm run build -- --setvs=6.0.0-beta  # Update all packages to new version
./deploy                            # Build and prepare for publish (logs commands only)
```

After `./deploy`, manually run `npm publish --access=public` in each `dist/<package>` directory.

---

## Integration Test Services

`simples/docker-compose.yml` provides test services (postgres, redis, nats, mqtt, rabbit, kafka):
```bash
cd simples && docker-compose up -d
```

`simples/` directory contains example applications (`boot`, `core`) demonstrating full module bootstrap patterns.