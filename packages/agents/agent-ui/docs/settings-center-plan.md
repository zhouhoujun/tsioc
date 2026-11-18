# Settings 中心方案（agent-ui，2026-11）

## 0. 目标

把现在分散在 15+ 个 `/command` 里的偏好集中到一个 **schema 驱动、TUI/Web 共用** 的
设置中心：

- 分组、可搜索、可重置、显示作用域（workspace / 全局 / 仅本会话）；
- 每个字段一处定义（label/描述/类型/默认值/读取/应用/持久化），新增字段不再同时改
  store、命令、i18n、web 适配层；
- TUI 与 Web 使用同一份 schema 与同一套 `components/common` 组件树，平台只负责
  渲染（console / html）与 RPC；
- 不删除现有能力：`/settings` 原有 General/Keybinds/Providers 行为全部保留，只是
  换成中心页里的分区。

## 1. 现状（证据）

| 项 | 现状 |
| --- | --- |
| 命令入口 | `/settings` 只有 3 个 tab：General（13 行平铺）、Keybinds（3 个动作）、Providers（跳 `openModelSwitcher`） |
| 分散的偏好 | `/theme` `/language` `/vim` `/raw` `/thinking` `/timeline` `/display` `/layout` `/statusline` `/title` `/permissions` `/yolo` `/steer` `/model` `/provider` `/fast` `/personality` `/memories` `/delegation` `/goal` `/keymap` |
| 元数据位置 | `AgentConsoleSettingsCommands.ts`（label/描述硬编码、244 行基线）、`AgentConsoleSettingsStore.ts`（持久化字段）、`AgentConsoleSettingsRuntime.ts`（恢复/应用）、`web-console/rpc-stores.ts`（浏览器镜像） |
| 持久化 | workspace `.tsdi-agent/settings.json`（26 个字段：language/vimMode/showThinking/showTimestamps/showToolOutput/showUsername/steerMode/activityVerbosity/timeline*/messageLayout/thinkingLevel/yoloMode/securityLevel/personality/memoryInjection/taskFilter/planTodoFilter/touchMode/modelProfile/lastSessionId/openSessionIds…）；keymap/theme/statusline/title 各有独立 store；模型 profile 在根 `settings.json` 的 `model` 段 |
| Web | 复用同一个 console overlay（html renderer），没有独立设置页；持久化经 `settings.store.get/set` + `settings.ui.get/set` |
| 测试 | `settings-persistence`、`web-console-settings-store`、`vm-vim-keymap`（General 各开关）、`security-levels`、`persisted-preferences`、`menu-i18n`、`vm-review-tasks`（providers tab） |
| 可复用 UI | `components/common` 已有：`tabs`/`tab-bar`、`search-field`、`list`/`select-list`、`switch`、`select-trigger`、`button`、`card`、`badge`、`kbd`、`empty`、`alert`、`steps`、`tree`、`data-table`、`toolbar`、`panel`、`dialog`、`toast`、`dynamic-form` |

## 2. 对比 opencode / Codex

| 能力 | opencode | Codex CLI | agent-ui 现在 | 本方案 |
| --- | --- | --- | --- | --- |
| 设置入口 | TUI 命令 + Web 设置页 | `config.toml` + `/` 命令 | `/settings` 3 tab 平铺 | 统一设置中心（分区 + 搜索 + 深链） |
| 模型/Provider | providers 登录、模型目录 | `/model`、profiles | 有实时目录 + provider wizard | 并入「Model」分区，保留 wizard |
| 权限/沙箱 | per-tool permission | `/approvals`、sandbox | 安全级别 + sandbox + inspect | 独立「Permissions」分区（含 allow/deny 摘要与 inspect） |
| Agents | build/plan + 自定义 agents | profiles | archetype + delegation | 「Agents」分区（默认 archetype、delegation、personality、memories） |
| 集成 | MCP/plugins/skills | MCP servers/hooks | 只读命令 | 「Integrations」分区（列表 + 可用开关 + 信任状态） |
| 键位 | keybinds 编辑器 | — | 已有 record/list/reset | 保留，作为独立分区 |
| 作用域提示 | 配置文件/命令区分 | profile/global | 无 | 每行显示 workspace/global/session 徽标 |
| 重置/搜索 | 有搜索 | — | 无 | 每行 `r` 重置 + 全局搜索（`/settings <query>`） |
| 变更生效提示 | — | — | 部分命令提示 | 每行标注「立即生效 / 新 turn / 需重启 surface」 |

