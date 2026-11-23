# agent-ui 优缺点分析与优化方案（对标 opencode / Codex，2026-11-20）

> 范围：`packages/agents/agent-ui`（TUI + Web + VS Code/Desktop 宿主），必要时下沉到
> `packages/components`（common/console/html）。
> 相关既有方案：`docs/agent-management-plan.md`（Agent Center / Inbox / permissions v2）、
> `docs/settings-dialogs-reactivity-plan.md`、`docs/agent-ui-baseline.md`。本文不重复其内容，
> 只补“当前实现 → 竞品 → 下一步”的差距与优先级。

## 0. 结论摘要

agent-ui 已经是**成熟的单会话工作台 + 多端渲染层**：状态驱动、对话/工具/计划/审批/评审/回退、
TUI/Web/IDE/Desktop、schema 设置中心、AOT 模板预编译与站点化构建都已落地，验证体系（2352 用例 +
DOM/TUI/PTY/bench）也强于多数同类项目。

当前短板不在“功能数量”，而在四类：

1. **渲染生命周期与测试隔离的隐性耦合**：视图销毁时仍可能重跑已销毁视图的绑定，导致任意文件
   组合/并行分片出现 `line is not defined`、`{{value}}` 字面量；测试只能按“原序连续切片”分组。
2. **首屏体积与加载策略**：站点 initial JS 4223 KiB / gzip 1103 KiB，几乎没有特性级 `import()`，
   设置页、评审、诊断、语音、MCP/插件详情等低频界面都在入口。
3. **交互与 opencode/Codex 的差距**：OS 通知（TUI OSC 9 + Web）、LSP 诊断/formatter、
   ordered approval rules / shell 扫描器、`!` shell mode、`@file#Lx-Ly`、tab 键盘切换、`/btw`、
   项目级 durable allow、会话级 `/undo`/`/redo`、`/delete`、`/import`、`/export html`、
   per-session 权限、`/msg`、`/remotes`、`/work all` 已完成；剩余主要是远程 spawn/cancel 与
   Web teams 专页。
4. **大规模性能**：1k 消息 tab 切换 p50 78–84ms / p95 86–105ms（预算 120/200ms）；
   对话框开合实测 open p50 71ms / p90 82ms、close p90 39ms（计划目标 40ms 仍未达成，
   整屏 overlay 重绘是主成本，state 层 batch 实测无收益）。

建议顺序：**P0 生命周期与可测性 → P1 首屏/包体 → P2 transcript 性能 → P3 交互对齐 → P4 门禁**。

## 1. 方法与基线（2026-11-20，当前 HEAD）

| 指标 | 现状 | 复跑 |
| --- | --- | --- |
| agent-ui 用例 | **2352 passing** | `cd packages/agents/agent-ui && npm run test` |
| 测试墙钟 | 低负载 5 组 **120–144s**；本机高负载下常合并为 2 组（2.0–2.6min） | `AGENT_UI_TEST_SHARDS=1` 对照 |
| Web 站点构建 | initial **1830 KiB / gzip 474 KiB**（strict 700/150 通过） | `AGENT_UI_WEB_BUDGET_STRICT=1 npm run build:web` |
| 源码体量 | `AgentConsoleComponent.ts` 1499 行（cap 1500） | `node scripts/check-source-size.mjs` |
| 命令面 | 111 个 `/` 命令；`ctrl+p` 命令面板；`ctrl+x` leader；F2 最近模型 | `AgentConsoleCommandDefinitions.ts` / `AgentConsoleKeymap.ts` |
| 响应式使用 | ~569 个 getter，3 个 `@Computed`，9 个手写 WeakMap 缓存 | grep 统计 |
| i18n | menu/panel/notice 目录 en/zh 完全对齐（notice 869 键） | `i18n-locale-regression.spec.ts` |
| A11y | 3 个 accessibility/aria 专项 spec | `test/*accessib*` |

> 说明：本机负载波动大（并行跑 compiler/activities 测试时单进程可达 500s+），上述墙钟为低负载
> 区间；性能结论以“同 harness 交替 A/B”为准。

## 2. 优点（有代码/数据支撑）

