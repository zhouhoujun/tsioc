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

MIT © [Houjun](https://github.com/zhouhoujun/)