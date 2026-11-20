# agent-ui 优缺点分析与优化方案（对标 opencode / Codex，2026-11-20）

> 范围：`packages/agents/agent-ui`（TUI + Web + VS Code/Desktop 宿主），必要时下沉到
> `packages/components`（common/console/html）。
> 相关既有方案：`docs/agent-management-plan.md`（Agent Center / Inbox / permissions v2）、
> `docs/settings-dialogs-reactivity-plan.md`、`docs/agent-ui-baseline.md`。本文不重复其内容，
> 只补“当前实现 → 竞品 → 下一步”的差距与优先级。

## 0. 结论摘要

agent-ui 已经是**成熟的单会话工作台 + 多端渲染层**：状态驱动、对话/工具/计划/审批/评审/回退、
TUI/Web/IDE/Desktop、schema 设置中心、AOT 模板预编译与站点化构建都已落地，验证体系（2232 用例 +
DOM/TUI/PTY/bench）也强于多数同类项目。

当前短板不在“功能数量”，而在四类：

1. **渲染生命周期与测试隔离的隐性耦合**：视图销毁时仍可能重跑已销毁视图的绑定，导致任意文件
   组合/并行分片出现 `line is not defined`、`{{value}}` 字面量；测试只能按“原序连续切片”分组。
2. **首屏体积与加载策略**：站点 initial JS 4223 KiB / gzip 1103 KiB，几乎没有特性级 `import()`，
   设置页、评审、诊断、语音、MCP/插件详情等低频界面都在入口。
3. **交互与 opencode/Codex 的差距**：LSP 诊断/格式化、OS 通知、ordered approval rules /
   shell 扫描器等仍缺；`!` shell mode、`@file#Lx-Ly`、tab 键盘切换、`/btw`、项目级 durable allow、
   会话级 `/undo`/`/redo`（恢复 prompt + 工作）已完成。
4. **大规模性能**：1k 消息 tab 切换 p50 76–115ms（state 43–67ms + paint 25–56ms），scrollback
   全量渲染，对话框开合仍需整屏重绘。

建议顺序：**P0 生命周期与可测性 → P1 首屏/包体 → P2 transcript 性能 → P3 交互对齐 → P4 门禁**。

## 1. 方法与基线（2026-11-20，当前 HEAD）

| 指标 | 现状 | 复跑 |
| --- | --- | --- |
| agent-ui 用例 | **2232 passing** | `cd packages/agents/agent-ui && npm run test` |
| 测试墙钟 | 5 组并行 **120–144s**；单进程 **209s**（低负载） | `AGENT_UI_TEST_SHARDS=1` 对照 |
| Web 站点构建 | initial 4223 KiB / gzip 1103 KiB；lazy 327 KiB / gzip 99 KiB（7 chunk） | `npm run build:web` |
| 源码体量 | `AgentConsoleComponent.ts` 1499 行（cap 1500）；47 个组件/指令 selector | `node scripts/check-source-size.mjs` |
| 命令面 | 103 个 `/` 命令；`ctrl+p` 命令面板；`ctrl+x` leader；F2 最近模型 | `AgentConsoleCommandDefinitions.ts` / `AgentConsoleKeymap.ts` |
| 响应式使用 | ~569 个 getter，3 个 `@Computed`，9 个手写 WeakMap 缓存，10 处 `batchReactiveUpdates` | grep 统计 |
| i18n | menu 键 en/zh 各 241，完全对齐 | `agent-ui.i18n.menu.*` |
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
  `/redo` 重做；无 turn checkpoint 的宿主回退到原文件级 undo/redo。turn 边界保存在进程内，
  重启后不再可撤销）；
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

- 无 `/highlights`/版本更新提示（opencode 有）；无桌面通知；`AgentTuiConfig` 的通知字段未接线。

## 4. 对标 opencode / Codex（2026-11）

参考：opencode TUI/Permissions 文档（2026-11）、Codex CLI 2026 approvals/sandbox 文档。