| 维度 | 现状 | 证据 |
| --- | --- | --- |
| 响应式数据驱动 | 属性 set → effect → 绑定重跑；不手写订阅/刷新 | `components/src/reactive.ts`、`impl/effect.ts`；10 处 batch |
| Renderer-neutral | 业务在 agent-ui；TUI/Web/HTML 各自适配 | `components/common` / `components/console` / `components/html` |
| 多端一致 | TUI、Web、VS Code、Desktop 共用组件树与状态 | `agent-ui/console`、`agent-ui/web-console`、`agent-vscode`、`agent-desktop` |
| 对话框契约 | 与输入区同宽、贴输入框、`✕`/Esc/type-to-filter/超高裁剪 | `docs/dialog-matrix.md`、`test/dialog-regressions.spec.ts` |
| 设置中心 | schema 单一来源 + 分区/搜索/徽标/重置 + Web 全页 + RPC 持久化 | `AgentConsoleSettingsSchema.ts`、`web-settings-page.spec.ts` |
| AOT/站点构建 | 模板 IR + plan 预编译；站点入口 + hash chunk + `assets.json` + 自校验 | `build-web.ts`、`packages/compiler` |
| 命令/输入 | 103 命令、`/` 精选 + 全量搜索、命令面板、leader key、which-key | `AgentConsoleCommandRegistry.ts`、`AgentConsoleKeymap.ts` |
| 会话与协作 | tabs、projects/threads、delegation、background tasks、审批/问答 | `AgentConsoleSessionTabsSource.ts`、`AgentConsoleInbox.ts`、`AgentConsoleWork.ts` |
| 回退与安全 | `/rewind`、git snapshots、security level + sandbox + workspace trust | `AgentConsoleRewind.ts`、`AgentConsoleSettingsWorkspaceTrust.ts` |
| 验证体系 | 2232 用例、DOM/TUI gate、PTY、bench、source-size、WAL/DB 门禁 | `scripts/agents-gate.sh`、`test/` |

## 3. 缺点与风险（按优先级）

### P0 — 渲染生命周期与测试隔离

- **销毁路径没有“所属视图”判定**：`detachNodes` 会沿视图 rootNodes 遍历到被移动/投影的节点；
  以 `parentNode` 判断是否仍在树上并不可靠。实测（分片实验）会出现：
  - 已销毁 v-for 行的绑定在 teardown 写入时重跑 → `line is not defined` / `token is not defined`；
  - 仍在使用的绑定被提前销毁 → `{{value}}` 字面量、v-for 空行、markdown surface undefined。
- **后果**：测试只能按“原序连续切片”分组；任意顺序/随机分片/未来懒加载路由都可能触发。
- **证据**：本轮 `unit.ts` 分片实验（随机均衡 4 组 → 10 个失败；连续切片 5 组 → 全绿）。
- **方向**：ref 记录 owner view；`EmbeddedViewRefImpl.destroy()` 先 `scope.dispose()` 再 detach；
  投影/移动节点不销毁；补“销毁期不重跑绑定”的单测与随机顺序门禁。

### P1 — 首屏体积与加载

- 站点 initial JS **4223 KiB / gzip 1103 KiB**，仅 7 个 lazy chunk（327 KiB）；入口没有特性级
  `import()`，设置页（224 行）、评审/差异、诊断、语音、MCP/插件详情、Provider wizard 都在首屏。
- AOT/ESM splitting 只把 `components` 的 renderer 变体拆出去，agent-ui 自身没有懒加载边界。
- 影响：移动端/PWA 首次加载与冷启动；与 opencode 的“按需界面”相比偏重。

### P1 — Transcript 性能与长会话

- 1k 消息切换 p50 76–115ms；state 43–67ms + paint 25–56ms；对话框开合在长会话仍需整屏重绘。
- scrollback（native）仍全量渲染消息行；viewport 只窗口化可见行，但消息投影/`messageItems` 与
  样式解析在大列表下成本高。
- 样式解析（`resolveConsoleStyleSheet`/`getStyleMap`/`mergeStyles`/`applyCssAnimations`）仍是
  paint 的主要成本之一；此前“快速路径”A/B 无收益，需要按 stylesheet 版本 + 元素签名做缓存。

