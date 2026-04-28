# AGENTS.md - Guidelines for Agentic Coding Assistants

This file provides guidance for AI coding agents operating in this repository.
See also [CLAUDE.md](./CLAUDE.md) which overlaps but contains at least one known error (claims `.eslintrc.js` exists — it does not).

## Repository Overview

`tsioc` is a TypeScript monorepo for a decorator-driven IoC and application framework (Spring-like model).

**Core stack (layered — changes propagate downward):**
- `@tsdi/ioc` → foundation: DI container, tokens, metadata, runtime contexts, invocation/resolution pipeline
- `@tsdi/aop` → builds on IoC runtime: aspects, advisors, proxy/proceed/joinpoint logic
- `@tsdi/core` → builds on AOP + IoC: application/module bootstrap, routing, lifecycle, `ApplicationContext`

**Other top-level packages under `packages/`:**
- `activities` — workflow engine, sequence/parallel activities, task orchestration
- `annotations` — build tooling for ES5 uglify compatibility
- `boot` — bootstrap via `BootApplication.run()` with app configuration
- `cli` — CLI tool (`tsdi new`, `tsdi test`)
- `common` — shared utilities (sub-dirs: `http`, `transport`)
- `compiler` — TypeScript compiler integration (build tooling)
- `components` — UI component system with templates and directives
- `config` — configuration management, env-aware config loading
- `discovery` — service discovery abstractions
- `endpoints` — HTTP endpoint handling (controllers, decorators for routes)
- `health` — health check module with indicators
- `i18n` — internationalization (ICU MessageFormat, locale switching)
- `logger` — logging module (AOP-based)
- `metrics` — counters, gauges, histograms, Prometheus exports
- `microservice` — microservice patterns on top of core + transports
- `oidc-auth` — OIDC authentication module
- `platform-browser` — browser platform adapter
- `platform-server` — server platform adapter
- `repository` — ORM repository patterns, `@Transactional`, `@Repository`
- `security` — authentication/authorization
- `swagger` — Swagger/OpenAPI integration
- `tracing` — distributed tracing (spans, context propagation)
- `typeorm-adapter` — TypeORM integration
- `unit` — custom test framework (`@tsdi/unit`, Mocha-style)
- `unit-console` — console reporter for tests
- `unit-karma` — Karma integration (intentionally excluded from build)

**Sub-package directories:**
- `packages/services/*` — protocol adapters: amqp, coap, http, kafka, mqtt, nats, redis, tcp, udp, ws
- `packages/transport/*` — transport utilities: json, packet, stream, text

## Build Commands

```bash
npm install                      # Install dependencies
npm run build                    # Build entire monorepo (runs taskfile.ts via ts-node)
npm run build -- --setvs=4.0.0-beta  # Build + version replacement in all package.json
npm run build -- --deploy=true   # Build + generate publish commands

cd packages/<package-name> && npm run build  # Build single package
# Equivalent: ts-node -r tsconfig-paths/register taskfile.ts
```

**Build output:** Generated under `dist/<package-name>/`. Do not edit generated files.
**Self-referential:** The build system (`taskfile.ts`) uses `@tsdi/compiler` and `@tsdi/activities` — the framework builds itself.

## Testing Commands

```bash
cd packages/<package-name> && npm test   # Run tests for single package (RECOMMENDED)

# Run a single spec file
cd packages/ioc
npx ts-node -r tsconfig-paths/register -e \
  "const { runTest } = require('@tsdi/unit'); \
   const { ConsoleReporter } = require('@tsdi/unit-console'); \
   runTest('./test/method.spec.ts', { baseURL: __dirname }, ConsoleReporter)"
```

**Test framework:** Uses `@tsdi/unit` (custom, NOT Jest/Mocha). Supports two styles:
- **Mocha-style**: `describe()`, `it()`, `beforeEach()` with `expect`
- **Decorator-style**: `@Suite`, `@Test`, `@BeforeEach` with IoC-injected `Expect`

