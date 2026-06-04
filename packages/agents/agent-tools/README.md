# packaged @tsdi/agent-tools

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/tsioc).

`@tsdi/agent-tools` provides ready-to-register tool bundles for `@tsdi/agent`,
including filesystem tools, utility tools, web access tools, planning and collaboration tools, scheduling tools, terminal tools, memory tools, project intelligence tools, optional HTTP tools, and registry introspection tools.

## Install

```shell
npm install @tsdi/agent-tools
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

- `files`: file reading, glob search, content search, and path policy helpers
- `utility`: utility tools such as the calculator tool
- `web`: web search and web extraction tools
- `planning`: session todo list and collaboration request-payload tools
- `http`: opt-in HTTP fetch/request tools
- `registry`: tool registry introspection tools
- `scheduling`: scheduled prompt tools
- `terminal`: opt-in shell execution tools
- `memory`: memory recall, export, inspection, and deletion tools
- `project`: project summary, risk, and handoff intelligence tools

## Main exports

- `AgentToolsModule`
- `provideTools`
- `withAgentToolsOptions`
- `withFilesystemAgentTools`
- `withUtilityAgentTools`
- `withWebAgentTools`
- `withPlanningAgentTools`
- `withHttpAgentTools`
- `withRegistryAgentTools`
- `withSchedulingAgentTools`
- `withMemoryAgentTools`
- `withProjectAgentTools`
- `withTerminalAgentTools`
- `withDefaultAgentTools`
- `ReadFileTool`
- `GlobSearchTool`
- `ContentSearchTool`
- `CalculatorTool`
- `WebSearchTool`
- `WebExtractTool`
- `TodoTool`
- `AskUserTool`
- `EscalateTool`
- `HttpFetchTool`
- `HttpRequestTool`
- `ToolSearchTool`
- `ToolInspectTool`
- `ScheduleTool`
- `MemoryListTool`
- `MemoryRecallTool`
- `MemoryExportTool`
- `MemoryForgetTool`
- `MemoryDeleteTool`
- `ProjectIntelTool`
- `TerminalTool`

## Notes

- `ReadFileTool` enforces the configured workspace root and relative-path policy for file reads.
- `web_search` requires a configured search adapter.
- `web_extract` uses the configured fetch implementation when provided, otherwise falls back to `globalThis.fetch`, and returns extracted readable text.
- `tool_inspect` is read-only and does not activate deferred tools.
- Manifest-backed MCP tools registered as `mcp.<serverId>.<toolName>` stay session-gated and must be activated before either direct invocation or `mcp.call_tool` bridging.
- Dynamic MCP tools are not callable through `mcp.call_tool` unless they are explicitly listed in `allowedTools` for that server.

## Tool security matrix

| Tool / group | Activation | Side effect | Principal policy | Notes |
| --- | --- | --- | --- | --- |
| `read_file`, `glob_search`, `content_search`, `tool_search`, `tool_inspect` | Deferred for filesystem search, always-on for registry tools | No / read-only | None | Safe discovery and inspection surface. |
| `write_file`, `edit_file`, `move_file`, `copy_file`, `mkdir`, `delete_file` | Deferred | Yes | `requiredPrincipals: ['local-system']`, `allowLocalAnonymous: true` | Local mutation tools remain usable in direct/local execution but are denied by default for unrelated remote principals. |
| `terminal` | Deferred | Yes | `requiredPrincipals: ['local-system']`, `allowLocalAnonymous: true` | Foreground command execution; runtime authz differentiates local/gateway-local from other remote principals. |
| `process.start` | Deferred | Yes | `requiredPrincipals: ['local-system']`, `allowLocalAnonymous: true` | Background process creation is restricted the same way as terminal and mutation tools. |
| `http_request` | Deferred | Yes | `requiredPrincipals: ['local-system']`, `allowLocalAnonymous: true` | Remote-capable side effects remain local-first by policy. |
| `memory.*`, `schedule`, `cron_manage`, `todo`, `ask_user`, `escalate` | Mostly always-on | Mixed | None by default | Session ownership and scheduler/session scoping still apply through runtime and tool logic. |
| MCP manifest tools / `mcp.call_tool` | Session-gated | Depends on tool | Depends on bridged tool metadata | Also constrained by allowlist and session activation rules. |

### Authorization semantics

- `allowLocalAnonymous: true` means a tool may run without an explicit principal in local/direct execution and may also run for the gateway-local principal used when gateway auth is disabled.
- `requiredPrincipals` is enforced by `@tsdi/agent`'s tool execution coordinator before the tool implementation runs.
- Remote principals that do not satisfy the tool policy receive an authorization failure recorded in the tool receipt and audit trail instead of executing the side effect.

## MCP security boundary

When configuring `provideMcpTools`, use `server.tools` for MCP tools that should be registered into the local tool registry, inspected, and activated per session. Use `allowedTools` only for dynamic tools that should remain unregistered but still be callable through `mcp.call_tool`.

```ts
provideMcpTools({
  servers: [{
    id: 'demo',
    client,
    tools: [{
      name: 'echo',
      description: 'Echo input back.'
    }],
    allowedTools: ['dynamic_echo']
  }]
})
```

In this setup:
- `mcp.demo.echo` is registered, visible through registry tools, and requires session activation before use.
- `dynamic_echo` is not registered as `mcp.demo.dynamic_echo`, but `mcp.call_tool` may call it because it is explicitly allowlisted.
- Any other dynamic MCP tool is rejected by default.

## License

This package is published under the Apache License 2.0. The repository root license may differ; for `packages/agents/*`, use this package-level license declaration for distribution and consumption.

Apache License 2.0 © [Houjun](https://github.com/zhouhoujun/)