### P1 — 与 opencode / Codex 的交互差距

见第 4 节对标表。最影响日常使用的几项：

- composer `!` shell mode（opencode）；
- `@path#Lx-Ly` 行范围引用（opencode）；
- 会话级 undo/redo（已实现：`/undo` 先回滚最近一轮的 prompt/消息/文件改动并把 prompt 放回输入框，
  `/redo` 重做；无 turn checkpoint 的宿主回退到原文件级 undo/redo。turn 边界与文件快照已
  持久化（`AgentTurnHistoryEntity`），进程重启后仍可撤销/重做）；
- durable “always allow” 项目级规则（已实现：审批面板 `p`、`/permissions allow [<tool>|clear]`，
  持久化 `approvalAllowRules`，auto-deny 始终优先）；
- OS 通知（配置字段已有，未找到实现调用）；
- tab 键盘循环/恢复关闭（当前仅点击）；
- LSP 诊断、formatter hook（Codex/opencode 的日常反馈面）。

### P2 — 架构与维护

- `AgentConsoleComponent.ts` 1499 行已贴 cap；47 个组件/指令 selector，新增能力仍易堆进 facade
  （命令注册表已缓解，但 Turn/Input/消息渲染仍集中）。
- 569 个 getter 对 3 个 `@Computed`、9 个手写 WeakMap：派生值缓存边界分散，难以判断失效条件。
- 测试 2232 用例、5 组并行 1.2GB/worker；内存紧张时回退单进程 209s+，CI 冷启动仍慢。
- Agent Center/Inbox 仍是命令 + 对话框（AMS 计划的 P0/P1 未完全落地）。

### P2 — 发布与诊断

- 无桌面通知；`AgentTuiConfig` 的通知字段未接线。

## 4. 对标 opencode / Codex（2026-11）

参考：opencode TUI/Permissions 文档（2026-11）、Codex CLI 2026 approvals/sandbox 文档。

| 能力 | 我们 | opencode 2.3 | Codex 2026 | 判断 |
| --- | --- | --- | --- | --- |
| 命令面板 `ctrl+p` | ✅ 全量命令目录 + 最近使用 + 模糊搜索 | ✅（当前视图所有动作） | ◐（`/` 命令） | 对齐（非命令动作仍走各自入口） |
| leader key `ctrl+x` | ✅ | ✅ | ❌ | 对齐 |
| session tabs | ✅ 鼠标 + Ctrl+Tab / Ctrl+Shift+Tab / Ctrl+Shift+T | ✅ 同左 | ◐ | 对齐 |
| Enter 运行中行为 | 默认排队；`Ctrl+X Enter` 插到队首；steer 需显式开启 | Enter steer；Ctrl+X Enter queue | queue/steer | 已补优先级；默认 steer 仍待确认 |
| `!` shell mode | ✅ | ✅ | ✅（shell 工具） | 对齐 |
| `@file#Lx-Ly` | ✅ | ✅ | ◐ | 对齐 |
| 会话 undo/redo（恢复 prompt） | ✅ `/undo` `/redo`（turn-first，文件级回退） | ✅ Ctrl+X U / R | ◐（rollout） | 已完成 |
| `/btw` 侧问 | ✅ | ✅ | ❌ | 对齐 |
| `/highlights` 更新提示 | ✅ `/highlights`（升级后自动一次，可关闭） | ✅ | ◐ | 对齐 |
| 模型切换 | ✅ `/model` + F2 最近 | ✅ Ctrl+X M / F2 | ✅ | 对齐 |
| Agent profiles | ✅ `/agents` 选择 + `shift+tab` 循环（跳过 subagent） | ✅ `/agents`、Shift+Tab | ✅ profiles | 对齐 |
| 权限规则 | ✅ ordered rules（action/resource，last match）+ durable allow | ✅ ordered rules（action/resource/effect，last match）、durable allow、scanner | ✅ sandbox × approval policy + auto-review | 对齐（scanner opt-in） |
| LSP 诊断 | ✅ `/check [paths]` 只读诊断面板（`/lsp` 别名） | ✅ | ◐ | 对齐 |
| Formatter | ✅ `/format [paths] [--check]`（LSP `textDocument/formatting`） | ✅ | ◐ | 对齐 |
| OS 通知 | ✅ TUI OSC 9 + Web Notification | ✅ | ◐ | 对齐（TUI 仍需终端支持 OSC 9） |
| MCP/plugins/skills/hooks | ✅ | ✅ | ✅ | 对齐 |
| 分享/导出 | ✅ `/share` `/export json|jsonl|html` `/import` | ✅ | ◐ | 对齐 |
| Desktop/Mobile | ✅ Desktop + PWA/配对 | ✅ Desktop/Mobile | ◐ cloud | 对齐 |
| Agent Center / Inbox | ◐ `/work`、`/work all`（本地+远程只读）、`/inbox`、`/remotes` | ✅ Session Tree/最近 | ✅ agents command center | 远程写操作待补 |
| Cross-session messaging | ◐ `/msg [--wake]`、`/msg list`（opt-in `crossSessionMessages`） | ✅（实验） | ✅（实验） | v0 已落地 |
| Checkpoints/rewind | ✅ `/rewind` 文件级 + `/undo` 会话轮次（turn/文件历史已持久化） | ✅ undo/redo | ◐ rollout | 对齐 |
| Worktree | ✅ `/worktree` | ✅ 每 session/subagent | ✅ | 对齐 |
| Remote/attach | ✅ serve/attach/pairing + `/remotes` + `/work all` | ✅ server URL | ✅ `--remote` | 对齐（远程 spawn/cancel 待补） |

