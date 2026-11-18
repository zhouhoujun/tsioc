# agent-ui：设置页、弹窗与响应式框架使用方案

日期：2026-11-18。范围：`packages/agents/agent-ui`（TUI + Web），必要时下沉到
`packages/components`（common/console/html）。

## 1. 现状分析

### 优点

- **命令面完整**：103 个命令覆盖会话/模型/权限/集成/诊断；`/help` 分组、命令注册表、
  i18n 全量（notice 715 键）已建立。
- **设置中心已可用**：`/settings` schema 驱动页面（7 分区、搜索、作用域/生效徽标、
  `ctrl+r` 重置、分区条可点击），`/settings menu` 兼容旧菜单；设置项已完成
  queue mode、transcript window、page size、approval timeout、workspace trust、
  插件 activate/inspect/remove、MCP 工具激活。
- **响应式基础正确**：状态集中在 `AgentConsoleSessionState`，模板绑定驱动更新；
  `setMessages`、`applyCachedView`、`restore` 已用 `batchReactiveUpdates`；
  数组结构性修改（Set、pendingQuestionQueue）已改为替换引用。
- **Web/TUI 共用组件树**：console/html 两端渲染同一面板，settings 页面两端一致。
- **可靠性**：agent-ui 测试数量大（最近相关套件 164+），gate 覆盖 components ×4 +
  agent-ui + tsc + source-size + diff-check + web build。

### 缺点（本次要解决的）

1. **弹窗契约未统一**：阻塞式 select/dialog 目前是“内容宽度 + 居中”，
   会覆盖状态行并露出周围文本；AGENTS 要求与输入区同宽、底部贴输入框。
   已有 3 个测试按窄卡片假设编写（native-scrollback / click-outside 等）。
2. **弹窗细节缺陷**（已修一部分）：面板列表默认 `hasMore=true` 导致无效
   `[ Load more ]`；项目组缺 `sessions` 数组会崩溃；`/projects` 二级标题用 key
   而非 label。仍需处理：日期 epoch 展示、归档/空列表状态、返回上一级、分页语义。
3. **响应式框架使用不对称**：552 个 getter、8 个手写 WeakMap 缓存，仅 3 个
   `@Computed`；`batchReactiveUpdates` 仅 5 处。很多派生值在每次绑定重跑时重新计算
   （如 `navFilteredSessions` 的 filter/sort、面板列表映射）。
4. **设置页尚未“页面化”**：TUI 是 overlay 页面，Web 端仍是同一 overlay；
   缺少独立 Web 设置页骨架、保存/未保存提示、全局重置、危险操作确认。
5. **可发现性**：设置项的作用域/生效方式已有徽标，但缺少搜索历史、最近修改、
   快捷键提示（`ui-kbd`）与空/错误状态。

## 2. 与 opencode / Codex 对比

| 能力 | opencode | Codex | 当前 agent-ui | 计划 |
| --- | --- | --- | --- | --- |
| 设置入口 | Web 设置页 + TUI 命令 | `config.toml` + `/` 命令 | `/settings` overlay | 增加 Web 设置页（共用 schema） |
| 模型/Provider | providers 登录 + 实时目录 | `/model`、profiles | 已有实时目录/wizard | 合入设置页 Model 分区 |
| 权限/沙箱 | per-tool permission | `/approvals` + sandbox | 安全级别 + sandbox + inspect | 增加 per-tool allow/deny 编辑 |
| Agents | build/plan + 自定义 | profiles | archetype/delegation | 设置页 Agents 分区完善 |
| 集成 | MCP/plugins/skills | MCP/hooks | 列表 + 插件操作 + 信任 | 增加安装/移除确认与状态徽标 |
| 弹窗 | dialog 与输入同宽、贴输入区 | TUI 侧边面板 | 内容宽度 + 居中 | 统一 overlay 布局策略 |
| 反馈 | 即时保存 + 状态 | 明确提示 | 部分有 notice | 增加保存/未保存/失败状态 |

## 3. 响应式框架审计（是否“没充分利用”）

已正确使用的部分：Proxy 状态、模板绑定、`@Computed`（3 处）、`batchReactiveUpdates`
（setMessages/applyCachedView/restore）、数组替换。

未充分利用/可改进：

