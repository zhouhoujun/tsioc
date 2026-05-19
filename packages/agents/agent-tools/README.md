# packaged @tsdi/agent-tools

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/tsioc).

`@tsdi/agent-tools` provides ready-to-register tool bundles for `@tsdi/agent`,
including filesystem tools, utility tools, web access tools, planning tools, scheduling tools, terminal tools, memory tools, optional HTTP tools, and registry introspection tools.

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
- `planning`: session todo list tools
- `http`: opt-in HTTP fetch/request tools
- `registry`: tool registry introspection tools
- `scheduling`: scheduled prompt tools
- `terminal`: opt-in shell execution tools
- `memory`: memory inspection and deletion tools

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
- `withTerminalAgentTools`
- `withDefaultAgentTools`
- `ReadFileTool`
- `GlobSearchTool`
- `ContentSearchTool`
- `CalculatorTool`
- `WebSearchTool`
- `WebExtractTool`
- `TodoTool`
- `HttpFetchTool`
- `HttpRequestTool`
- `ToolSearchTool`
- `ToolInspectTool`
- `ScheduleTool`
- `MemoryListTool`
- `MemoryDeleteTool`
- `TerminalTool`

## Notes

- `ReadFileTool` enforces the configured workspace root and relative-path policy for file reads.
- `web_search` requires a configured search adapter.
- `web_extract` uses the configured fetch implementation when provided, otherwise falls back to `globalThis.fetch`, and returns extracted readable text.

## License

MIT © [Houjun](https://github.com/zhouhoujun/)