## 5. 优化方案（P0 → P4）

### P0 — 渲染生命周期与测试隔离（已实施 2026-11-20）

**已完成（阶段 1）**：
- `EmbeddedViewRefImpl.destroy()` 先 dispose 绑定再 detach 节点；
  `ComponentRefImpl.destroy()` 在调用实例 `onDestroy()` 之前先 `disposeBindings()`，
  teardown 写入不再重跑将销毁视图的绑定。
- 新增 `test/view-destroy-order.spec.ts`（绑定不得在 teardown 重跑）。
- 验证：随机文件顺序 3 组（两个种子）全绿，2232 passing，日志 0 条
  `is not defined` / `{{value}}`。
- 仍未做：ref 的 owner-view token（当前 `detachNodes` 的 parentNode 守卫已满足随机分片；
  owner token 作为后续硬化项，配合懒加载/任意分片再收口）。

剩余工作项（阶段 2）：
1. ref 增加 owner-view 元数据（创建时记录 `viewRef`），`detachNodes` 只销毁本视图拥有的 ref；
   投影/移动节点跳过。
2. `EmbeddedViewRefImpl.destroy()` 先 `scope.dispose()`，再 `detachNodes`，最后销毁回调。
3. 为销毁期写入加保护：`activeEffects` 中已销毁视图的绑定不得执行（可复用一个 `destroyed` 标记）。
4. 测试：随机文件顺序 × N；任意 1–5 组分片；断言日志中无 `is not defined`；现有 2232 全绿。

验收：任意分片/顺序全绿；DOM/TUI/PTY gate 不回退；`npm run test` 可分片配置不再有限制。

风险：投影/查询索引/内容投影回归（components ×4 + agent-ui 全套 + bench 门禁）。

### P1 — 首屏与包体（阶段 1 已实施 2026-11-20）

**已完成（阶段 1）**：
- 定位到初始包 2MB+ 的真实来源：`AgentModule → TypeORM → cli-highlight →
  highlight.js 全语言 + parse5`，以及全部 SQL driver；浏览器控制台走 RPC，
  从不打开本地库。`build-web.ts` 增加 `typeorm` 浏览器 stub（装饰器/operators/
  DataSource/Repository 空实现）。
- 初始 JS：**4220.6 KiB → 2041.5 KiB（gzip 1101.7 → 533.8 KiB）**，达到 ≤700 KiB
  阶段目标；worker/standalone 保持。
- 关闭入口的跨 chunk `splitting`：实测 `@tsdi/ioc` 共享 chunk 存在 ESM 循环
  （`ModuleRef extends Injector`），加载时报 `Class extends value undefined`。
  站点仍输出 `dist/agent-console.js` + `assets.json` + worker + standalone；
  真正的特性级 lazy chunk 需要先拆 ioc 循环（纳入 P0 阶段 2 / P1 后续）。
