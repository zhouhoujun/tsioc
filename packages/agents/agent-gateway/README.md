# packaged @tsdi/agent-gateway

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/tsioc).

`@tsdi/agent-gateway` provides the HTTP and WebSocket building blocks for exposing `@tsdi/agent`,
including auth middleware, session ownership, event streaming, memory access, and tool listing APIs.

## Install

```shell
npm install @tsdi/agent-gateway
```

## Build

```shell
npm run build
```

## Test

```shell
npm test
npm run test:coverage
```

## Package layout

- `src/contracts`: gateway configuration, route contracts, session info, and pairing code models
- `src/gateway`: server bootstrap and route matching
- `src/auth`: auth middleware, rate limiting, pairing/session stores, and queueing
- `src/api`: health, session, memory, tools, and event handlers
- `src/ws`: chat WebSocket bridge

## Main exports

- `AgentGatewayModule`
- `GatewayServer`
- `RouteMatcher`
- `AuthMiddleware`
- `PairingStore`, `RateLimiter`, `SessionQueue`, `SessionOwnerStore`
- `HealthHandler`, `SessionHandler`, `MemoryHandler`, `ToolsHandler`, `EventHandler`
- `ChatWebSocket`
- `provideAgentGateway`

## HTTP surface

The package includes handlers for:

- health checks
- session management
- memory access
- tool definition listing
- event history and broadcast delivery

These handlers expose `getRoutes()` and must be registered into `GatewayServer` explicitly via `addRoute(...)` or `addRoutes(...)`.

Tool listing APIs are read-only: they expose registry definitions and activation state, but do not activate deferred tools. MCP-backed tools exposed through the gateway still obey the runtime session-activation and allowlist rules enforced by `@tsdi/agent` and `@tsdi/agent-tools`.

## License

MIT © [Houjun](https://github.com/zhouhoujun/)