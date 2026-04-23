# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

`tsioc` is a TypeScript monorepo for a decorator-driven IoC and application framework. The core stack is:

- `@tsdi/ioc`: dependency injection container, tokens, metadata, runtime contexts, invocation/resolution pipeline
- `@tsdi/aop`: AOP advice/interceptor layer built on top of IoC runtime handling
- `@tsdi/core`: application/module bootstrap, routing abstractions, lifecycle, application context
- platform and integration packages: HTTP endpoints, security, repository/transactions, TypeORM adapter, browser/server platforms
- transport adapters under `packages/services/*`: protocol-specific integrations for AMQP, Kafka, MQTT, NATS, Redis, TCP, UDP, WS, etc. These follow the same module/container patterns as core packages.

The framework follows a Spring-like model in TypeScript: decorators define metadata, IoC resolves instances, AOP wraps invocation, and higher-level packages compose those primitives into application bootstrapping and transports.

## Common Commands

### Install dependencies

```bash
npm install
```

### Build the whole monorepo

```bash
npm run build
```

### Build with version replacement

```bash
npm run build -- --setvs=4.0.0-beta
```

### Build and publish dist packages

```bash
npm run build -- --deploy=true
# or
./deploy.cmd
```

### Build a single package

```bash
cd packages/<package-name>
npm run build
# equivalent:
ts-node -r tsconfig-paths/register taskfile.ts
```

### Run tests for a single package

Most packages expose:

```bash
cd packages/<package-name>
npm test
```

For example:

```bash
cd packages/ioc && npm test
```

### Run a single spec file

Package tests are launched through `unit.ts`, which calls `runTest('./test/**/*.ts', { baseURL: __dirname }, ConsoleReporter)`. To run one spec, invoke `runTest` directly from the package directory:

```bash
cd packages/ioc
npx ts-node -r tsconfig-paths/register -e "const { runTest } = require('@tsdi/unit'); const { ConsoleReporter } = require('@tsdi/unit-console'); runTest('./test/method.spec.ts', { baseURL: __dirname }, ConsoleReporter)"
```

For VS Code debugging, create a launch configuration that runs `unit.ts` with the test glob as an argument.

### Lint

There is a root ESLint config at `.eslintrc.js`, but no root `npm run lint` script is defined. If needed, run ESLint directly against the files you changed:

```bash
npx eslint "packages/**/*.ts"
```

## Build and Test Structure

- Root build entrypoint is [taskfile.ts](taskfile.ts). It iterates package folders and runs each package `taskfile.ts`.
- Each package-level `taskfile.ts` defines:
  - source glob
  - test glob
  - output directory under `dist/<package>`
  - bundle formats (typically CommonJS plus ES targets and sometimes UMD)
- Package tests are typically started from `unit.ts` in the package root, not from a generic root test runner.
- Root `package.json` only defines `build`, `postinstall`, and `reinstall`; package-level `package.json` files often define their own `build` and `test` scripts.

## Architecture Map

### 1. IoC layer (`packages/ioc`)

This is the foundation of the repo.

- `src/injector.ts`: abstract injector contract, provider registration, token resolution API, scope/lifecycle surface
- `src/context.ts`: invocation/resolve options and context-related types; this area is central when changing how call context is propagated
- `src/handlers/*`: runtime handler/interceptor/context pipeline primitives
- `src/impl/*`: concrete injector, invocation, and initialization implementations
- `src/metadata/*`: decorator metadata model (`@Injectable`, `@Module`, param/property decorators, class refs)
- `src/providers.ts`, `src/resolver.ts`, `src/tokens.ts`: provider model, parameter resolution, token semantics

If you are changing dependency resolution, invocation context, or performance of object creation/invocation, start in `packages/ioc` and then inspect downstream consumers in `aop` and `core`.

### 2. AOP layer (`packages/aop`)

`@tsdi/aop` builds on IoC runtime contexts and handlers.

- Advisers/aspects match join points by method/property metadata and naming patterns.
- Proceeding/proxy logic wraps instance methods and property access, then re-enters the IoC runtime pipeline.
- Changes to IoC context objects or invocation APIs often require corresponding updates here, especially in proxy/proceed/joinpoint code.

### 3. Application layer (`packages/core`)

`@tsdi/core` turns IoC + AOP into an application framework.

- `ApplicationContext` extends `Injector` and acts as the global application container.
- Module loading, bootstrapping, route handling, and application events all depend on the IoC runtime contracts.
- If injector/context abstractions change, inspect `ApplicationContext`, module loader/bootstrap code, and invocation handler options here.

### 4. Observability packages

These provide health checks, metrics, and distributed tracing:

- `health`: Health check module with indicators and `/health` endpoint
- `metrics`: Metrics collection with counters, gauges, histograms, and Prometheus-compatible exports
- `tracing`: Distributed tracing with span creation, context propagation, and exporter integrations
- `discovery`: Service discovery abstractions for microservice environments
- `config`: Configuration management and environment-aware config loading

### 5. i18n package

- `i18n`: Internationalization module with translation management, locale switching, ICU MessageFormat (interpolation, plural, select), number/date/currency formatters, and JSON translation loaders

### 6. Integration packages

Other packages are mostly adapters over the core runtime:

- `endpoints`, `platform-server`, `platform-browser`: transport/platform concerns
- `repository`, `typeorm-adapter`: persistence and transactions
- `security`, `logger`, `swagger`, `components`: feature modules on top of core abstractions
- `packages/services/*`: protocol adapters sharing the same container/module patterns

## TypeScript and Module Conventions

- TypeScript target is ES2020 with CommonJS modules.
- Decorators and `emitDecoratorMetadata` are enabled and are fundamental to the framework design.
- Root path aliases map `@tsdi/*` to both `packages/*` and `packages/services/*` via [tsconfig.json](tsconfig.json).
- Strict mode is enabled, including `strictNullChecks` and `strictPropertyInitialization`.

## Testing Conventions

- Tests live in each package’s `test/` directory and usually use `*.spec.ts`.
- The test style is Mocha-like `describe`/`it` with `expect` assertions.
- `@tsdi/unit` provides the actual test bootstrap; package `unit.ts` files are thin wrappers.

## Repository-Specific Notes

- Many APIs are decorator-driven; when debugging behavior, inspect metadata/reflection code as well as runtime execution code.
- Cross-package refactors frequently require synchronized changes in `packages/ioc`, `packages/aop`, and `packages/core`.
- Build output is generated under `dist/`; avoid editing generated files.
- **Do not commit compiled `.js` and `.js.map` files** in `packages/*/src/` directories. These are build artifacts that should only exist in `dist/`.
- The existing ESLint config is intentionally permissive for framework internals (`any`, empty functions, unused vars, namespaces are allowed in several cases).