**Container in tests:** Use `createInjector()` from `@tsdi/ioc`. For integration tests: `Application.run(TestModule)`, cleanup with `ctx.destroy()`.
Test files: `*.spec.ts` in `test/` directory. Each package has a `unit.ts` entry point.

## Linting

```bash
npx eslint "packages/**/*.ts"
```

**No `.eslintrc` file exists anywhere.** ESLint uses defaults from `package.json` devDependencies. The config is intentionally permissive: `any` types, empty functions, unused variables, namespaces, and empty interfaces are allowed. Follow existing patterns when editing.

## TypeScript Configuration

- **Target:** ES2020, **Module:** CommonJS, **ModuleResolution:** node
- **Decorators:** Enabled (`experimentalDecorators`, `emitDecoratorMetadata`) — FUNDAMENTAL to the framework
- **Strict mode:** Enabled (`strict`, `strictNullChecks`, `strictPropertyInitialization`)
- **Path aliases:** `@tsdi/*` → `packages/*`, `packages/services/*`, `packages/transport/*`
- **lib:** dom, es2015, es2017; **types:** mocha

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

### Decorator Usage

Decorators are fundamental:
- `@Abstract()` — abstract base class
- `@Injectable()` — register as injectable service, can provide to token
- `@Singleton()` — global singleton scope
- `@Static()` — static in injector scope
- `@Inject()` / `@Autowired()` / `@Param()` — property/parameter injection
- `@Module()` (alias `@DIModule`) — module definition
- `@Aspect()` — AOP aspect class
- `@Before`/`@After`/`@Around`/`@AfterThrowing`/`@AfterReturning`/`@Pointcut` — AOP advice (matchString|RegExp)
- `@Providers([...])` — private providers for a class
- `@Nullable`, `@Optional`, `@Self`, `@SkipSelf`, `@Host` — parameter resolution modifiers

### Error Handling

- Extend `Exception` for custom errors
- Use type guards from `@tsdi/ioc/utils/chk` for validation: `isNil()`, `isArray()`, `isFunction()`, `isString()`, `isPromise()`, `isType()`
- `ArgumentException`, `TypeException` are built-in exception types

### JSDoc Comments

Include for public APIs. Bilingual format (English + Chinese):
```typescript
/**
 * injector. implements {@link Destroyable}
 * IoC 容器，注入器
 */
```

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

## Key Architecture Patterns

**Provider Types:**
- `ClassProvider`: `{ provide: Token, useClass: Type }`
- `ValueProvider`: `{ provide: Token, useValue: value }`
- `FactoryProvider`: `{ provide: Token, useFactory: fn, deps: [] }`
- `ExistingProvider`: `{ provide: Token, useExisting: Token }`

**Scope Management:** Singleton, Static, Platform, Root

**Layer Dependencies (IMPORTANT):**
- `ioc` → Foundation (standalone)
- `aop` → Builds on `ioc` runtime contexts
- `core` → Builds on `aop` + `ioc`
- Cross-package changes often require synchronized updates across all three layers.

**When debugging decorator-driven behavior:** Inspect metadata/reflection code AND runtime execution code.

## Release and Deployment

No automated CI/CD. All operations are manual local executions.

```bash
npm run build -- --setvs=6.0.0-beta  # Update all packages to new version
./deploy                            # Equivalent: npm run build -- --deploy=true
```

After `./deploy`, manually run `npm publish --access=public` in each `dist/<package>` directory.

## Integration Test Services

`simples/docker-compose.yml` provides test services (postgres, redis, nats, mqtt, rabbit, kafka):
```bash
cd simples && docker-compose up -d
```

`simples/` directory contains example applications (`boot`, `core`) demonstrating full module bootstrap.

## Repo-Specific Notes

- **Do not commit compiled `.js`/`.js.map` files** in `packages/*/src/` directories — these are build artifacts that belong only in `dist/`.
- `.claude/` contains `settings.local.json` (Claude Code permissions) and `worktrees/` — these are local dev files.
- `.sisyphus/` contains work plans — reference for session continuity if needed.
