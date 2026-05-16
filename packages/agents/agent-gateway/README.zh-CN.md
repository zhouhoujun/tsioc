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
- `src/api`：health、session、memory、tools、event 处理器
- `src/ws`：聊天 WebSocket 桥接

## 主要导出

- `AgentGatewayModule`
- `GatewayServer`
- `RouteMatcher`
- `AuthMiddleware`
- `PairingStore`、`RateLimiter`、`SessionQueue`、`SessionOwnerStore`
- `HealthHandler`、`SessionHandler`、`MemoryHandler`、`ToolsHandler`、`EventHandler`
- `ChatWebSocket`
- `provideAgentGateway`

## HTTP 能力

该包内置了以下处理器：

- 健康检查
- 会话管理
- 记忆访问
- 工具定义列表
- 事件历史与广播分发

这些处理器通过 `getRoutes()` 暴露路由，需要显式调用 `GatewayServer.addRoute(...)` 或 `GatewayServer.addRoutes(...)` 注册到服务中。

## License

MIT © [Houjun](https://github.com/zhouhoujun/)