# AGENTS.md

Guidance for AI coding agents in this repository.
See also [CLAUDE.md](./CLAUDE.md) — note: CLAUDE.md incorrectly claims `.eslintrc.js` exists; no ESLint config file exists anywhere in this repo.

## What This Repo Is

TypeScript monorepo for a decorator-driven IoC/application framework (Spring-like model). Version 6.0.x.

## Commands

```bash
npm install                                    # Install dependencies
npm run build                                  # Build entire monorepo (runs root taskfile.ts)
npm run build -- --setvs=6.0.0-beta            # Build + bump all package versions
./deploy                                       # Build + generate publish commands (equivalent: npm run build -- --deploy=true)

cd packages/<name> && npm run build            # Build single package
cd packages/<name> && npm test                 # Run tests for single package
cd packages/<name> && npm run test:coverage    # Run tests with coverage (NODE_V8_COVERAGE=.nyc_output)
```

### Run a Single Spec File

```bash
cd packages/ioc
npx ts-node -r tsconfig-paths/register -e \
  "const { runTest } = require('@tsdi/unit'); \
   const { ConsoleReporter } = require('@tsdi/unit-console'); \
   runTest('./test/method.spec.ts', { baseURL: __dirname }, ConsoleReporter)"
```

### VS Code Debug

Run `<package>/unit.ts` with runtime args `-r ts-node/register -r tsconfig-paths/register`. Configs exist in `.vscode/launch.json`.

## Build System

- **Self-referential**: Root `taskfile.ts` uses `@tsdi/activities` and `@tsdi/compiler` — the framework builds itself.
- Root taskfile iterates all package directories, runs each package's `taskfile.ts` via `Workflow.run(CompilerModule, options)`.
- Each package taskfile compiles `src/**/*.ts` to `dist/<package-name>/`.
- **Excluded from build**: `component` and `unit-karma` packages (hard-coded filter in root taskfile.ts).
- Build output is **only** in `dist/`. Do not edit files there, and do not commit compiled `.js`/`.js.map` in `packages/*/src/`.

## Package Structure

**Core stack (layered — changes propagate downward):**
- `packages/ioc` → foundation: DI container, tokens, metadata, invocation/resolution pipeline
- `packages/aop` → builds on IoC: aspects, advisors, proxy/proceed/joinpoint
- `packages/core` → builds on AOP + IoC: application/module bootstrap, routing, lifecycle

**Other top-level packages:**
`activities`, `annotations`, `boot`, `cli`, `common` (sub-dirs: `http`, `transport`, `client`, `protocol-factory`), `compiler`, `components`, `i18n`, `logger`, `microservice` (sub-dir: `tracing`), `platform-browser`, `platform-server`, `repository`, `typeorm-adapter`, `unit`, `unit-console`, `unit-karma`

**Sub-directory groupings:**
- `packages/services/` — protocol adapters: `amqp`, `coap`, `http`, `kafka`, `mqtt`, `nats`, `redis`, `tcp`, `udp`, `ws`
- `packages/microservices/` — infra modules: `client`, `service`, `config`, `discovery`, `endpoints`, `health`, `metrics`, `oidc-auth`, `security`, `swagger`

## Path Aliases

Defined in root `tsconfig.json`:
- `@tsdi/*` → `packages/*`, `packages/services/*`, `packages/microservices/*`

Cross-package imports use these aliases: `import { Injector } from '@tsdi/ioc'`

## Testing

- **Framework**: `@tsdi/unit` (custom — NOT Jest/Mocha). Dependencies: `assert`, `expect`, `@types/mocha`.
- **Two styles**: Mocha-style `describe()`/`it()` with `expect`, or decorator-style `@Suite`/`@Test` with IoC-injected `Expect`.
- **Entry point**: Each package has `unit.ts` calling `runTest('./test/**/*.ts', { baseURL: __dirname })`.
- **Container in tests**: Use `createInjector()` from `@tsdi/ioc`. Integration tests: `Application.run(TestModule)`, cleanup with `ctx.destroy()`.
- **Test files**: `*.spec.ts` in each package's `test/` directory.

## Linting

No ESLint configuration exists anywhere (no `.eslintrc*`, no `eslint.config.js`, no `eslintConfig` in any `package.json`). ESLint devDependencies are present at root but use default behavior only. The config is intentionally permissive for framework internals.

## TypeScript Config

- **Target**: ES2020, **Module**: CommonJS, **ModuleResolution**: node
- **Decorators**: `experimentalDecorators` + `emitDecoratorMetadata` — fundamental to the framework
- **Strict mode**: enabled (`strict`, `strictNullChecks`, `strictPropertyInitialization`)
- **lib**: dom, es2015, es2017; **types**: mocha

## Critical Constraints

- **No CI/CD** — all builds, tests, and deploys are manual local operations.
- **Cross-package changes** in `ioc`, `aop`, `core` often require synchronized updates across all three layers.
- **Decorator-driven behavior**: when debugging, inspect metadata/reflection code AND runtime execution code.
- **No `.eslintrc`** — do not assume lint rules exist beyond TypeScript strict mode.
- **Do not commit** compiled `.js`/`.js.map` in `packages/*/src/` — these belong only in `dist/`.
- `reflect-metadata` is a required dependency (used by the decorator system).

## Code Conventions

- Classes: PascalCase | Interfaces: PascalCase (no `I` prefix) | Functions: camelCase | Files: kebab-case
- Private members: no underscore prefix
- Cross-package imports: absolute `@tsdi/*` aliases | Same-package: relative imports
- Named exports preferred; avoid default exports
- JSDoc for public APIs, bilingual (English + Chinese):
  ```typescript
  /**
   * injector. implements {@link Destroyable}
   * IoC 容器，注入器
   */
  ```
- Custom errors extend `Exception`. Use type guards from `@tsdi/ioc/utils/chk`: `isNil()`, `isArray()`, `isFunction()`, `isString()`, `isPromise()`, `isType()`.

## Integration Test Services

`simples/docker-compose.yml` provides: postgres (5432), redis (6379), nats (4222/8222), mqtt/mosquitto (1883/9001), rabbitmq (5672/15672), zookeeper (2181), kafka (9092/29092).

```bash
cd simples && docker-compose up -d
```

## Release

```bash
npm run build -- --setvs=6.0.0-beta   # Bump all package versions
./deploy                              # Build + generate publish commands
# Then manually: cd dist/<package> && npm publish --access=public
```
