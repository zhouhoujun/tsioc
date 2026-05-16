# packaged @tsdi/agent-tools

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/tsioc).

`@tsdi/agent-tools` provides ready-to-register tool bundles for `@tsdi/agent`,
including filesystem tools, utility tools, and web access tools.

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

- `src/files`: file reading, glob search, content search, and path policy helpers
- `src/utility`: utility tools such as the calculator tool
- `src/web`: web search and web extraction tools

## Main exports

- `AgentToolsModule`
- `provideAgentTools`
- `withAgentToolsOptions`
- `withFilesystemAgentTools`
- `withUtilityAgentTools`
- `withWebAgentTools`
- `withDefaultAgentTools`
- `ReadFileTool`
- `GlobSearchTool`
- `ContentSearchTool`
- `CalculatorTool`
- `WebSearchTool`
- `WebExtractTool`

## Notes

- `ReadFileTool` enforces the configured workspace root and relative-path policy for file reads.
- `web_search` requires a configured search adapter.
- `web_extract` uses the configured fetch implementation when provided, otherwise falls back to `globalThis.fetch`, and returns extracted readable text.

## License

MIT © [Houjun](https://github.com/zhouhoujun/)