# Microservice examples

Runnable, dependency-light examples for the `@tsdi` microservice stack.

## HTTP quickstart

`http-quickstart.ts` wires one controller, the memory health endpoint and
graceful shutdown through `defineService`:

```bash
npx ts-node -r tsconfig-paths/register \
  packages/microservices/examples/http-quickstart.ts

curl http://127.0.0.1:3210/hello
# {"ok":true,"service":"quickstart"}

curl http://127.0.0.1:3210/health/readiness
# {"status":"UP", ...}
```

Set `PORT` to change the listen port; `SIGINT`/`SIGTERM` drain in-flight
requests before closing the HTTP server.

## Full stack (backend + discovery + gateway)

`full-stack.ts` runs an HTTP backend, registers it in
`InMemoryServiceDiscovery`, and starts a gateway route that resolves the
service through discovery:

```bash
npx ts-node -r tsconfig-paths/register \
  packages/microservices/examples/full-stack.ts

curl http://127.0.0.1:3220/api/users
```

`full-stack-smoke.ts` is the gate version (ports `3223/3222`). It verifies the
backend directly and through the gateway, then closes both applications.

## Smoke test

`smoke.ts` boots the same module on port `3215`, calls `/hello` and
`/health/readiness`, and closes the context:

```bash
npx ts-node -r tsconfig-paths/register \
  packages/microservices/examples/smoke.ts
```

The `ms-examples` gate stage runs this smoke test.

## Soak smoke

`soak.ts` keeps 8 concurrent callers busy (configurable), then checks that
heap usage is stable and sockets/handles return to the boot baseline:

```bash
NODE_OPTIONS=--expose-gc MS_SOAK_MS=30000 \
  npx ts-node -r tsconfig-paths/register \
  packages/microservices/examples/soak.ts
```

- `MS_SOAK_MS` — load window (CI nightly uses `1800000` for 30 minutes).
- `MS_SOAK_CONCURRENCY` — parallel callers (default 8).
- `MS_SOAK_HEAP_LIMIT_MB` — post-GC heap growth budget (default 64MB).
- `MS_SOAK_RSS_LIMIT_MB` — optional RSS growth budget; RSS is otherwise only
  reported because Node/V8 can retain allocator pages after a burst.
- `MS_SOAK_HANDLE_LIMIT` — handles above the pre-boot baseline (default 4).

Run it through the gate with `MS_SOAK_PROFILE=1 bash scripts/agents-gate.sh ms-soak`.
