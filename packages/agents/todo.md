# Agents 后续打磨清单

## 功能总纲

主干能力已齐（2026-08 对比 Codex / opencode 口径）：turn 循环（run/streaming）、多模型适配（Echo/Anthropic/OpenAI/Routed + profiles + complexity 路由 + worker-class 路由 + 命令级 profile）、prompt cache 支持、上下文压缩 + turn diagnostics（store/aggregate/trend）、补偿/回滚（LIFO + 审计 + 文件快照 undo/redo）、审批流（自动评审 / granular 类别 + 网络目的地放行 / expiry/FIFO/防御清扫/审计落库）、sandbox 策略矩阵（capability 级 + OS 级 sandbox-exec + 会话级运行时切换）、40+ 工具组（files/git/terminal/browser 轻量 + playwright/web/http/memory/skills/mcp/scheduling/cron/kanban/knowledge/media/audio/capture/code-execution/process/security/communication/sessions/project/data/backup/pipeline/poll/approval/ai-cli/lsp/ssh 等）、MCP stdio + Streamable HTTP client + OAuth + server tool、skills 系统（本地注册表/目录/turn interceptor/激活提示）、编排（parallel_spawn/spawn_agent/llm_task/coding_task + delegation graph tree/lineage + worker 自动分类 + thread 状态 + thread 级工件聚合 + 子任务加密 + per-agent 权限）、可观测（audit/stats/compaction-history/summary-quality/turn-diagnostics/delegation/usage + evidence-ledger/verification-gate/weakness-miner/harness-profile 循证螺旋 + dashboard digests）、gateway（JSON-RPC + HTTP + SSE + owner 鉴权 + InMemory/TypeOrm 持久化）、console TUI（~15 面板 / ~30 命令 / vim mode / review hunk 折叠 + side-by-side / ssh 远程 shell / 实时双向语音 / 主题 / workspace mentions）、CLI（chat/run 一次性/rpc-stdio/tools list/doctor/completion/update + fast/strong 自适应配置）、多代理 v2（per-spawn profile/reasoning/concurrency + 子任务加密）。

## 剩余（远期，未排期）

- **桌面/IDE/Web 多面**（opencode desktop + IDE 扩展 + web console）——需新 UI 工程，暂不排期。
- **GitHub/GitLab 应用集成**（Codex GitHub Action、opencode GitHub 集成、隐藏自动化 agent）——依赖平台 OAuth。

## agent-ui TUI 显示性能优化（P62–P66，已排期）

### 架构约束（2026-08 用户确认，必须遵守）

1. **Components 是响应式框架（最高优先级）**：数据变化驱动界面更新，**不需要手动触发更新，不需要定时刷新**。
   - 更新链路：属性 set → `effect.trigger` → 绑定重跑 → `textContent` setter（值短路，`console.ts:246`）→ `notifyChanged` → `CHANGE_EVENT` 冒泡到 root → `requestRender`（微任务合并）。
   - **禁止在组件层用 `setInterval`/`setTimeout` 主动刷新界面**；渲染完全由真实数据变化驱动，**无数据变化即无渲染**。
   - 动画必须"时间派生"：getter 内由 `Date.now()` 计算（如 Working 面板的 `dotFrame`），动画帧随真实数据驱动的渲染自然推进，不额外驱动渲染。
   - 推论（P65/P66 必须遵守）：批量收口只合并"真实数据变化"触发的通知，**不得引入任何定时器/手动刷新**；P66 基准必须断言"固定状态 + 时间推进 → 零渲染"，禁止用测试手段手动触发渲染来模拟动画帧。
2. **跨平台 + 无 node API（agent-ui 需同时运行于浏览器与命令行窗口 TUI）**：
   - 所有渲染/动画改动必须在 `@tsdi/components`/`@tsdi/components/console` 通用层落地，不得只在 agent-ui 侧 hack；浏览器端走 `ConsoleRenderer`（DOM），命令行端走 `TuiRenderer` + `TuiTerminalSurface`，两平台共用同一实现。
   - **`@tsdi/components/console` 与 `@tsdi/agent` 库不得直接引用 node API**（`node:` 模块、`process`、`Buffer`、`fs`、`__dirname` 等）；需要环境信息时用全局守卫（如 `(globalThis as { process?: ... }).process`）访问。

### 问题总结（2026-08，Working 面板 + 点动画改动后复盘）