## 3. agent-ui 优点 / 缺点

**优点**

- 命令面覆盖广（103 命令），单会话状态是唯一数据源，i18n 全量覆盖。
- 已有实时模型目录、provider wizard、安全级别/sandbox/inspect、activity/steer/queue 等新交互。
- TUI 与 Web 共用组件树，客户端/服务端设置已有 `settings.ui.*` RPC 通道。
- 设置写入有净化与原子写；workspace 作用域已有明确边界。

**缺点（本方案要解决的）**

1. **设置是"命令集合"而不是"设置页"**：13 个 General 行平铺，无分组/搜索/说明/重置，用户找不到项。
2. **元数据四处分叉**：加一个字段至少改 store + runtime + 命令 + i18n +（Web 如需）RPC，容易漂移（已有 steer/activity 两次改动即为例证）。
3. **无作用域与生效方式提示**：用户不知道某项是 workspace、全局还是仅当前会话，也不知道是否需要重启。
4. **Web 没有设置页**：浏览器里仍是一层 TUI overlay 菜单，交互密度和可发现性都差。
5. **集成面只读**：MCP/plugins/skills/hooks 只能看列表，不能在设置里启停或查看信任状态。
6. **没有校验/重置/深链**：非法值靠各命令自行兜底；`/settings` 不能直达某个分区或字段；没有"恢复默认"。
7. **表单能力未用**：`components/common` 的 `dynamic-form`、`tabs`、`switch`、`search-field`、`card`、`kbd` 等在新设置页里几乎没用上（旧页只用了 select 菜单）。

## 4. 信息架构（分区与字段）

> 每行字段最终以 schema 定义为准；下表是首版范围（P1–P3）。

### 4.1 Appearance（立即生效）

| 字段 | 类型 | 作用域 | 说明 |
| --- | --- | --- | --- |
| theme | enum(4) | global store | 主题 |
| language | enum | workspace | 界面语言 |
| messageLayout | enum(viewport/scrollback) | workspace | TUI 布局（切换重启 surface） |
| timestamps | toggle | workspace | 时间戳 |
| username | toggle | workspace | 用户名标签 |
| windowTitle | toggle | workspace | 终端标题同步 |
| touchMode | toggle | workspace | 触屏提示 |
| statusline/title fields | multi-select | global store | 底栏/标题字段 |

### 4.2 Transcript（新 turn 生效）

activityVerbosity、timeline mode (`/timeline`)、timeline view、raw mode、showThinking、
showToolOutput、showCriticalMarks、transcript window size（新增，默认 40）、
pager page size（新增）。

### 4.3 Interaction

vim mode、steer mode、queue mode（新增，`/queue` 默认排队开关）、
Enter 行为提示（只读，按 steer/queue 推导）、keybindings（子页：list/record/reset/conflicts）。

### 4.4 Model

provider（实时目录）、model（实时目录）、thinkingLevel、fast tier、model profiles、
reasoning variant（只读）、`/model` `/provider` 保留为快捷入口。

### 4.5 Permissions

securityLevel、sandbox mode、yolo/auto-approve、approval timeout（新增）、
workspace trust（只读 + 操作）、allow/deny 摘要、`/permissions inspect <tool>` 入口。

### 4.6 Agents

默认 archetype、delegation mode、personality、memories on/off、goal 状态（只读）。

### 4.7 Integrations

MCP servers（列表/状态）、plugins、skills、hooks（列表 + 信任状态）；
首版只提供「查看 + 可用开关（若 runtime 已有 API）」，不新造配置格式。

### 4.8 Data（动作型）

sessions（跳 `/sessions`）、export（`/export`）、archive、input history 清除、
diagnostics（`/diagnostics`）、debug config（`/debug-config`）、
open settings file（`/editor` 打开 `.tsdi-agent/settings.json`）。

### 4.9 Advanced

reload（`/reload`）、restart（`/restart`）、pair/web（`/pair`）、
config file path（只读）、版本/环境（只读）。

## 5. 架构