- 已知验证缺口：本机 Chromium 缺系统库，无法跑真实页面 mount；Node ESM 已确认
  bundle 可加载（stub 前后 mount 在 JSDOM 下同样报 DI 错误，非本次引入）。真实
  浏览器回归纳入 P4。

剩余工作项（阶段 2）：
1. 入口只保留 console shell + 当前会话；设置页、评审/差异、诊断、语音、MCP/插件详情、
   Provider wizard、Markdown 渲染 worker 改为 `import()`；命令/面板首次打开时加载并缓存。
2. 关键路径预取（hover/输入 `/` 时预取设置与评审 chunk）；失败降级为同步占位。
3. Service worker 分层：shell + 入口 eagerly；chunk 按 manifest 安装预缓存（已支持）。
4. 预算：initial gzip **≤700 KiB（阶段 1）→ ≤500 KiB（目标）**；lazy 单 chunk ≤150 KiB；
   `build:web` 已有 initial/lazy 报告与自校验，加入 gate 阈值。

验收：首屏 initial JS/gzip 达标；站点构建自校验通过；TUI 不受影响；Web/Desktop/VS Code 回归。

### P2 — Transcript 性能（约 1 周）

工作项：
1. scrollback 行级虚拟化/高度缓存（只渲染可视窗口 + 前后预取），保留展开/选择/滚动锚点。
2. 样式解析缓存（stylesheet 版本 + 元素 class/style 签名）；避免每帧重复 `var()` 解析。
3. 对话框开合只重绘 overlay band；长会话下 menu 打开不重跑整屏 transcript 绑定。
4. 消息投影缓存边界统一到 derived 模块（现有 WeakMap 合拢），补命中/失效测试。

验收（1k 消息，同 harness A/B）：切换 p50 ≤70ms、p95 ≤120ms；对话框开合 p90 ≤40ms；
paint ≤25ms；`tab-switch` / `long-session` / DOM/TUI gate 不回退。

### P3 — 交互与生态对齐（进行中）

**已完成（2026-11-20）**：
- session tab 键盘导航：`Ctrl+Tab` / `Ctrl+Shift+Tab` 循环可见 tab；
  `Ctrl+Shift+T` 恢复最近关闭的 tab；浏览器保留快捷键冲突时可用
  `Alt+]` / `Alt+[` / `Alt+Shift+T`。终端解码支持 xterm/kitty 的
  Ctrl(+Shift)+Tab 序列；关闭栈保留最近 10 个。
- 测试：`session-tab-keys.spec.ts` + `session-tabs.spec.ts` 整合用例。
- Web/PWA 系统通知：页面隐藏时，审批、待回答问题、turn 完成/失败通过
  Notification API 提醒（首次点击/按键时申请权限；页面可见时不打扰）。
  测试：`web-attention.spec.ts`。
- `/btw <question>` 侧问：复用当前会话上下文调用模型，答案只在只读浮层显示，
  不写入 transcript/历史；本地 runtime 直接调用，web/attach 走
  `session.side_question` RPC。测试：`side-question.spec.ts` + gateway RPC 用例。
- `@file#Lx-Ly` 行范围引用：支持 `#L20-L45` / `#20-45` / 单行 `#L20`；
  只把选中行（最多 400 行）注入 `[Mention Context]`，suggestion 查询忽略
  range 后缀；超出 EOF 时回退为路径提示。测试：`workspace-mentions-range.spec.ts`。

已完成（本轮及最近提交）：
- durable 项目级 allow（`p` / `/permissions allow`，启动恢复、Web/attach 同步）；
- opt-in shell scanner（`readOnlyShell` 设置行 + `/permissions scanner on|off`）：
  只读命令跳过审批，管道/重定向/命令替换/未知命令保守询问；
- ordered approval rules：`action: ask|allow|deny`、`resource`（path/command/url，含 `*`）、
  legacy `mode`，**last match wins**，auto-deny 优先于项目 allow；`DefaultApprovalStrategy`
  已拆到 `tools/ApprovalStrategy.ts`；