渲染链路：组件实例经 `reactive()` 代理（`components/src/reactive.ts`）→ 属性 set → `effect.trigger` → 绑定 effect 重跑 → `textContent` setter → `notifyChanged()`（`components/console/src/console.ts:228`）→ `CHANGE_EVENT` 冒泡到 root → `TuiTerminalSurface`（`components/console/src/terminal.ts`）→ `requestRender()`（微任务合并）→ **全量 `renderToTuiLayout` 重算整棵组件树（~15 面板）**。

性能瓶颈定位：

1. **违反架构约束 2**：`AgentConsolePanels.ts` WorkingPanel 的 `onAfterViewInit` 用 `setInterval(150ms)` 推进 `frame`——这是全 TUI 唯一自带定时器/主动刷新面板（其余面板只在状态变化时渲染）。`AgentConsoleComponent` 无渲染循环；`terminal.ts:308/329` 的 `pollTimer` 是输入轮询（20ms），与显示无关。
2. **每次动画帧 = 一次全树重布局**：150ms 帧只影响 `dotFrame` 一个字符，却触发整树 `renderToTuiLayout` 重算（getter 重求值、样式解析、文本拟合全量重跑）。
3. **布局层无缓存**：输出层已有 diff（`renderKey = inline:width:lines.join('\n')`、`stablePrefixRows`、行级差分，`renderPrimaryTerminalScreen`），但布局计算层全量无缓存。
4. **`elapsedLabel` 依赖 `Date.now()`**：每次渲染值都变，working 行永不成为稳定前缀，输出层 diff 优化被削弱。
5. **`AgentConsoleSessionState` 有 batch 机制（`notificationBatchDepth`/`notificationPending`）但多个 setter 仍各自触发**；高频 getter（`elapsedLabel`）未走框架缓存（`reactive.ts` 的 `set` trap 值比较短路 + `@Computed` 派生缓存，见 P65）。

对比参照（仅作动画节流经验参考，不引入其渲染循环模型）：

- **Codex（Rust/ratatui）**：单一渲染循环，状态 diff 只重绘变化区域；spinner 用低频 tick。
- **opencode（Go/Bubble Tea）**：事件驱动，`tea.Tick` 100–250ms 低频驱动动画，`View` 全量构建 + lipgloss diff 输出。

收敛结论：**在本框架内不做 tick 循环**——点动画改为时间派生 getter（渲染时刻由 `Date.now()` 取帧），配合布局层 diff 缓存，使"动画帧"不额外驱动渲染；无数据变化时界面完全静止，数据变化时按数据频率渲染。

### 排期条目