1. **`@Computed` 覆盖不足**：`displayMessages`、message items、content presentation
   等仍用 WeakMap 手写缓存。原因：`AgentConsoleSessionState` 的 host 类不是组件，
   `@Computed` 只对组件/指令 proxy 生效。可落地的方式：
   - 把**组件内**的热 getter（面板列表映射、标签拼接）改为 `@Computed`；
   - 对 state 级派生值保留“按输入身份键控”的 memo（现有模式），并统一放进
     `AgentConsoleDerivedState`，避免散落。
2. **`navFilteredSessions` 每次读取都 filter/sort**：被 sessions 面板与导航频繁读取。
   计划按 `(sessions 引用, navFilter)` 缓存结果；这是 `/sessions` 弹窗打开/操作时的
   直接热点。
3. **批量写入不足**：`openSession` 首次加载重置约 20 个字段、若干弹窗开关逐字段写；
   计划统一包在 `batchReactiveUpdates` 内（保留现有语义），减少绑定重跑。
4. **隐藏面板仍参与绑定**：`v-show` 面板即使不可见也会计算 getter。对昂贵面板
   （settings center、review、tasks）改为按可见性短路 getter 或 `v-if`
   （注意保留状态与已打开面板的缓存）。
5. **手动缓存与框架的边界**：现有 8 个 WeakMap 缓存是“派生 memo”，不是状态同步，
   合规但分散；计划集中到 derived 模块并补测试（命中/失效/切 tab）。

性能基线（4 tab × 1000 消息，同一 harness）：切换 p50 87–140ms（负载波动），
state 52–67ms + paint 25–56ms；历史记录 98–138ms。已试并回退的优化：
`removeDeps` 三元组（state-only 变慢 103/68 vs 67/52）、console 样式快路径
（paint min 24.9 vs 25.0 无差异）。后续任何优化必须 A/B 交替实测，无收益即回退。

## 4. 弹窗修复方案（先做）

### 4.1 统一 overlay 布局策略（components/console，通用层）

- 阻塞式 dialog/menu：宽度 = 输入区宽度（扣除边框/列），底部贴输入框顶边，
  不再按内容收缩、不再居中；超高时按可视区域裁剪并保留标题/关闭按钮。
- suggestion 菜单保持现有 composer 贴边样式（其宽度本就与输入一致）。
- `scrollback`：浮层只绘制当前可见窗口，不插入流、不占历史行（现有窗口计算复用）。
- 点击/悬浮命中：宽度变化后重算 band 与 clickTargets；保留 `✕` 与整行可点击。
- 测试：更新 `native-scrollback dialog`、`click outside dismiss`、`dialog header` 等
  3 个按窄卡片假设的用例；新增“宽度等于输入区”“底部贴输入区”“超高裁剪保留标题”。

### 4.2 `/sessions` 与 `/projects` 细节

- `/sessions`：行内日期 fallback（无时间戳不显示 1970）；归档徽标；空列表提示；
  列表分页语义（全量加载时 `hasMore=false`，已修）；`↑/↓` 选择与 Enter 打开、
  Esc 关闭回归测试；搜索过滤后选择保持。
- `/projects`：项目 key→label（已修）；项目组缺 `sessions` 容错（已修）；
  二级选择器标题/返回上一级（Esc 回项目列表而非直接关闭）；空项目提示。
- 两端（TUI/DOM）渲染一致：同一 `dialog`/`list`/`select` 组件；DOM 端补
  `data-message-id`/`data-dialog` 便于 e2e。

## 5. 设置页完善方案

### 5.1 目标形态

- **TUI**：保持现有 overlay 设置中心（分区 + 搜索 + 行内徽标 + 重置）。
- **Web**：新增独立设置页骨架（`web-console` 内），用 `components/common`：
  `tabs`（分区）+ `search-field` + `ui-card`（字段组）+ `ui-switch`/`ui-select-trigger`
  + `ui-button` + `ui-badge` + `ui-kbd` + `ui-empty`；数据源与 TUI 相同 schema。
- 共用持久化：workspace `.tsdi-agent/settings.json`；attach/web 经
  `settings.store.set` + `settings.ui.set`，新字段补白名单与净化。

### 5.2 新增/完善字段

- Permissions：per-tool allow/deny 编辑（基于现有 `permissions` 规则）、approval timeout（已完成）、
  workspace trust（已完成）、sandbox 模式说明。