- 会话级 `/undo`/`/redo`（prompt + 消息 + 文件改动，无 checkpoint 时回退文件级）；
- shell 命令扫描器（opt-in `policy.approval.readOnlyShell`）：只读命令跳过审批，歧义语法与
  未知命令仍 `ask`，显式对象规则优先；设置页与 `settings.ui.set` 持久化同一开关；
- LSP 只读诊断面板 `/check <file...>`（`/lsp` 别名）：经 `tools.invoke` 调用
  `lsp_diagnostics`，TUI/gateway 共用；错误/警告按 `file:line:col` 展示；
- LSP formatter hook `/format <file...> [--check]`（`/fmt` 别名）：新增 `lsp_format`
  工具，默认写回、`--check` 预览，写入走 `fs` 审批类别与 workspace trust；
- `/highlights` 发布说明浮层（`/whatsnew` 别名）：升级后按版本自动展示一次，设置页可关闭；
- `ctrl+p` 命令面板改为全量非隐藏命令目录（不再局限于精选 `/` 菜单），空查询时把最近执行命令置顶；
- `shift+tab` 循环当前会话的可选 agent profile（跳过 subagent），与 `/archetype next` 同一路径；
- `/permissions rules` 图形面板支持规则上移/下移、修改动作（string 规则可转为对象规则）、
  删除与重置，顺序即 last-match 执行顺序；
- turn undo/redo 持久化：`AgentTurnHistoryEntity` 保存 turn 边界、redo 消息与文件快照栈，
  `TurnHistoryController` 懒加载/串行写回，重启后 `/undo`、`/redo` 与文件级撤销仍可用；
- `!` shell mode、`@file#Lx-Ly`、tab 键盘循环/恢复、`/btw`、Web/PWA 通知、设置页。

按影响排序（未完成计划）：
1. **Agent Center/Inbox 后续**：按 `docs/agent-management-plan.md` 继续 P1（background worker
   worktree 复用选择、permissions 图形表单/per-session override）与 P2（queue/steer 优先键）。
   worker report/open-attach 已完成。
   说明：Esc Esc 已用于“编辑上一条用户消息”（`AgentConsoleEditModeHandlers`），不再叠加撤销手势，
   撤销统一走 `/undo`。
2. **P4 收尾**：README/CHANGELOG/`docs/manual-test-checklist.md` 已完成；`build:web` 已写入
   initial raw/gzip 回归预算（`web-size-baseline.json`，可 `AGENT_UI_WEB_BUDGET_STRICT=1`
   强制 700/150 KiB 目标）；1k 切换预算已提供 `AGENT_UI_SWITCH_BUDGET=1`
   （p50 ≤120ms / p95 ≤200ms）；测试墙钟提供 `AGENT_UI_TEST_WALL_BUDGET=<seconds>`
   （超时失败）；分片内存阈值仍待做。
   `git diff --check`、source-size、bench 全绿。

### P4 — 门禁与文档

- 把 initial gzip、切换 p50/p95、测试墙钟、分片内存写入 gate 预算与 baseline 文档
  （initial gzip 已落地：`build:web` + `web-size-baseline.json`，超 3% 失败；strict 目标 700/150 KiB）；
- 更新 README（web 站点布局、命令/快捷键、settings 页面）；
- 真实 PTY + 浏览器手测清单；`git diff --check`、source-size、bench 全绿。

## 6. 预算与门禁（建议）

| 指标 | 当前（2026-11-22） | 目标 | 门禁 |
| --- | --- | --- | --- |
| initial JS gzip | **474 KiB** | ≤500 KiB | `AGENT_UI_WEB_BUDGET_STRICT=1 build:web`（≤700 硬门禁） |
| lazy chunk 单文件 | 通过 | ≤150 KiB/个 | build 报告 |
| 1k tab 切换 p50/p95 | **78–84 / 86–105ms** | ≤70 / ≤120ms | `AGENT_UI_SWITCH_BUDGET=1` |
| 对话框开合 p90 | **open 82ms / close 39ms** | ≤40ms | `AGENT_UI_DIALOG_BUDGET=1`（当前回归门禁 120ms） |
| agent-ui 测试墙钟 | 120–156s（2–5 组，视内存） | ≤120s | `AGENT_UI_TEST_WALL_BUDGET=<s>` |
| 分片峰值内存 | 单进程 ~1844 MiB | 主机预算内 | `AGENT_UI_TEST_MEMORY_BUDGET_MB=<MiB>` |
| source-size | OK（Component 1499） | 只降不升 | `check-source-size.mjs` |

