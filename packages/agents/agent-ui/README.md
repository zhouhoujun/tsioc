# packaged @tsdi/agent-ui

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/tsioc).

`@tsdi/agent-ui` provides the reactive console UI for `@tsdi/agent`, including
TUI (terminal), browser (web), VS Code webview, and Electron desktop rendering.
It owns all UI state, keymaps, themes, message rendering, and command dispatch
while delegating agent runtime and RPC to the host.

## Install

```shell
npm install @tsdi/agent-ui
```

## Build

```shell
npm run build          # Node build
npm run build:web      # esbuild web bundle (agent-console.js)
```

## Test

```shell
npm test
npm run test:coverage
```

## Architecture

- **Cross-platform reactive rendering**: TUI/浏览器/VS Code webview/Electron 四端共用同一响应式渲染层（数据驱动、无定时器、时间派生动画），跨平台约束沉淀至根 AGENTS.md。
- **ConsoleRenderer / TuiRenderer**: 浏览器端走 DOM，命令行端走 TuiTerminalSurface；两平台共用同一实现。
- **AgentConsoleComponent**: 主组件，管理消息列表、输入面板、命令分发、键位处理。
- **AgentConsoleSessionState**: 响应式状态管理（消息、草稿、附件、工具、面板可见性等）。
- **AgentConsolePanels**: 面板渲染（帮助、设置、健康、which-key、消息详情等）。

## Package layout

- `AgentConsoleComponent` — 主组件：命令分发、steer/queue、编辑消息、steer 模式
- `AgentConsoleSessionState` — 响应式状态：消息、草稿、附件、工具、切换器
- `AgentConsolePanels` — 面板渲染：帮助、设置、健康、which-key、消息详情
- `AgentConsoleKeymap` — 键位系统：5 上下文分域（global/composer/list/approval/pager）、which-key、冲突检测
- `AgentConsoleMessageRenderers` — 消息渲染：markdown、工具输出、时间戳、raw 模式
- `AgentConsoleSessionService` — 会话服务：fork、delegation、线程导航
- `AgentConsoleTheme` — 主题：dark/light/solarized/high-contrast + 即时应用
- `AgentConsoleTitle` — 终端标题：OSC 0 / document.title + 运行状态
- `AgentConsoleVim` — Vim 模式：normal/insert/visual
- `AgentConsoleStatusline` — 可配置状态栏
- `AgentConsoleStash` — 草稿暂存
- `AgentConsoleRawMode` — 原始滚动模式
- `AgentConsoleApps` — connectors 命令面
- `AgentConsoleSuggestions` — `@` mention 候选 + `/` 命令补全
- `AgentConsoleMarkdown` — Markdown 增量渲染
- `AgentConsoleInputHistoryStore` — 输入历史
- `AgentConsoleSettingsStore` — 设置持久化
- `AgentConsoleModelStore` — 模型收藏/最近循环
- `AgentConsoleWorkspaceMentions` — workspace @ 候选
- `AgentEditorBridge` — 外部编辑器桥
- `AgentIdeBridge` — IDE 通信桥
- `AgentTuiConfig` — tui.json 配置 schema
- `AgentUiConfigReader` — 配置合并（CLI > env > tui.json > 默认）
- `HttpAgentConsoleAppRpc` — HTTP JSON-RPC 客户端
- `AgentConsoleRemoteEventBridge` — SSE 事件桥
- `AgentConsoleEventBridge` — 事件桥抽象

## Web console

Browser applications should import `mountAgentWebConsole` from `@tsdi/agent-ui/web-console`. The existing `@tsdi/agent-ui/web` entry remains API-compatible. Shell and terminal applications use `@tsdi/agent-ui/console`.

`build:web` 生成 `web/dist/agent-console.js`（~3.3MB esbuild bundle）。
该 bundle 可嵌入任意 web 页面或通过 gateway 静态托管。

```ts
import { mountAgentWebConsole } from '@tsdi/agent-ui/web-console';
mountAgentWebConsole(document.getElementById('app')!, {
  rpcUrl: 'http://localhost:3200/rpc',
  bearerToken: '...',
});
```

## Main exports

- `AgentConsoleComponent`
- `AgentConsoleSessionState`
- `AgentConsoleKeymap`
- `AgentConsolePanels`
- `AgentConsoleTheme`
- `AgentTuiConfig`
- `HttpAgentConsoleAppRpc`
- `AgentConsoleRemoteEventBridge`
- `mountAgentWebConsole`

## TUI commands (~70)

Core: `/help` `/status` `/model` `/tools` `/keymap` `/theme` `/settings` `/compact`
Session: `/resume` `/archive` `/fork` `/side` `/share` `/unshare` `/sections` `/threads`
Display: `/raw` `/thinking` `/timeline` `/display` `/statusline` `/title` `/export`
Input: `/editor` `/stash` `/apps` `/skills` `/mcp` `/plugins` `/voice`
Review: `/review` `/diff` `/approve`
Hooks: `/hooks` `/memories` `/fast` `/personality` `/debug-config` `/experimental`
Delegation: `/delegation` `/goal` `/usage`
System: `/ps` `/ide` `/feedback` `/keymap`

## License

This package is published under the Apache License 2.0.

Apache License 2.0 © [Houjun](https://github.com/zhouhoujun/)
