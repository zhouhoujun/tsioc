# packaged @tsdi/agent-channels

这个目录用于发布 `npm` 包，源码位于
[主仓库](https://github.com/zhouhoujun/tsioc)。

`@tsdi/agent-channels` 提供会话通道的接口、适配器与编排能力，用于将 `@tsdi/agent` 的请求接入不同传输层。

## 安装

```shell
npm install @tsdi/agent-channels
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

- `src/contracts`：通道能力、消息、附件、健康状态与通道接口
- `src/orchestrator`：通道注册表、消息封装映射与编排流程
- `src/adapters`：本地 loopback、pub/sub、console、webhook、SSE 等适配器

## 主要导出

- `AgentChannelsModule`
- `AgentConversationChannel`
- `AgentChannelRegistry`
- `AgentChannelOrchestrator`
- `ChannelEnvelopeMapper`
- `LocalLoopbackAgentChannel`
- `PubSubConversationChannel`
- `ConsoleAgentChannel`
- `WebhookAgentChannel`
- `SSEAgentChannel`
- `provideChannels`、`withAgentChannels`、`withAgentChannelFeatures`

## 说明

- 当核心运行时需要通过可插拔会话通道发送或接收消息时，使用这个包。
- 可通过 `provideChannels(...)` 组合 providers、features 与 imports 完成通道装配。
- 通道适配器只负责传输智能体请求与响应，不会绕过运行时内部的工具激活边界或 MCP allowlist 校验。

## License

该包按 Apache License 2.0 发布。

Apache License 2.0 © [Houjun](https://github.com/zhouhoujun/)