| 能力 | 我们 | opencode 2.3 | Codex 2026 | 判断 |
| --- | --- | --- | --- | --- |
| 命令面板 `ctrl+p` | ✅ | ✅（当前视图所有动作） | ◐（`/` 命令） | 保持；补“最近使用/动作搜索” |
| leader key `ctrl+x` | ✅ | ✅ | ❌ | 对齐 |
| session tabs | ✅ 鼠标点击 | ✅ Ctrl+Tab / Ctrl+Shift+Tab / Ctrl+Shift+T 恢复关闭 | ◐ | **补键盘循环/恢复** |
| Enter 运行中行为 | 默认排队；steer 需显式开启 | Enter steer；Ctrl+X Enter queue | queue/steer | 默认值需确认，补更清晰的状态提示 |
| `!` shell mode | ❌ | ✅ | ✅（shell 工具） | **补** |
| `@file#Lx-Ly` | ❌（仅 @file） | ✅ | ◐ | **补** |
| 会话 undo/redo（恢复 prompt） | ✅ `/undo` `/redo`（turn-first，文件级回退） | ✅ Ctrl+X U / R | ◐（rollout） | 已完成 |
| `/btw` 侧问 | ❌ | ✅ | ❌ | 低成本补 |
| `/highlights` 更新提示 | ❌ | ✅ | ◐ | 低成本补 |
| 模型切换 | ✅ `/model` + F2 最近 | ✅ Ctrl+X M / F2 | ✅ | 对齐 |
| Agent profiles | ◐ archetype（命令切换） | ✅ `/agents`、Shift+Tab | ✅ profiles | AMS P0 |
| 权限规则 | ◐ level + session allow | ✅ ordered rules（action/resource/effect，last match）、durable allow、scanner | ✅ sandbox × approval policy + auto-review | **高优先补齐**（AMS P1） |
| LSP 诊断 | ❌ | ✅ | ◐ | **补**（先只读诊断面板） |
| Formatter | ❌ | ✅ | ◐ | 补 hook（复用现有工具） |
| OS 通知 | ◐ 配置字段，无实现 | ✅ | ◐ | **补**（unfocused 时 approval/question/done） |
| MCP/plugins/skills/hooks | ✅ | ✅ | ✅ | 对齐 |
| 分享/导出 | ✅ `/share` `/export` | ✅ | ◐ | 对齐 |
| Desktop/Mobile | ✅ Desktop + PWA/配对 | ✅ Desktop/Mobile | ◐ cloud | 对齐 |
| Agent Center / Inbox | ◐ 命令+对话框 | ✅ Session Tree/最近 | ✅ agents command center | AMS P0 |
| Checkpoints/rewind | ✅ `/rewind` 文件级 + `/undo` 会话轮次 | ✅ undo/redo | ◐ rollout | 补持久化 turn 快照 |
| Worktree | ✅ `/worktree` | ✅ 每 session/subagent | ✅ | 对齐 |
| Remote/attach | ✅ serve/attach/pairing | ✅ server URL | ✅ `--remote` | 对齐 |

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

按影响排序（剩余）：
1. **durable approvals（基础版已完成）**：项目级 “always allow”（工具名 + 尾部 `*` 前缀，
   持久化到 settings、启动恢复、`/permissions allow` 列表/清理）；auto-deny 规则优先。
   仍缺：ordered action/resource/effect 规则与 shell 命令扫描器（未知命令保守 `ask`）。
2. **会话 undo/redo（基础版已完成）**：`/undo`/`/redo` 恢复 prompt、消息与文件改动；turn 边界
   目前保存在进程内，持久化 turn 快照与 Esc Esc 仍可后续补充。
3. **composer `!` shell mode** 与 **`@file#Lx-Ly`** 行范围引用。
4. **tab 键盘**：Ctrl+Tab / Ctrl+Shift+Tab / Ctrl+Shift+T 恢复关闭；关闭后焦点策略。
5. **LSP 诊断面板 + formatter hook**：先只读诊断（错误/警告跳转），再保存/完成后格式化。
6. **OS 通知**：unfocused 时 approval/question/done；复用 `AgentTuiConfig` 通知字段。
7. `/btw`、`/highlights` 低成本补齐。
8. Agent Center/Inbox 按 `docs/agent-management-plan.md` 的 P0/P1 落地（不重复设计）。

### P4 — 门禁与文档

- 把 initial gzip、切换 p50/p95、测试墙钟、分片内存写入 gate 预算与 baseline 文档；
- 更新 README（web 站点布局、命令/快捷键、settings 页面）；
- 真实 PTY + 浏览器手测清单；`git diff --check`、source-size、bench 全绿。

## 6. 预算与门禁（建议）

| 指标 | 当前 | 目标 | 门禁 |
| --- | --- | --- | --- |
| initial JS gzip | 1103 KiB | ≤700 → ≤500 KiB | build 报告 + 阈值 |
| lazy chunk 单文件 | 327 KiB 总量 | ≤150 KiB/个 | build 报告 |
| 1k tab 切换 p50/p95 | 76–115 / 91–150ms | ≤70 / ≤120ms | tab-switch spec |
| 对话框开合 p90 | ~20–32ms（state-only） | ≤40ms | 新增 micro-spec |
| agent-ui 测试墙钟 | 120–144s（5 组） | ≤120s | gate |
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