- Integrations：MCP server 状态徽标、插件安装/移除确认、skills 详情（已有 overlay）、
  hooks 信任状态（已接 RPC）。
- Interaction/Transcript：queue/steer、activity verbosity、timeline、page size、transcript window
  （均已完成），补“立即生效 / 新 turn / 需重启”提示。
- Data：导出、清理输入历史、打开设置文件（`/editor`）。
- 通用：Reset section / Reset all（危险操作二次确认）、搜索结果高亮、最近修改标记。

### 5.3 UX 与可访问性

- 行内 `scope` / `effect` 徽标（已有），空/错误状态（`ui-empty`），禁用原因；
- 键盘：↑/↓、←/→、Enter、`ctrl+r`、输入即搜索、Esc 清空/关闭；
- Web：聚焦环、`aria-label`、`role=dialog`，主题变量（light/dark/solarized/high-contrast）。

## 6. 实施阶段与验收

### P1 —— 弹窗契约（先做，修复用户可见问题）

1. components/console overlay 宽度/贴边策略；更新 3 个既有测试 + 新增宽度/裁剪测试。
2. `/sessions`、`/projects` 细节（日期/归档/空态/二级返回/选择保持）。
3. 验收：TUI surface 快照断言（宽度=输入、底边贴输入、标题保留）；DOM 弹窗 e2e；
   164+ 相关 agent-ui 套件、components/console 171 全绿；真实 PTY 手测。

### P2 —— 响应式利用与性能

1. `navFilteredSessions` 缓存（sessions 引用 + filter）。
2. `openSession` 重置与弹窗开关批量写入。
3. 组件内热 getter 改 `@Computed`（先 `renderedMessageItems`/chrome 标签），
   保留 state 级 memo 并集中到 derived 模块。
4. 验收：4 tab × 1000 消息切换 p50 不高于基线（交替 A/B，≥2 轮），无功能回退；
   components ×4 + agent-ui 全套 + `components-bench` 通过。

### P3 —— Web 设置页

1. 页面骨架与 schema 渲染；新字段 + RPC 持久化；未保存/保存失败提示；
2. 危险操作确认、重置 section/all；
3. 验收：DOM 渲染测试、刷新后保持、主题切换不丢样式、真实浏览器手测。

### P4 —— 收尾

- README/`docs`、`/help` 描述、which-key 提示；全量 gate + 真实 TUI/browser 手测。

## 7. 约束与风险

- 不删除/降级既有功能；弹窗宽度改动必须同步修测试而不是放宽断言。
- 新字段必须 schema 一处定义，TUI/Web 共用；i18n en/zh 同步。
- 性能改动以真实 1k 消息 TUI 路径 A/B；无收益立即回退（已两次验证此纪律）。
- ratchet：新增逻辑落新文件（<600 行）；触及基线文件时同提交下调。
- Web/TUI 边界：console 差异只落 `components/console` 通用层，不在 agent-ui 兜底。

## 8. 实施状态（2026-11-18）

- **P0 基线**：见 `docs/agent-ui-baseline.md`（测试计数、1k 消息切换 p50/p95、state/paint
  拆分、source-size 预算与复跑命令）。
- **P1 弹窗契约**：已完成（`55324b026`）。阻塞式 select/dialog 与输入区同宽并贴输入框顶边；
  `/sessions` 去无效 `[ Load more ]`、归档徽标、秒级时间戳归一化；`/projects` 二级标题用
  label、Esc 返回项目列表、无会话提示后回到列表；相关套件 191 passing。
- **P2 响应式/性能**（进行中）：已落地"已投影 transcript 数组复用"（`4ef0f7a84`，
  state p50 中位数约 61 vs 69ms）与"`navFilteredSessions` 按列表+过滤值缓存"
  （500 会话下 2000 次读取 493ms → 1.7ms）。剩余：弹窗/重置批量写入、热点 getter 评估。
- **P3 Web 设置页**：已完成。`/settings` overlay 保持 TUI 契约；浏览器侧栏齿轮挂载独立
  设置页应用（同一 `AgentConsoleSessionState`/schema/row 动作），用
  `components/common` 的 card/switch/search-field/button/badge/empty/kbd 渲染，
  `v-show` 控制可见性，Esc/✕ 关闭，开关即时应用并保持页面打开；页面应用独立挂载，
  不改变 TUI 组件树（console-renderer 回归通过）。
- **P4 收尾**：待做。
