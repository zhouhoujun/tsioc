# packaged @tsdi/agent

这个目录用于发布 `npm` 包，源码位于
[主仓库](https://github.com/zhouhoujun/tsioc)。

`@tsdi/agent` 提供智能体运行时、模型适配器抽象、工具注册表、内存与会话存储、提示词构建器、调度器、请求/通道基础设施，以及控制台 UI。
它面向具备智能执行能力的任务代理，支持持久上下文、可复用记忆检索，以及在任务完成后自动蒸馏经验。

## 为什么选择 @tsdi/agent

- 直接建立在现有 `@tsdi/core` / IoC 应用模型之上，无需额外引入一套割裂的代理运行时。
- 将模型调用、工具执行、会话持久化、记忆检索与事件发布统一收敛在同一个可扩展运行时里。
- 可以先用内存实现快速启动本地开发，再逐步切换到持久化存储和自定义 provider。

## 安装

```shell
npm install @tsdi/agent
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

- `src/model`：模型适配器接口与默认 OpenAI Compatible 适配器
- `src/runtime`：turn 循环、事件、运行时状态与 turn handler
- `src/tools`：工具接口、注册表、审批管理与内置工具
- `src/memory`：会话存储、记忆存储、摘要器与 ORM 实现
- `src/prompt`：系统提示词构建器与 prompt section
- `src/scheduler`：定时任务抽象与 interval 调度器
- `src/channels`：本地 request/server/client 基础设施
- `src/ui`：控制台组件与 view model

## 主要导出

- `AgentModule`
- `AgentRuntime`
- `ToolRegistry`、`LocalToolRegistry`
- `ModelAdapter`、`OpenAICompatibleModelAdapter`、`EchoModelAdapter`
- `InMemorySessionStore`、`InMemoryMemoryStore`
- `AgentServer`、`AgentClient`、`LocalAgentClient`
- `provideAgent`、`withAgentTools`、`withAgentTurnGuards`、`withAgentTurnInterceptors`、`withAgentTurnFilters`

## 核心能力

- 基于 turn 的运行时，支持模型补全、工具执行、流式输出与事件发布。
- 可插拔的模型适配层，默认提供 OpenAI Compatible 适配器，并保留 provider 扩展能力。
- 通过 `SessionStore` 提供会话持久化，支持内存实现与 TypeORM 持久化实现。
- 通过 `MemoryStore` 提供记忆检索，支持 session 级与 global 级记录。
- 每次模型调用前，都会合并近期历史、摘要、工具定义与检索命中的记忆来构建上下文。
- 内置工具注册表与审批链路，便于把本地工具接入模型驱动的工作流。

## 记忆与经验蒸馏

- 代理会将工作记忆、会话摘要与蒸馏后的经验分层保存，让短期上下文与可复用知识采用不同策略管理。
- 可持久化的 `SessionStore` 与 `MemoryStore` 可以保留重启后的状态；跨会话复用则依赖 `scope: 'global'` 的记忆记录，或自定义 `MemoryStore` 实现。
- `ExperienceDistiller` 为运行时提供了内建扩展点，可将已完成交互自动转为结构化经验记录，并在后续被检索命中时参与上下文构建。
- 默认的 `DeterministicExperienceDistiller` 当前主要提取简单的用户偏好表达，并将其保存为 session 级经验记录。
- 这个包本身还没有内置完整的“自我进化”学习闭环，但已经暴露了持久化与蒸馏扩展缝隙，可作为后续演进基础。

## 适用场景

- 需要工具、记忆和会话连续性的任务型代理。
- 运行在现有 `@tsdi/*` 应用内部的控制台助手或服务端助手。
- 希望从本地简单工作流逐步演进到持久化、可替换 provider 部署形态的代理系统。

## 说明

- 默认模块会注册内置工具：`echo`、`time`、`memory.put`、`memory.search`。
- deferred tool 仍然保持 session 级激活边界；inspect 工具定义不会触发激活。
- 通过 manifest 注册的 MCP 工具必须先按 session 激活后才能调用，而动态 `mcp.call_tool` 只能访问 `@tsdi/agent-tools` 中显式声明或 allowlist 放行的工具。
- 默认模型适配器是 OpenAI Compatible 的 DeepSeek 适配器；可自行覆盖。
- 通道、模型提供方、网关和工具包的扩展能力位于 `packages/agents` 下的兄弟包中。

## License

MIT © [Houjun](https://github.com/zhouhoujun/)