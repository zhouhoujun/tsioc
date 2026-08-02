# packaged @tsdi/agent

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/tsioc).

`@tsdi/agent` provides the agent runtime, model adapter abstraction, tool registry,
memory/session stores, prompt builder, scheduler, request/channel primitives, and console UI.
It is designed for intelligent task execution with persistent context, reusable memory retrieval,
and automatic experience distillation from completed turns.

## Why @tsdi/agent

- Build task-oriented agents on top of the existing `@tsdi/core` / IoC application model instead of introducing a separate runtime stack.
- Combine model calls, tool invocation, session persistence, memory retrieval, and event publication inside one extensible runtime.
- Start with in-memory defaults for local development, then move to durable stores and custom providers as the agent grows.

## Install

```shell
npm install @tsdi/agent
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

- `src/model`: model adapter contracts and the default OpenAI-compatible adapter
- `src/runtime`: turn loop, events, runtime state, and turn handler
- `src/tools`: tool contracts, registry, approval manager, and builtin tools
- `src/memory`: session store, memory store, summarizer, and ORM-backed implementations
- `src/prompt`: system prompt builder and prompt sections
- `src/project`: AGENTS.md discovery and initialization helpers
- `src/harness`: tool execution coordinator, schema validation, rate limiting, output guarding, and audit sinks
- `src/scheduler`: scheduled task abstractions and interval scheduler
- `src/channels`: local request/server/client primitives
- `src/ui`: console component and view model

## Main exports

- `AgentModule`
- `AgentRuntime`
- `ToolRegistry`, `LocalToolRegistry`
- `ModelAdapter`, `RoutedModelAdapter`, `OpenAICompatibleModelAdapter`, `AnthropicModelAdapter`, `EchoModelAdapter`
- `InMemorySessionStore`, `InMemoryMemoryStore`
- `AgentServer`, `AgentClient`, `LocalAgentClient`
- `provideAgent`, `withAgentTools`, `withAgentTurnGuards`, `withAgentTurnInterceptors`, `withAgentTurnFilters`

## Core capabilities

- Turn-based runtime with model completion, tool execution, streaming support, and event emission.
- Pluggable model adapter layer with a default OpenAI-compatible adapter and provider extension points.
- Session persistence through `SessionStore` implementations, with in-memory and TypeORM-backed options.
- Memory retrieval through `MemoryStore`, including session-scoped and global records.
- Prompt and context assembly that merges recent history, summaries, tools, and retrieved memories before each model call.
- Project context injection from an `AGENTS.md` file (walked upward from the working directory) via `ProjectContextSection`, plus `initAgentsDoc()` for scaffolding one — used by the `/init` command.
- Built-in tool registry and approval pipeline for integrating local tools into model-driven workflows.

## Model routing configuration

The default `ModelAdapter` is now a `RoutedModelAdapter` built from `AgentOptions.model`.
You can keep a single model configuration, or define multiple model profiles and route
between them by prompt complexity or explicit matching rules.

### Supported configuration fields

- `provider`, `model`, `baseUrl`, `apiKey`, `apiKeyEnv`, `timeoutMs`, `temperature`, `maxTokens`, `headers`
- `profiles`: named reusable model/provider configs
- `defaultProfile`: fallback profile name
- `complexityRouting`: map `simple`, `moderate`, `complex` to a profile name or inline config
- `complexityThresholds`: tune how complexity is classified
- `routes`: explicit rules evaluated before complexity routing

### Provider notes

- `claude` is normalized to the native Anthropic adapter
- unknown providers with a `baseUrl` are treated as OpenAI-compatible endpoints

### Example

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

### Routing behavior

- Explicit `routes` are checked first.
- If no explicit route matches, the adapter estimates prompt complexity as `simple`, `moderate`, or `complex`.
- If no complexity route matches, the adapter falls back to `defaultProfile`, then to the top-level `model` config.

In the example above, simple or moderate prompts stay on `deepseek-v4-flash`,
while complex prompts are routed to `deepseek-v4-pro`.

## Control-plane capability matrix

| Capability | Status | Main implementation |
| --- | --- | --- |
| Tool input validation | Implemented | `src/harness/ToolSchemaValidator.ts`, `src/harness/ToolExecutionCoordinator.ts` |
| Tool output validation | Implemented | `src/harness/ToolSchemaValidator.ts`, `src/harness/ToolExecutionCoordinator.ts` |
| Tool timeout / retry / rate limiting | Implemented | `src/harness/ToolExecutionCoordinator.ts`, `src/harness/RateLimitManager.ts` |
| Output redaction | Implemented | `src/harness/OutputGuard.ts` |
| Audit logging (memory + durable fallback) | Implemented | `src/harness/DefaultAuditSink.ts`, `src/harness/InMemoryAuditSink.ts`, `src/harness/TypeOrmAuditSink.ts` |
| Session-scoped activation and approval | Implemented | `src/tools/LocalToolRegistry.ts`, `src/tools/ToolApprovalManager.ts` |
| Principal-aware tool authorization | Implemented | `src/tools/AgentTool.ts`, `src/harness/ToolExecutionCoordinator.ts` |
| Scheduler retry / backoff | Implemented | `src/scheduler/IntervalAgentScheduler.ts`, `src/scheduler/ScheduledAgentTask.ts` |
| Scheduler manual recovery / recover action | Implemented | `src/scheduler/IntervalAgentScheduler.ts`, `src/scheduler/AgentScheduler.ts` |
| Cross-session durable session / memory state | Implemented | `src/memory/TypeOrmSessionStore.ts`, `src/memory/TypeOrmMemoryStore.ts` |
| Gateway audit visibility | Implemented in sibling package | `packages/agents/agent-gateway/src/api/AuditHandler.ts` |
| Tool compensation / rollback | Implemented | `src/runtime/DefaultAgentRuntime.ts`, tool `compensate()` hooks (`src/tools/AgentTool.ts`) |
| Strong sandbox isolation | Partial / future phase | policy hooks + capability defaults (`src/harness/ToolSandboxPolicy.ts`), no universal sandbox runtime |

## Control-plane notes

- Tool execution now flows through a dedicated coordinator that applies validation, authorization, rate limits, timeout/retry policy, output guarding, and audit writes before results are persisted back into the session transcript.
- Audit behavior is environment-aware: local/default module usage resolves to `InMemoryAuditSink`, while applications that register a `TypeormAdapter` transparently switch to `TypeOrmAuditSink` through `DefaultAuditSink`.
- Scheduler failure handling is no longer fire-and-forget only: repeating tasks may exhaust retry attempts, enter `manualRecoveryRequired`, and then be re-armed explicitly through scheduler recovery semantics.
- Principal-aware authorization is expressed as tool metadata (`execution.authorization`) so sibling packages such as `@tsdi/agent-gateway` can pass caller identity without coupling authorization logic to transport code.

## Memory and experience distillation

- The agent keeps working memory, conversation summaries, and distilled experience separate, so short-term context and reusable knowledge do not have to be managed in the same way.
- Durable `SessionStore` and `MemoryStore` implementations preserve state across restarts; cross-session reuse is available through `scope: 'global'` memory records or custom `MemoryStore` implementations.
- `ExperienceDistiller` gives the runtime a built-in hook for converting finished interactions into structured memory records that may participate in later context assembly when they are retrieved.
- The default `DeterministicExperienceDistiller` captures simple user preference statements and stores them as session-scoped experience records.
- The package does not ship a full self-evolving learning loop, but it exposes the persistence and distillation seams needed to build one.

## Good fit for

- Task agents that need tools, memory, and session continuity.
- Console or service-side assistants built inside an existing `@tsdi/*` application.
- Agent systems that want to evolve from simple local workflows to durable, provider-backed deployments.

## Notes

- The default module registers builtin tools: `echo`, `time`, `memory.put`, and `memory.search`.
- Deferred tools remain session-gated: inspecting a tool definition does not activate it.
- Manifest-backed MCP tools require session activation before invocation, and dynamic `mcp.call_tool` access is limited to tools explicitly declared or allowlisted by `@tsdi/agent-tools`.
- The default model adapter is a routed adapter created from `AgentOptions.model`; with the default settings it falls back to DeepSeek.
- Cross-package integrations for channels, providers, gateway, and tool bundles live in sibling packages under `packages/agents`.

## License

This package is published under the Apache License 2.0.

Apache License 2.0 © [Houjun](https://github.com/zhouhoujun/)