- **P62 点动画改时间派生，移除 setInterval**（`AgentConsolePanels.ts`）：删除 `frame`/`frameTimer`/`onAfterViewInit`/`onDestroy`/`implements AfterViewInit, OnDestroy`；`dotFrame` getter 改为 `WORKING_DOT_FRAMES[Math.floor(Date.now() / 300) % WORKING_DOT_FRAMES.length]`（`shouldShow` false 返回 ''）。预期：无定时器、零主动渲染，动画帧随真实数据驱动的渲染自然推进。（✅ 已实施，工作区未提交）
- **~~P63 布局层缓存~~ 已回退（2026-08，违反架构约束 1）**：尝试用 `notifyChanged` 携带 `source` + `TuiRenderer` 面板级 WeakMap 缓存（changedSource 不在面板子树内则复用），`console.spec.ts` 4 个新测试全过，但 agent-ui `console-renderer.spec.ts` 2 个既有测试回归（`opensTruncatedMessageDetailFromTerminalMouseClick`、`terminalSurfaceUpdatesSharedState`）。根因：响应式更新会**替换节点**（旧节点渲染前已离树，parentNode 链断裂 → 误判"面板未变"）且**同帧批量变更**（多个 setter 只捕获最后源 → 其他面板复用陈旧缓存），缓存输出陈旧界面。结论：布局层缓存与"数据变化驱动界面更新"契约冲突，整体回退（`console.ts`/`tui.ts`/`terminal.ts`/`console.spec.ts` 均还原）；性能优化只保留 P62/P64/P65（消除主动渲染 + 稳定输出 diff），不再做面板级布局复用。教训已写入 `packages/agents/AGENT.md`。
- **P64 `elapsedLabel` 稳定化**（`AgentConsolePanels.ts`）：改为按秒边界取整（`lastElapsedSeconds` 缓存 + 仅在整秒变化时更新文本），使 working 行在秒内成为稳定前缀，恢复输出 diff 命中。（✅ 已实施，工作区未提交）
- **P65 `SessionState` getter/setter 改造（2026-08 用户修正：Proxy 驱动，不手写 getter/setter 短路与缓存）**：框架 `reactive()`（`components/src/reactive.ts`）本身就是 Proxy 驱动——组件实例经 `reactive()` 代理后，读取 `this.state` 时状态对象被嵌套代理（`canReactive(res) → reactive(res, effect)`，`reactive.ts:119-121`），因此：
  - **setter 不再手写"值未变不触发"短路**：`set` trap 已内置值比较（`if (oldValue !== value) effect.trigger(target, key)`，`reactive.ts:137`），每次赋值经 Proxy 按 key 精确触发绑定 effect，随后 `textContent` setter 值短路 + `requestRender` 微任务合并，渲染次数与状态变化次数自然解耦。
  - **高频/派生 getter 改用框架 `@Computed(deps)` 装饰器**（`decorators/computed.ts`，`handleComputedProperty` 依赖变更自动清缓存，`reactive.ts:183-244`），不手写 `_lastXxx` 缓存字段。
  - **`subscribe()` 保留、`notify()` 移除**：`subscribe()` 是 `reactive.ts:34` `canReactive` 判定（`hasReactiveFlag && !isSubscribable → false`）与 `bindSubscribableEffect`（`reactive.ts:65-80`）的契约前提，保留；setter 内 ~130 处 `this.notify()` 已全部移除（2026-08 用户修正：**走响应式框架**）——组件实例经 `reactive()` 代理后，`bindState(this.sessionState)` 传入的是嵌套代理（`sessionState` getter → 组件代理 get trap → `canReactive(res) → reactive(res, effect)`），EventBridge 通过代理调 setter 时 `this` 即 proxy，内部赋值走 set trap 自动按 key 触发，notify 冗余。`batch()` 简化为直通（仅保留兼容 API，通知合并由 Proxy + scheduler 承担）。
  - 同帧多 setter 段（`setTasksCount`/`setScheduledTasks` 成对调用、`/tools` `/threadplan` `/approvals` `/sessions` `/messages` `/toolruns` 命令段）无需逐个手包 batch——每次 set 走 Proxy per-key 触发，渲染收敛在 `requestRender` 微任务合并处。
  - 预期：状态风暴场景单帧一次渲染，高频 getter 无重复计算。（约束：只合并"真实数据变化"触发的通知，不得引入任何定时器/手动刷新）
  - （✅ 已实施 2026-08：setter 全部为 "assign" 直通，无手写值短路、无 notify 残留；`subscribe()`/`listeners` 保留以维持 `canReactive` 契约；`batch()` 直通兼容；P66 基准断言将验证"固定状态 + 时间推进 → 零渲染"。）
- **P66 渲染性能基准**：`test/console-renderer.spec.ts` 增加基准断言——(a) **固定状态 + 时间推进 N 次 → 断言渲染次数为 0**（无数据变化即无渲染，防回归到 setInterval 主动刷新；禁止测试手动触发渲染来模拟动画帧）；(b) 真实数据变化触发渲染时，断言输出 diff 后实际写入行数远小于全树高度（动画帧只随数据驱动渲染推进，且只重写变化行）。记录修复前（每帧 ~1 全树布局 + ~1 输出 diff）与修复后基线。

### 已完成（本段前置改动）

- Working 面板模板拆分：`workingDetail` 移除 dashboard 拼接；新增 `working-dashboard-line`（`v-show="dashboardTextLabel"`）独立行显示 dashboard 摘要；`working-dashboard-line` 的显示样式与工作行分离。
- Working 面板新增点动画（**初始实现，已违反架构约束 2，P62 将重做**）：`WORKING_DOT_FRAMES`（braille spinner 10 帧）+ `dotFrame`/`dotStyle` getter + `onAfterViewInit`（`setInterval` 150ms 推进 `frame`，`shouldShow` false 跳过，`onDestroy` 清理）+ 删除旧 dead code（`animatedCharAt`/`animatedCharStyleAt`/`activeAnimatedCharIndex`/`animatedGlowRadius`）。`tsc --noEmit` clean；`console-renderer.spec.ts` 既有断言（73/335 行 `dashboardTextLabel`）未受影响。
- 注意：上述点动画的 150ms setInterval 即为 P62–P66 要解决的性能问题来源（见上文瓶颈 1/2）。

## 已完成（历史）

P0–P61 全部打磨条目（含 P34/P35 Tier1/Tier2 与 A/B 面、P42–P45 规划项）均已落地并有测试覆盖；截至 P61 全量回归：agent 554 / agent-cli 52 passing，各子包 `tsc --noEmit` clean。逐条打磨记录见 git history 中各 P 段。
