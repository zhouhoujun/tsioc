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
npm run build:web      # web site: dist/agent-console.js + assets.json
                       # (plus dist/agent-console.standalone.js for embedders)
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

Core: `/help` `/status` `/model` `/tools` `/keymap` `/theme` `/settings` (settings center; `/settings menu` for the classic tabs) `/compact`
Session: `/resume` `/archive` `/fork` `/side` `/share` `/unshare` `/sections` `/threads`
Display: `/raw` `/thinking` `/timeline` `/display` `/layout` `/statusline` `/title` `/export`
Transcript: `/activity` (alias `/jump`) jump to tools/reasoning/plan/diff/errors/final answer
Queue: `/queue [list|clear|remove <n>|edit <n>]` while a turn is running
Steer: `/steer [on|off]` makes Enter during a running turn interrupt it and start a new turn (persisted per workspace)
Input: `/editor` `/stash` `/apps` `/skills` `/mcp` `/plugins` `/voice`
Review: `/review` `/diff` `/approve`
Hooks: `/hooks` `/memories` `/fast` `/personality` `/debug-config` `/experimental`
Delegation: `/delegation` `/goal` `/usage`
System: `/ps` `/ide` `/feedback` `/keymap`

## Web build layout

`npm run build:web` emits a site instead of one monolithic script, mirroring
`packages/microservices/admin`:

- `web/dist/agent-console.js` — ESM entry loaded by `header.js` (initial
  2042 KiB / gzip 534 KiB after the TypeORM browser stub);
- `web/dist/assets.json` — manifest the service worker uses to precache the
  entry and other build assets for offline use;
- `web/dist/agent-console.standalone.js` — single-file IIFE bundle kept for the
  VS Code webview and Electron hosts, which load a classic `<script>`.

Cross-chunk code splitting is intentionally disabled for the entry: the shared
`@tsdi/ioc` graph contains ESM cycles (`ModuleRef extends Injector`), so esbuild
hoisting it into a shared chunk produces `Class extends value undefined` at
load. Lazy feature chunks stay tracked in the optimization plan until those
cycles are broken.

## Browser settings page

`tsdi-agent serve` (or `/web`) hosts the same console in the browser. The sidebar gear opens a
full-page settings screen instead of the terminal overlay: section buttons, a live search field,
and one card per setting with a switch (toggles) or an action button (picker/command rows). It reads
and writes the same schema as the TUI center (`AgentConsoleSettingsSchema`), so `/settings` and the
page never drift; toggles apply and persist immediately, `Esc`/`✕` close the page. The page is a
separate application over the shared session state, so the terminal component tree and its
composer/menu overlays are unchanged.

## Transcript behavior

- Viewport mode renders the newest `transcriptWindowMessages` (default 40) rows while following the latest message; scrolling up, focusing a message, opening detail, scrollback layout or an older error expands to the full transcript.
- `/display activity [low|medium|high]` sets activity verbosity. `medium` (default) folds finished tool/command/event runs into one expandable Activity row; `high` shows every step; `low` also folds settled reasoning.
- `/worktree enter [name]` switches the workspace to a managed worktree (picker when no name is given). `/worktree remove [name]` and `/worktree merge [name]` open a picker when no name is given; removal asks for confirmation (`--yes` skips it).
- `/activity` chooses the latest row of a category; the picker shows per-category counts.
- `/settings` opens the schema-driven settings center: sections (General, Model, Permissions, Agents,
  Integrations, Keybinds, Data & tooling), `up/down` move, `left/right` switch section, `enter` applies,
  `ctrl+r` restores a toggle default, typing filters every setting and `/settings <query>` deep-links.
  Rows show scope (workspace/global/session) and effect (immediate/next turn). `/settings menu` keeps the
  legacy tab menu.
- In transcript navigation (`PageUp` from an empty composer), `[` / `]` jump to the previous/next user prompt; `Shift+G` jumps to the last prompt.

## License

This package is published under the Apache License 2.0.

Apache License 2.0 © [Houjun](https://github.com/zhouhoujun/)
