# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

`tsioc` is a TypeScript monorepo for a decorator-driven IoC and application framework. The core layering is:

- `@tsdi/ioc`: DI container, provider registration, metadata, runtime contexts, invocation/resolution pipeline
- `@tsdi/aop`: aspect/advice/proxy layer built on top of IoC runtime handling
- `@tsdi/core`: application bootstrap, modules, lifecycle, handlers, routing abstractions, application events
- `@tsdi/repository` + `@tsdi/typeorm-adapter`: repository/transaction/persistence integration
- `@tsdi/components` + `@tsdi/components/html`: component model and HTML rendering
- `packages/services/*`: protocol adapters such as HTTP, MQTT, Kafka, NATS, Redis, TCP, UDP, WS
- `packages/microservices/*`: microservice infrastructure such as client/service/config/discovery/endpoints/security/swagger/tracing
- `packages/activities` + `packages/compiler`: the build system used by the repo to build itself

The framework is Spring-like: decorators define metadata, IoC resolves instances, AOP wraps execution, and higher-level packages compose those primitives into applications, transports, and platform integrations.

## Commands

### Install dependencies

```bash
npm install
```

### Build the repository

```bash
npm run build
```

Root build is driven by `taskfile.ts`. It only scans direct children of `packages/`, so nested package groups are **not** covered by the root build.

### Build with version replacement

```bash
npm run build -- --setvs=6.0.0-beta
```

This updates direct child package versions plus the root `package.json` before building.

### Build and generate publish output

```bash
npm run build -- --deploy=true
# or
./deploy
# on Windows
./deploy.cmd
```

The deploy flow generates publish output from `dist/`; it does not directly publish packages.

### Build a single top-level package

```bash
cd packages/<package-name>
npm run build
# equivalent:
ts-node -r tsconfig-paths/register taskfile.ts
```

### Build nested packages

```bash
cd packages/services/<protocol> && npm run build
cd packages/microservices/<package> && npm run build
```

### Run tests for a package

```bash
cd packages/<package-name>
npm test
cd packages/<package-name> && npm run test:coverage
```

Nested packages follow the same pattern:

```bash
cd packages/services/mqtt && npm test
cd packages/microservices/mqtt && npm test
```

### Run a single spec file

Package tests are launched through `unit.ts`, which calls `runTest('./test/**/*.ts', { baseURL: __dirname })`. To run one spec:

```bash
cd packages/ioc
npx ts-node -r tsconfig-paths/register -e "const { runTest } = require('@tsdi/unit'); const { ConsoleReporter } = require('@tsdi/unit-console'); runTest('./test/method.spec.ts', { baseURL: __dirname }, ConsoleReporter)"
```

### VS Code debug

Run the target package's `unit.ts` with runtime args:

```bash
-r ts-node/register -r tsconfig-paths/register
```

### Integration services for examples/tests

```bash
cd simples && docker-compose up -d
```

`simples/docker-compose.yml` includes postgres, redis, nats, mqtt/mosquitto, rabbitmq, zookeeper, and kafka.

### Linting

There is **no** active ESLint configuration in this repository: no `.eslintrc*`, no `eslint.config.*`, and no root `npm run lint` script. Validate changes with package builds and targeted tests.

## Build and Test Structure

- Root `taskfile.ts` is self-hosting: it uses `@tsdi/activities` and `@tsdi/compiler` from this same monorepo.
- Root build skips direct packages whose path names end with `component` or `unit-karma`.
- Package `taskfile.ts` files typically compile `src/**/*.ts` into `dist/<package-name>` with declarations and source maps.
- Tests are package-local and usually run through each package's `unit.ts`, not from a root-wide test runner.
- Root `package.json` only provides `build`, `postinstall`, and `reinstall`; package-level scripts are the authoritative place for package test/build commands.

## Architecture Map

### 1. IoC foundation: `packages/ioc`

Start here for anything involving dependency resolution, runtime contexts, invocation behavior, provider semantics, or decorator metadata.

Important areas:
- `src/injector.ts`: injector contract and provider resolution API
- `src/context.ts` and `src/handlers/*`: runtime context and handler pipeline primitives
- `src/impl/*`: concrete injector, invocation, initialization, resolver implementations
- `src/metadata/*`: decorators and metadata model

Changes here often ripple into `aop` and `core`.

### 2. AOP layer: `packages/aop`