```
AgentConsoleSettingsSchema.ts       // 纯数据：section/field 元数据 + 类型
        │
AgentConsoleSettingsCenter.ts       // 状态与行为：query、selected、apply/reset、深链
        │
AgentConsoleSettingsCenterPanel.ts  // components/common 组件树（TUI/HTML 共用）
        │
AgentConsoleSettingsHost.ts         // 现有 facade：runSettingsCommand → center
        │
   ┌────┴───────────────┐
TUI console renderer   html renderer (web console)
        │                    │
 workspace settings      settings.store.set / settings.ui.set
```

### Schema 形状（示例）

```ts
export interface AgentConsoleSettingField {
    id: string;                       // 稳定 id，用于深链/搜索/测试
    section: SettingsSectionId;
    type: 'toggle' | 'enum' | 'text' | 'number' | 'action' | 'readonly' | 'multi';
    scope: 'workspace' | 'global' | 'session';
    effect: 'immediate' | 'next-turn' | 'restart-surface' | 'none';
    labelKey: string; descriptionKey: string;
    default?: any;
    options?: () => Array<{ value: string; label: string; description?: string }>;
    read: (host: SettingsCenterHost) => any;
    apply: (host: SettingsCenterHost, value: any) => Promise<void>;
    reset?: (host: SettingsCenterHost) => Promise<void>;   // 缺省用 default
    visible?: (host: SettingsCenterHost) => boolean;       // TUI-only / web-only
}
```

- **单一来源**：字段只在 schema 出现一次；持久化键、RPC 键、i18n key 都由 id 派生/声明。
- **apply 复用现有命令 handler**（`runThemeCommand`、`setYoloMode`、`applySecurityLevel`、
  `setSteerMode`、`applyProfileSelection`…），不复制业务逻辑。
- **scope 与 effect** 由 schema 声明，渲染层只显示徽标，不在 UI 里写死文案。
- **Web**：渲染同一面板；`host.persistSettings` 在 web 由 `rpc-stores` 实现
  （`settings.store.set` + `settings.ui.set`），新增字段需要同时补 RPC 白名单
  （`applyConsoleUiSettings` / store 文件字段），schema 测试保证两端一致。

## 6. 交互规范

### TUI（console renderer）

- `/settings` 打开中心：左侧分区列表（`list`），右侧当前分区行（`list`），顶部搜索框
  （`search-field`，也可 `/settings perms` 直接带过滤）。
- `↑/↓` 移动、`tab` 切换分区、`enter` 应用/进入子页、`r` 重置当前项、`/` 搜索、
  `esc` 关闭；所有可点击行保留鼠标 hover（复用现有 hover 机制）。
- 行样式：`label` + 当前值 + scope 徽标（`ui-badge`）+ effect 提示（`ui-kbd`/muted 文本）。
- 子页：Keybinds（record/list/reset）、Providers（现有 wizard）、Integrations 列表
  使用 `ui-tree`/`ui-list`。

### Web（html renderer）

- 同一组件树在 `#agent-console` 内以 overlay/页面形式渲染：`tabs`（分区）+ 
  `search-field` + `ui-card`（字段组）+ `ui-switch`/`ui-select-trigger`/`ui-button`。
- 表单型子页（provider wizard、MCP 配置只读视图）优先 `dynamic-form`（HTML 端）。
- 底部统一 `ui-toolbar`：`Reset section` / `Close`；保存成功用 `ui-badge`/toast 提示。

## 7. 分阶段实施

### P1 — schema + TUI 设置中心（保持现有测试语义）

- 新增 `AgentConsoleSettingsSchema.ts`（≤600 行）、`AgentConsoleSettingsCenter.ts`、
  `AgentConsoleSettingsCenterPanel.ts`；
- `runSettingsCommand` 改为打开中心，General/Keybinds/Providers 作为分区/子页保留；
- 搜索、作用域徽标、`r` 重置、深链 `/settings <query>`；
- i18n：新 key 放入 settings 专用 bundle（en/zh 同步），不硬编码英文；
- 测试：schema 完整性（每个字段 read/apply 存在、id 唯一、scope/effect 合法）、
  TUI 渲染（分区/行/徽标）、应用与持久化（复用 settings store）、搜索、重置；
  现有 settings 用例改为新导航但断言同样的用户可见结果。

### P2 — Web 设置页

- 同一面板在 html renderer 下渲染；web 侧 `persistSettings` 走 RPC；
- 补 `settings.ui.get/set` 新字段（queueMode/transcriptWindow/approvalTimeout…）；
- 测试：DOM 渲染、RPC 往返（刷新后保持）、浅色/深色主题不丢样式；
- 验收：浏览器无需打开 TUI overlay 即可完成全部设置。