## 7. 非目标与取舍

- 不删除/降级现有功能；不为了体积关闭动画、折叠、审批或可访问性。
- 不重复 AMS 计划（Agent Center/Inbox 已有专门方案）。
- 不在没有真实路径 A/B 的情况下宣布性能优化有效（本项目已多次因“加缓存/加判断”回退）。
- 分片只按**原序连续切片**；在 P0 完成前不开放随机/细粒度分片。
- Enter 默认 steer/queue 属于产品默认值，需确认后再改。

## 8. 建议先做的 3 件事

1. **P0 生命周期**：这是后续懒加载、任意分片、CI 并行与 watch 模式的前提。
2. **P1 首屏第一刀**：settings/review/diagnostics/voice 动态 import，先把 gzip 压到 700 KiB 以内。
3. **P3 低成本高频交互**：tab 键盘循环/恢复、`!` shell mode、`/btw`（opencode 用户高频）。

## 9. 待确认

1. Enter 运行中默认保持“排队”还是改为“steer”（opencode 默认 steer）？
2. durable allow 是否允许写入项目级配置（安全默认 `ask`，deny 永远优先）？
3. LSP 集成范围：内置只读诊断，还是复用编辑器/外部 server？
4. 首屏目标是否接受 500 KiB gzip（移动端优先）？
5. Agent Center/Inbox 是否作为下一阶段主线（与 P0–P2 并行）？

## 10. 2026-11-22 进度快照

本轮（`7.tui`，`4f7b61410`…`d6382919e` 等提交）已完成：

- P0：视图销毁先 dispose 绑定、随机分片全绿（阶段 1）；owner-view token 仍为后续硬化项。
- P1：浏览器构建不再包含 TypeORM；initial gzip **474 KiB**（strict 预算通过）。
- P2：`/queue` 对齐（`Ctrl+X Enter` 队首、manage/clear）；1k 切换与对话框预算 spec 已落地；
  dialog p90 40ms 目标未达，已记录成因（整屏 overlay 重绘，state batch 无收益）。
- P3：TUI OSC 9 通知、fuzzy 菜单过滤、`/sessions` 时间分组、`/delete`、`/import`、
  `/export html`、`/remotes`、`/work remote|all`、`/msg [--wake]|list`（opt-in）、
  per-session 权限、权限规则图形化新增。
- P4：`AGENT_UI_TEST_MEMORY_BUDGET_MB`、`AGENT_UI_DIALOG_BUDGET`、web 预算基线。

仍待完成：

1. 远程 gateway 的多端能力协商（spawn/cancel 已落地，授权为 per-center `allowSpawn` + 确认；
   更细粒度权限与远端审批 UI 仍待补）。
2. Web teams 专页（跨会话消息的浏览器视图）。
3. P2 dialog overlay 隔离（在现有“禁止脏节点追踪跳过面板”约束下需要新的安全方案）。
4. P0 owner-view token（随机顺序门禁已提供 `AGENT_UI_TEST_RANDOM_SEED`，seed 7/99 全绿；
   owner-view token 仍未实现，等待投影/嵌套视图的失败复现）。

### dialog overlay 实验记录（2026-11-22，已回退）

尝试把同一帧内多个 dirty origin 合并（仅当它们解析到同一个 top-level panel 时），
期望 select 面板内的 `select-core` / `select-rows` 更新复用第一次 origin，从而让
transcript 面板命中缓存。实测 dialog 纹理未出现在 `lastRenderedLines`（可见 select 面板
被当作未变而复用了隐藏缓存），属于典型的陈旧界面，已回退并保留“多 origin → 全量重绘”。
结论：40ms 目标需要在 overlay 渲染层做更根本的隔离，而不是在现有 panel cache 上合并 origin。
