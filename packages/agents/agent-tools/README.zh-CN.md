# packaged @tsdi/agent-tools

这个目录用于发布 `npm` 包，源码位于
[主仓库](https://github.com/zhouhoujun/tsioc)。

`@tsdi/agent-tools` 提供可直接注册到 `@tsdi/agent` 的工具集合，包括文件系统工具、实用工具、Web 访问工具、规划工具、调度工具、终端工具、记忆工具，以及按需启用的 HTTP 工具和工具注册表自省工具。

## 安装

```shell
npm install @tsdi/agent-tools
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

- `files`：文件读取、glob 搜索、内容搜索与路径策略辅助函数
- `utility`：计算器等通用工具
- `web`：Web 搜索与网页内容提取工具
- `planning`：会话待办列表工具
- `http`：按需启用的 HTTP 抓取/请求工具
- `registry`：工具注册表自省工具
- `scheduling`：定时提示工具
- `terminal`：按需启用的终端执行工具
- `memory`：记忆查看与删除工具

## 主要导出

- `AgentToolsModule`
- `provideAgentTools`
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

## 说明

- `ReadFileTool` 在读取文件时会限制在配置的工作区根目录内，并强制使用相对路径策略。
- `web_search` 需要注入可用的搜索适配器。
- `web_extract` 优先使用配置的 fetch 实现；若未提供，则回退到 `globalThis.fetch`，并返回提取后的可读文本。

## License

MIT © [Houjun](https://github.com/zhouhoujun/)