### P3 — 新字段与集成分区

- queue mode、transcript window、pager size、approval timeout、workspace trust（只读+操作）；
- Integrations：MCP/plugins/skills/hooks 列表 + 信任状态 + 现有 API 的开关；
- 每个新字段：schema + store 净化 + runtime 应用 + i18n + 测试 +（web）RPC。

### P4 — 收尾

- 文档（README、`docs/`）、`/help` 描述、which-key 提示；
- 全量 gate（agent-ui + components ×4 + tsc + source-size + diff-check + web build +
  components-bench）、真实 TUI/浏览器手测。

## 8. 约束与风险

- **ratchet**：`AgentConsoleSettingsCommands.ts` 只减不增；新文件 ≤600 行；若拆分使
  baseline 文件变小，同提交下调 baseline。
- **不降级**：现有 `/settings`、`/theme`、`/permissions` 等命令与持久化行为必须保持；
  现有测试只允许因导航变化而更新选择路径，不允许删除断言。
- **i18n**：所有 label/描述/状态经 bundle；notice 目录数量测试需同步。
- **响应式**：面板状态用普通字段 + 绑定，不写 get/set 转发；整页切换用
  `batchReactiveUpdates`；不新增 setInterval。
- **Web/attach 一致性**：所有 workspace 字段经 `settings.ui.set`（或 store）落到 gateway；
  仅客户端行为（yolo 审批、布局）可留本地，需在行上标注作用域。
- **无死代码**：schema 里不得出现只有测试用的字段；每个字段必须有生产 apply 路径。

## 9. 决策与进度（2026-11-18）

已确认：

1. 现有 `/settings` 用例允许改为新导航，用户可见断言不变（保留 `/settings menu` 兼容路径）。
2. Integrations **不只是只读**：插件使用 `plugins` 工具执行 activate/remove/install；MCP 工具可用
   `tools.activate` 按会话启停；hooks/skills 至少展示状态与详情。写入能力以现有 runtime API 为准，
   不新造配置格式。
3. Web 复用同一共享面板（一套组件树 + 两端 renderer）。

### P1 已完成（`AgentConsoleSettingsSchema.ts` / `...Center.ts` / `...CenterPanel.ts`）

- `/settings` 打开设置中心：分区（General/Model/Permissions/Agents/Integrations/Keybinds/Data），
  `↑/↓` 移动、`←/→` 分区、`enter` 应用、`ctrl+r` 重置（有默认值的开关）、输入即搜索、
  `esc` 先清空搜索再关闭；`/settings <query>` 深链；`/settings menu` 保留旧 tab 菜单。
- 行内展示当前值 + 作用域徽标（workspace/global/session）+ 生效方式（immediate/next turn/需重启）。
- 动作型行在打开其它弹窗前先关闭页面，避免浮层叠加；开关类保持页面打开以便连续修改。
- 终端键路由在 composer/全局键之前拦截（`handleSettingsCenterTerminalInput`），浏览器键走同一映射。
- 渲染与样式：设置页使用 console panel 语义 + 纯文本徽标（`ui-badge` 依赖 `IconModule`，在当前
  console 模板导入路径下无法解析，故 P1 用语义 span；P2 在 Web 端可换用组件）。

### P2 已完成

- Web/HTML 复用同一面板（`html-console` 渲染用例），浏览器键盘先交给设置页；
- Integrations：插件 activate / inspect / remove（确认），MCP 工具 `tools.activate`；
- 新字段：queue mode、transcript window（持久化 + 恢复）。

### P3 已完成

- Permissions：workspace trust（只读 + 确认后 trust）、approval timeout（15/30/60/120s，
  `ApprovalManager.setDefaultTimeout` / `Runtime.setApprovalTimeout` / gateway `settings.ui.set` 持久化并立即生效）；
- `hooks.list` RPC：attach/web 的 `/hooks` 不再回退到空的客户端摘要；
- Web 皮肤：`web/console.css` 使用主题变量的设置页样式。

### 待做

- skills 详情内联视图、hooks 信任状态（依赖 agent-cli 的 trust 哈希，需先在公共层暴露）；
- 设置页 pager size、真实浏览器手测。
