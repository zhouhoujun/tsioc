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

## Smoke test

`smoke.ts` boots the same module on port `3215`, calls `/hello` and
`/health/readiness`, and closes the context:

```bash
npx ts-node -r tsconfig-paths/register \
  packages/microservices/examples/smoke.ts
```

The `ms-examples` gate stage runs this smoke test.
