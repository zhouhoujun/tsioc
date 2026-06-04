# packaged @tsdi/agent-gateway

这个目录用于发布 `npm` 包，源码位于
[主仓库](https://github.com/zhouhoujun/tsioc)。

`@tsdi/agent-gateway` 提供基于 HTTP 与 WebSocket 暴露 `@tsdi/agent` 的构件，包含认证中间件、会话归属、事件流、记忆访问以及工具列表 API。

## 安装

```shell
npm install @tsdi/agent-gateway
```

## 构建

```shell
npm run build
```

## 测试

```shell
npm test
npm run test:coverage
```

## 目录结构

- `src/contracts`：网关配置、路由契约、会话信息与配对码模型
- `src/gateway`：服务启动与路由匹配
- `src/auth`：认证中间件、限流、配对/会话存储与排队逻辑
- `src/api`：health、session、memory、tools、audit、event 处理器
- `src/ws`：聊天 WebSocket 桥接

## 主要导出

- `AgentGatewayModule`
- `GatewayServer`
- `RouteMatcher`
- `AuthMiddleware`
- `PairingStore`、`RateLimiter`、`SessionQueue`、`SessionOwnerStore`
- `HealthHandler`、`SessionHandler`、`MemoryHandler`、`ToolsHandler`、`AuditHandler`、`EventHandler`
- `ChatWebSocket`
- `provideAgentGateway`

## HTTP 能力

该包内置了以下处理器：

- 健康检查
- 会话管理
- 记忆访问
- 工具定义列表
- 审计日志查询
- 事件历史与广播分发

这些处理器通过 `getRoutes()` 暴露路由，需要显式调用 `GatewayServer.addRoute(...)` 或 `GatewayServer.addRoutes(...)` 注册到服务中。

工具列表 API 是只读的：它只暴露 registry 中的工具定义与激活状态，不会激活 deferred tool。通过网关暴露的 MCP 工具仍然遵守 `@tsdi/agent` 与 `@tsdi/agent-tools` 强制执行的 session 激活和 allowlist 规则。

审计 API 同样是只读并带有归属校验：`GET /api/audit` 需要提供 `sessionId`，并且只会返回当前认证 principal 拥有的会话记录；同时支持按 `toolName` 和 `status` 做过滤。

## License

该包按 Apache License 2.0 发布。仓库根目录许可证可以不同；对于 `packages/agents/*`，请以各子包自己的许可证声明作为分发与使用依据。

Apache License 2.0 © [Houjun](https://github.com/zhouhoujun/)