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
- `src/scheduler`: scheduled task abstractions and interval scheduler
- `src/channels`: local request/server/client primitives
- `src/ui`: console component and view model

## Main exports

- `AgentModule`
- `AgentRuntime`
- `ToolRegistry`, `LocalToolRegistry`
- `ModelAdapter`, `OpenAICompatibleModelAdapter`, `EchoModelAdapter`
- `InMemorySessionStore`, `InMemoryMemoryStore`
- `AgentServer`, `AgentClient`, `LocalAgentClient`
- `provideAgent`, `withAgentTools`, `withAgentTurnGuards`, `withAgentTurnInterceptors`, `withAgentTurnFilters`

## Core capabilities

- Turn-based runtime with model completion, tool execution, streaming support, and event emission.
- Pluggable model adapter layer with a default OpenAI-compatible adapter and provider extension points.
- Session persistence through `SessionStore` implementations, with in-memory and TypeORM-backed options.
- Memory retrieval through `MemoryStore`, including session-scoped and global records.
- Prompt and context assembly that merges recent history, summaries, tools, and retrieved memories before each model call.
- Built-in tool registry and approval pipeline for integrating local tools into model-driven workflows.

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
- The default model adapter is configured as an OpenAI-compatible DeepSeek adapter unless overridden.
- Cross-package integrations for channels, providers, gateway, and tool bundles live in sibling packages under `packages/agents`.

## License

MIT © [Houjun](https://github.com/zhouhoujun/)