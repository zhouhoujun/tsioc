# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

`tsioc` is a TypeScript monorepo for a decorator-driven IoC and application framework. The core stack is:

- `@tsdi/ioc`: dependency injection container, tokens, metadata, runtime contexts, invocation/resolution pipeline
- `@tsdi/aop`: AOP advice/interceptor layer built on top of IoC runtime handling
- `@tsdi/core`: application/module bootstrap, routing abstractions, lifecycle, application context
- platform and integration packages: HTTP endpoints, security, repository/transactions, TypeORM adapter, browser/server platforms
- protocol adapters under `packages/services/*` and microservice transports under `packages/microservices/*`

The framework follows a Spring-like model in TypeScript: decorators define metadata, IoC resolves instances, AOP wraps invocation, and higher-level packages compose those primitives into application bootstrapping and transports.

## Common Commands

### Install dependencies

```bash
npm install
```

### Build the direct root packages

```bash
npm run build
```

The root build entrypoint is `taskfile.ts`. It scans only direct children of `packages/`, so nested packages under `packages/services/*` and `packages/microservices/*` are built with their own package-level commands.

### Build with version replacement

```bash
npm run build -- --setvs=6.0.0-beta
```

This version replacement uses the root build runner and updates only direct child packages under `packages/` plus the root `package.json`.

### Build and generate publish output

```bash
npm run build -- --deploy=true
# or
./deploy
# or on Windows
./deploy.cmd
```

The current deploy path logs/generates publish output from `dist/`; it does not run `npm publish` itself.

### Build a single package

```bash
cd packages/<package-name>
npm run build
# equivalent:
ts-node -r tsconfig-paths/register taskfile.ts
```

For nested packages:

```bash
cd packages/services/<protocol> && npm run build
cd packages/microservices/<package> && npm run build
```

### Run tests for a single package

Most testable packages expose:

```bash
cd packages/<package-name>
npm test
```

Nested packages follow the same pattern:

```bash
cd packages/services/mqtt && npm test
cd packages/microservices/mqtt && npm test
```

Many packages also expose coverage via:

```bash
npm run test:coverage
```

### Run a single spec file

Package tests are launched through `unit.ts`, which calls `runTest('./test/**/*.ts', { baseURL: __dirname }, ConsoleReporter)`. To run one spec, invoke `runTest` directly from the package directory:

```bash
cd packages/ioc
npx ts-node -r tsconfig-paths/register -e "const { runTest } = require('@tsdi/unit'); const { ConsoleReporter } = require('@tsdi/unit-console'); runTest('./test/method.spec.ts', { baseURL: __dirname }, ConsoleReporter)"
```

For VS Code debugging, run the target package’s `unit.ts` with `-r ts-node/register -r tsconfig-paths/register`.

### Lint

There is no ESLint configuration in this repository (`.eslintrc*`, `eslint.config.*`, or `eslintConfig` in `package.json` are absent) and no root `npm run lint` script. Prefer TypeScript/package builds and targeted tests for validation.

## Build and Test Structure

- Root build entrypoint is `taskfile.ts`. It updates versions when `--setvs=<version>` is passed, then builds direct child packages under `packages/`.
- The root build skips direct packages whose paths end in `component` or `unit-karma`; the actual `packages/components` directory is not skipped by that singular `component` filter.
- Package-level `taskfile.ts` files compile `src/**/*.ts` into `dist/<package>` with declaration and source maps enabled.
- Some packages customize output/module format; for example `packages/ioc` emits ES module output while most package taskfiles emit CommonJS.
- Package tests are typically started from `unit.ts` in the package root, not from a generic root test runner.
- Root `package.json` only defines `build`, `postinstall`, and `reinstall`; package-level `package.json` files define their own `build`, `test`, and sometimes `test:coverage` scripts.

## Architecture Map

### 1. IoC layer (`packages/ioc`)

This is the foundation of the repo.

- `src/injector.ts`: abstract injector contract, provider registration, token resolution API, scope/lifecycle surface
- `src/context.ts`: invocation/resolve options and context-related types; this area is central when changing how call context is propagated
- `src/handlers/*`: runtime handler/interceptor/context pipeline primitives
- `src/impl/*`: concrete injector, invocation, and initialization implementations
- `src/metadata/*`: decorator metadata model (`@Injectable`, `@Module`, param/property decorators, class refs)
- `src/providers.ts`, `src/resolver.ts`, `src/tokens.ts`: provider model, parameter resolution, token semantics

If you are changing dependency resolution, invocation context, or performance of object creation/invocation, start in `packages/ioc` and then inspect downstream consumers in AOP and core.

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

### 4. Build/tooling layer

- `packages/activities` provides the workflow primitives used by build taskfiles.
- `packages/compiler` provides `CompilerModule`, which package taskfiles invoke through `Workflow.run()`.
- The repo is self-hosting: the root and package taskfiles import `@tsdi/activities` and `@tsdi/compiler` via the root TypeScript path aliases.

### 5. Platform and integration packages

- `platform-server` and `platform-browser` provide runtime platform integration.
- `repository` and `typeorm-adapter` provide persistence and transaction support.
- `logger`, `components`, `boot`, `cli`, `common`, `annotations`, and `i18n` layer additional framework features on top of IoC/core.

### 6. Services and microservices

- `packages/services/*` contains protocol adapters such as AMQP, CoAP, HTTP, Kafka, MQTT, NATS, Redis, TCP, UDP, and WS.
- `packages/microservices/*` contains microservice infrastructure and transports: client/service/transport plus config, discovery, endpoints, health, metrics, tracing, security, swagger, protocol implementations, and OIDC auth.
- These packages follow the same container/module/decorator patterns as the core packages but are nested, so do not assume root `npm run build` covers them.

## TypeScript and Module Conventions

- TypeScript target is ES2020 with CommonJS modules at the root config level.
- Decorators and `emitDecoratorMetadata` are enabled and are fundamental to the framework design.
- Root path aliases map `@tsdi/*` to `packages/agents/*`, `packages/microservices/*`, and `packages/*` via `tsconfig.json`.
- Strict mode is enabled, including `strictNullChecks` and `strictPropertyInitialization`.
- Cross-package imports generally use `@tsdi/*` aliases.

## Testing Conventions

- Tests live in each package’s `test/` directory and usually use `*.spec.ts`.
- The test style is Mocha-like `describe`/`it` with `expect` assertions; some areas also use `@tsdi/unit` decorator-style tests.
- `@tsdi/unit` provides the actual test bootstrap; package `unit.ts` files are thin wrappers.
- Integration services for examples/tests are defined in `simples/docker-compose.yml` and include postgres, redis, nats, mqtt/mosquitto, rabbitmq, zookeeper, and kafka.

## Repository-Specific Notes

- Many APIs are decorator-driven; when debugging behavior, inspect metadata/reflection code as well as runtime execution code.
- Cross-package refactors frequently require synchronized changes in `packages/ioc`, `packages/aop`, and `packages/core`.
- Build output is generated under `dist/`; avoid editing generated files.
- Do not commit compiled `.js` and `.js.map` files in `packages/*/src/` directories. These are build artifacts that should only exist in `dist/`.
- `reflect-metadata` is required by the decorator system.