This package wraps IoC-managed execution with aspects/advisers/proxy logic. If invocation context or handler composition changes in `ioc`, inspect `aop` for matching updates.

### 3. Application framework: `packages/core`

`@tsdi/core` turns IoC + AOP into an application runtime.

Important areas:
- `Application` / `ApplicationContext`: application bootstrap and global container
- module loading and lifecycle wiring
- generic handler chain support: guards, interceptors, filters, backends
- application events and runners

If a change affects bootstrap, lifecycle, route handling, or event dispatch, this is the layer to inspect.

### 4. Persistence layer: `packages/repository` and `packages/typeorm-adapter`

Repository injection and transaction behavior live in `repository`; TypeORM-specific module/connection/entity integration lives in `typeorm-adapter`.

### 5. UI/component layer: `packages/components` and `packages/components/html`

Component rendering is split between the component model and HTML-specific rendering/template support. For UI tests, look at existing JSDOM-based specs in component-related packages.

### 6. Transports and distributed runtime

There are two separate groupings with different responsibilities:

- `packages/services/*`: legacy protocol adapters. Treat this tree as deprecated unless the user explicitly asks you to touch it.
- `packages/microservices/*`: active client/service/discovery/config/security/swagger/tracing infrastructure

For active transport work, prefer the current runtime model:

- `RequestContext` reads request/response through `MessageAdapter`
- transport handlers should prefer `MessageAdapterFactory` over direct request/response wrapper construction
- content/file sending should go through `ContentSendAdapter`
- avoid reintroducing direct dependencies on deleted `packages/common/src/incoming.impl.ts` and `packages/common/src/outgoing.impl.ts`
- avoid relying on `toJson()` transport wrappers when direct request fields or adapter state are available

When working on networked or distributed flows, expect application logic to reuse the same module/container/decorator patterns rather than a separate runtime model.

### 7. Build/tooling layer

- `packages/activities`: workflow primitives used by build taskfiles
- `packages/compiler`: compiler module used by the taskfiles

Because the repo builds itself, breakages in these packages can cascade into build failures across the monorepo.

### 8. Agents package: `packages/agents`

`packages/agents` is a standard top-level package layered on the existing framework, not a separate architecture. It currently composes:

- `runtime/`: agent turn loop, tool loop, events, handler integration
- `model/`: model adapter abstraction and default echo adapter
- `tools/`: tool registry and built-in tools
- `memory/`: session store, memory store, summarizer, ORM entities
- `scheduler/`: in-memory scheduled tasks
- `channels/`: local request/server/client abstractions
- `ui/`: console component and view-model
- `hermes/`: default Hermes-like assembly modules

Recent work routes `AgentRuntime.runTurn()` through `@tsdi/core`'s generic guard/interceptor/filter pipeline via a turn handler token, so runtime behavior may be extended through providers rather than direct conditionals.

## TypeScript and Module Conventions

- Root TypeScript target is ES2020 with CommonJS modules.
- `experimentalDecorators` and `emitDecoratorMetadata` are fundamental to the framework design.
- Strict mode is enabled, including `strictNullChecks` and `strictPropertyInitialization`.
- Root path aliases currently map `@tsdi/*` to:
  - `packages/*`
  - `packages/microservices/*`
  - `packages/agents/*`
- Cross-package imports generally use `@tsdi/*` aliases.

If IDE diagnostics show missing `@tsdi/*` modules, verify the workspace is using the repository root `tsconfig.json` rather than a nested folder in isolation.

## Testing Conventions

- Tests live under each package's `test/` directory and typically use `*.spec.ts`.
- The repo uses `@tsdi/unit`, not Jest.
- Two common styles exist:
  - Mocha-style `describe` / `it` with `expect`
  - decorator-style `@Suite` / `@Test`
- Package `unit.ts` files are thin wrappers around `runTest(...)`.
- For application-level integration tests, use `Application.run(...)` and close/destroy the context explicitly afterward.

## Repository-Specific Notes

- Many behaviors are decorator-driven. Debug both metadata registration and runtime execution.
- Cross-package refactors commonly require coordinated changes across `packages/ioc`, `packages/aop`, and `packages/core`.
- Build artifacts belong in `dist/`; do not edit generated output.
- Do not commit compiled `.js` or `.js.map` files into `packages/*/src/`.
- `reflect-metadata` is required by the decorator system.
