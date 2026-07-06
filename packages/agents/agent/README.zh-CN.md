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
- `src/harness`：工具执行协调器、schema 校验、限流、输出保护与审计 sink
- `src/scheduler`：定时任务抽象与 interval 调度器
- `src/channels`：本地 request/server/client 基础设施
- `src/ui`：控制台组件与 view model

## 主要导出

- `AgentModule`
- `AgentRuntime`
- `ToolRegistry`、`LocalToolRegistry`
- `ModelAdapter`、`RoutedModelAdapter`、`OpenAICompatibleModelAdapter`、`AnthropicModelAdapter`、`EchoModelAdapter`
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

## 模型路由配置

默认的 `ModelAdapter` 现在是根据 `AgentOptions.model` 构建出来的 `RoutedModelAdapter`。
你既可以继续只配置一个模型，也可以定义多个模型档位，再按提示词复杂度或显式规则在不同 provider / model 之间切换。

### 支持的配置字段

- `provider`、`model`、`baseUrl`、`apiKey`、`apiKeyEnv`、`timeoutMs`、`temperature`、`maxTokens`、`headers`
- `profiles`：可复用的命名模型配置
- `defaultProfile`：默认回退 profile 名称
- `complexityRouting`：把 `simple`、`moderate`、`complex` 映射到 profile 名称或内联配置
- `complexityThresholds`：调整复杂度分类阈值
- `routes`：在复杂度路由前优先执行的显式匹配规则

### Provider 说明

- `claude` 会自动归一化到原生 Anthropic 适配器
- 未知 provider 但显式提供了 `baseUrl` 时，会按 OpenAI-compatible endpoint 处理

### 示例

```ts
import { AgentModule, provideAgent } from '@tsdi/agent';

const providers = provideAgent({
  model: {
    provider: 'deepseek',
    model: 'deepseek-v4-flash',
    baseUrl: 'https://api.deepseek.com',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    profiles: {
      fast: {
        provider: 'deepseek',
        model: 'deepseek-v4-flash',
        baseUrl: 'https://api.deepseek.com',
        apiKeyEnv: 'DEEPSEEK_API_KEY'
      },
      strong: {
        provider: 'deepseek',
        model: 'deepseek-v4-pro',
        baseUrl: 'https://api.deepseek.com',
        apiKeyEnv: 'DEEPSEEK_API_KEY'
      },
      customGateway: {
        provider: 'openai-compatible',
        model: 'hermes-70b',
        baseUrl: 'https://your-openai-compatible-gateway/v1',
        apiKeyEnv: 'CUSTOM_GATEWAY_API_KEY'
      }
    },
    complexityRouting: {
      simple: 'fast',
      moderate: 'fast',
      complex: 'strong'
    },
    routes: [
      {
        name: 'architecture-review',
        when: { containsAny: ['architecture', '架构'] },
        profile: 'customGateway'
      }
    ]
  }
});

AgentModule.withOptions({
  model: {
    provider: 'deepseek',
    model: 'deepseek-v4-flash'
  }
});
```

### 路由行为

- 先检查显式 `routes`
- 如果没有命中显式规则，再把输入复杂度估算为 `simple`、`moderate` 或 `complex`
- 如果没有命中复杂度路由，则回退到 `defaultProfile`，再回退到顶层 `model` 配置

上面的示例里，`simple` / `moderate` 会继续走 `deepseek-v4-flash`，
而 `complex` 会切到 `deepseek-v4-pro`。

## Control-plane 能力矩阵

| 能力 | 状态 | 主要实现 |
| --- | --- | --- |
| 工具输入校验 | 已实现 | `src/harness/ToolSchemaValidator.ts`、`src/harness/ToolExecutionCoordinator.ts` |
| 工具输出校验 | 已实现 | `src/harness/ToolSchemaValidator.ts`、`src/harness/ToolExecutionCoordinator.ts` |
| 工具超时 / 重试 / 限流 | 已实现 | `src/harness/ToolExecutionCoordinator.ts`、`src/harness/RateLimitManager.ts` |
| 输出脱敏 | 已实现 | `src/harness/OutputGuard.ts` |
| 审计日志（内存 + 持久化回退） | 已实现 | `src/harness/DefaultAuditSink.ts`、`src/harness/InMemoryAuditSink.ts`、`src/harness/TypeOrmAuditSink.ts` |
| Session 级工具激活与审批 | 已实现 | `src/tools/LocalToolRegistry.ts`、`src/tools/ToolApprovalManager.ts` |
| 基于 principal 的工具授权 | 已实现 | `src/tools/AgentTool.ts`、`src/harness/ToolExecutionCoordinator.ts` |
| Scheduler 重试 / backoff | 已实现 | `src/scheduler/IntervalAgentScheduler.ts`、`src/scheduler/ScheduledAgentTask.ts` |
| Scheduler 人工恢复 / recover 操作 | 已实现 | `src/scheduler/IntervalAgentScheduler.ts`、`src/scheduler/AgentScheduler.ts` |
| 跨会话持久化 session / memory 状态 | 已实现 | `src/memory/TypeOrmSessionStore.ts`、`src/memory/TypeOrmMemoryStore.ts` |
| Gateway 审计可见性 | 已在兄弟包实现 | `packages/agents/agent-gateway/src/api/AuditHandler.ts` |
| 工具补偿 / 回滚 | 部分 / 后续阶段 | 作为后续增强 |
| 强沙箱隔离 | 部分 / 后续阶段 | 目前主要是策略层，不是统一沙箱运行时 |

## Control-plane 说明

- 工具执行现在统一经过协调器：在结果写回 session transcript 之前，会依次应用校验、授权、限流、超时/重试策略、输出保护与审计写入。
- 审计行为具备环境自适应：默认本地模块使用 `InMemoryAuditSink`；当应用注册了 `TypeormAdapter` 时，会通过 `DefaultAuditSink` 自动切换到 `TypeOrmAuditSink`。
- Scheduler 失败处理不再只是 fire-and-forget：重复任务在重试耗尽后可以进入 `manualRecoveryRequired`，再通过显式 recovery 语义重新挂载执行。
- principal-aware 授权通过工具元数据（`execution.authorization`）表达，因此 `@tsdi/agent-gateway` 这类兄弟包只需透传调用者身份，而无需把授权逻辑硬编码到传输层。

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
- 默认模型适配器是根据 `AgentOptions.model` 创建的路由适配器；默认配置下会回退到 DeepSeek。
- 通道、模型提供方、网关和工具包的扩展能力位于 `packages/agents` 下的兄弟包中。

## License

该包按 Apache License 2.0 发布。仓库根目录许可证可以不同；对于 `packages/agents/*`，请以各子包自己的许可证声明作为分发与使用依据。

Apache License 2.0 © [Houjun](https://github.com/zhouhoujun/)
