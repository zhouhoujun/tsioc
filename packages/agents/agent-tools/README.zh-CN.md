# packaged @tsdi/agent-tools

这个目录用于发布 `npm` 包，源码位于
[主仓库](https://github.com/zhouhoujun/tsioc)。

`@tsdi/agent-tools` 提供可直接注册到 `@tsdi/agent` 的工具集合，包括文件系统工具、实用工具、Web 访问工具、规划与协作工具、调度工具、终端工具、记忆工具、项目情报工具，以及按需启用的 HTTP 工具和工具注册表自省工具。

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
- `planning`：会话待办列表与协作请求载荷工具
- `http`：按需启用的 HTTP 抓取/请求工具
- `registry`：工具注册表自省工具
- `scheduling`：定时提示工具
- `terminal`：按需启用的终端执行工具
- `memory`：记忆回忆、导出、查看与删除工具
- `project`：项目摘要、风险与交接情报工具

## 主要导出

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

## 说明

- `ReadFileTool` 在读取文件时会限制在配置的工作区根目录内，并强制使用相对路径策略。
- `web_search` 需要注入可用的搜索适配器。
- `web_extract` 优先使用配置的 fetch 实现；若未提供，则回退到 `globalThis.fetch`，并返回提取后的可读文本。
- `tool_inspect` 是只读的，不会激活 deferred tool。
- 通过 manifest 注册的 MCP 工具会以 `mcp.<serverId>.<toolName>` 暴露，并保持 session 级激活边界；无论直接调用还是经 `mcp.call_tool` 桥接调用，都必须先激活。
- 动态 MCP 工具默认不能通过 `mcp.call_tool` 调用，只有在对应 server 的 `allowedTools` 中显式列出后才允许调用。

## 工具安全矩阵

| 工具 / 分组 | 激活方式 | 是否副作用 | Principal 策略 | 说明 |
| --- | --- | --- | --- | --- |
| `read_file`、`glob_search`、`content_search`、`tool_search`、`tool_inspect` | 文件搜索类为 deferred，registry 工具为 always-on | 否 / 只读 | 默认无要求 | 主要用于安全发现与检查。 |
| `write_file`、`edit_file`、`move_file`、`copy_file`、`mkdir`、`delete_file` | Deferred | 是 | `requiredPrincipals: ['local-system']`、`allowLocalAnonymous: true` | 本地变更工具在直接/本地执行时可用，但默认拒绝无关远程 principal。 |
| `terminal` | Deferred | 是 | `requiredPrincipals: ['local-system']`、`allowLocalAnonymous: true` | 前台命令执行；runtime 授权会区分本地 / gateway-local 与普通远程 principal。 |
| `process.start` | Deferred | 是 | `requiredPrincipals: ['local-system']`、`allowLocalAnonymous: true` | 后台进程创建与 terminal / 文件变更工具使用同样的本地优先策略。 |
| `http_request` | Deferred | 是 | `requiredPrincipals: ['local-system']`、`allowLocalAnonymous: true` | 允许本地场景使用，但默认不向普通远程 principal 放开副作用请求。 |
| `memory.*`、`schedule`、`cron_manage`、`todo`、`ask_user`、`escalate` | 多数为 always-on | 混合 | 默认无要求 | 仍然受 session ownership、scheduler/session scope 等运行时边界约束。 |
| MCP manifest 工具 / `mcp.call_tool` | Session-gated | 取决于具体工具 | 取决于桥接工具元数据 | 同时受 allowlist 与 session activation 规则约束。 |

### 授权语义

- `allowLocalAnonymous: true` 表示在本地/直接执行时，即使没有显式 principal 也允许调用；当 gateway 关闭鉴权时，对应的 `gateway-local` principal 也会被视为本地场景。
- `requiredPrincipals` 会在真正进入工具实现之前，由 `@tsdi/agent` 的工具执行协调器统一校验。
- 不满足工具授权策略的远程 principal 会得到授权失败结果；该失败会记录进 tool receipt 与 audit trail，而不会真的执行副作用操作。

## MCP 安全边界

配置 `provideMcpTools` 时，`server.tools` 用于声明应注册进本地工具注册表、可被 inspect 且按 session 激活的 MCP 工具；`allowedTools` 仅用于允许那些保持未注册状态、但仍可通过 `mcp.call_tool` 调用的动态工具。

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

在这个配置里：
- `mcp.demo.echo` 会被注册，可通过 registry tools 看见，并且使用前需要按 session 激活。
- `dynamic_echo` 不会注册成 `mcp.demo.dynamic_echo`，但因为被显式加入 allowlist，所以可通过 `mcp.call_tool` 调用。
- 其他动态 MCP 工具默认都会被拒绝。

## License

该包按 Apache License 2.0 发布。仓库根目录许可证可以不同；对于 `packages/agents/*`，请以各子包自己的许可证声明作为分发与使用依据。

Apache License 2.0 © [Houjun](https://github.com/zhouhoujun/)