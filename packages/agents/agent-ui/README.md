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

TUI 通知：`tui.json` 的 `attention.notifications`（或 `TSDI_AGENT_TUI_NOTIFICATIONS=1`）
在审批、待回答问题、turn 完成时发送 OSC 9 桌面通知；`attentionSound` 同时响铃。
通知由共享 `ReactiveEffect` 读取状态触发，不使用轮询或手写订阅。

Remote centers：`/remotes` 以只读方式汇总工作区 `settings.json` 中 `remotes`
（`{ name, url, token? }`）配置的其它 gateway 会话；`/remotes add <name> <url> [token]`
添加、`/remotes remove <name>` 删除、`/remotes <name>` 直接查看该 gateway 的会话快照。
token 只用于请求，不会出现在对话框或提示中。`/remotes allow-spawn <name>` 显式开启后，
`/remotes spawn <name> <session> <goal>` 可在远端创建 worker（需远端 workspace trust 与确认）。

导出/导入：`/export [json|jsonl|html] [sessionId] [path]`，`html` 生成独立只读页面
（全部内容转义、无脚本、跟随系统深浅色），默认写入 `.tsdi-agent/exports/`；
`/import <path>` 读取导出文件（JSON 或 JSONL）并在**新会话**中重建 transcript，
消息 id 由 gateway 重新生成（不会覆盖现有会话）。
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

Core: `/help` `/btw` `/status` `/model` `/tools` `/keymap` `/theme` `/settings` (settings center; `/settings menu` for the classic tabs) `/compact` `/highlights` (aliases `/whatsnew`)
Agents: `/agents` / `/archetype` switches the session profile; `shift+tab` cycles primary profiles; `/agents default [name]` reads or sets the default profile for new sessions
Session: `/resume` `/archive` `/delete` `/fork` `/side` `/share` `/unshare` `/import` `/msg` `/sections` `/threads`
Display: `/raw` `/thinking` `/timeline` `/display` `/layout` `/statusline` `/title` `/export`
Transcript: `/activity` (alias `/jump`) jump to tools/reasoning/plan/diff/errors/final answer
Queue: `/queue [list|manage|clear|remove <n>|edit <n>|move <n> <m>]` while a turn is running (`manage` opens an edit/move/remove panel)
Steer: `/steer [on|off]` makes Enter during a running turn interrupt it and start a new turn (persisted per workspace)
Input: `/editor` `/stash` `/apps` `/skills` `/mcp` `/plugins` `/voice`
Permissions: `/permissions level|status|inspect|rules|allow`; `inspect <tool> [resource]` explains profile gates and the last matching ordered rule; `rules` lists/adds/removes/reset the persisted `approvalRequireApproval` list; the approval panel's `p` action adds a durable project allow rule
Diagnostics: `/check <file...>` (alias `/lsp`) runs read-only LSP diagnostics; `/format <file...> [--check]` (alias `/fmt`) formats through the configured LSP server and writes back unless `--check`
Browser/PWA: while the page is hidden, approvals, pending questions and turn completion raise system notifications (permission is requested on the first click/keypress)
Side questions: `/btw <question>` answers from the current context without adding to the transcript
Mentions: `@path` attaches a file/dir hint; `@path#L20-L45` (or `#20-45`) attaches that line range
Tabs: `ctrl+tab` / `ctrl+shift+tab` cycle tabs (`alt+]` / `alt+[` in browsers); `ctrl+shift+t` (`alt+shift+t`) reopens the last closed tab
History: `/undo` reverts the latest prompt, messages and file changes (prompt returns to the composer); `/redo` re-applies the undone turn. Turn boundaries and file snapshots are persisted, so this survives a process restart. `/rewind` is the file-level selector.
Review: `/review` `/diff` `/approve`
Hooks: `/hooks` `/memories` `/fast` `/personality` `/debug-config` `/experimental`
Delegation: `/delegation` `/goal` `/usage` `/work` `/inbox`
System: `/ps` `/ide` `/feedback` `/keymap`

## Web build layout

`npm run build:web` emits a site instead of one monolithic script, mirroring
`packages/microservices/admin`:

- `web/dist/agent-console.js` — ESM entry loaded by `header.js` (initial
  2085.5 KiB / gzip 545.4 KiB after the TypeORM browser stub; the build fails if
  this regresses past the committed `web-size-baseline.json` budget);
- `web/dist/assets.json` — manifest the service worker uses to precache the
  entry and other build assets for offline use;
- `web/dist/agent-console.standalone.js` — single-file IIFE bundle kept for the
  VS Code webview and Electron hosts, which load a classic `<script>`.

Cross-chunk code splitting is intentionally disabled for the entry: the shared
`@tsdi/ioc` graph contains ESM cycles (`ModuleRef extends Injector`), so esbuild
hoisting it into a shared chunk produces `Class extends value undefined` at
load. Lazy feature chunks stay tracked in the optimization plan until those
cycles are broken.

## Browser settings popup

`tsdi-agent serve` (or `/web`) hosts the same console in the browser. `/settings` and the sidebar
gear open a modal popup: section buttons, a live search field, and one card per setting with a switch
(toggles) or an action button (picker/command rows). The card is mounted inside the themed console
root (a separate application over the shared session state), so it picks up the active theme and
never disturbs the terminal component tree or the composer/menu overlays. It reads and writes the
same schema as the TUI center (`AgentConsoleSettingsSchema`), so `/settings` and the popup never
drift; toggles apply and persist immediately, `Esc`/`✕` close it.

`/web` (alias `/pair`) is command output, not a dialog: the browser appends the one-time links to the
end of the transcript (copyable, scrolls with history). The terminal keeps the QR overlay because a
scannable code must fit in one visible screen.

## Transcript behavior

- Viewport mode renders the newest `transcriptWindowMessages` (default 40) rows while following the latest message; scrolling up, focusing a message, opening detail, scrollback layout or an older error expands to the full transcript.
- `/display activity [low|medium|high]` sets activity verbosity. `medium` (default) folds finished tool/command/event runs into one expandable Activity row; `high` shows every step; `low` also folds settled reasoning.
- `/worktree enter [name]` switches the workspace to a managed worktree (picker when no name is given). `/worktree remove [name]` and `/worktree merge [name]` open a picker when no name is given; removal asks for confirmation (`--yes` skips it).
- `/activity` chooses the latest row of a category; the picker shows per-category counts.
- `/settings` opens the schema-driven settings popup: sections (General, Model, Permissions, Agents,
  Integrations, Keybinds, Data & tooling), `up/down` move, `left/right` switch section, `enter` applies,
  `ctrl+r` restores a toggle default, typing filters every setting and `/settings <query>` deep-links.
  Rows show scope (workspace/global/session) and effect (immediate/next turn). `/settings menu` keeps the
  legacy tab menu.
- In transcript navigation (`PageUp` from an empty composer), `[` / `]` jump to the previous/next user prompt; `Shift+G` jumps to the last prompt.

## License

This package is published under the Apache License 2.0.

Apache License 2.0 © [Houjun](https://github.com/zhouhoujun/)
