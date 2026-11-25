# @tsdi/components/common 对标最新 opencode（2026-11）

> 基线：`packages/components/common`（63 个组件入口，renderer-neutral）
> 参考：`~/workspace/opencode` @ `8d7477816f`（packages/ui、session-ui、tui、stories）
> 目标：保留 IoC + Proxy 响应式 + 单模板跨 DOM/TUI 的架构，补齐 opencode 在
> 组件工程化、可访问性、动效、表单与共享会话 UI 上的强项。

## 1. 结论摘要

- opencode 的 UI 优势不是“组件数量”，而是**工程化质量**：Storybook/catalog、
  组件级浏览器测试、会话 UI fixture/snapshot、motion 物理系统、主题 token、
  包边界测试和 perf 基准。
- 本仓库 common 的优势是**渲染无关与业务配置能力**：同一模板跑 DOM/TUI/XML，
  IoC/Proxy 状态直接驱动绑定，`dynamic-form`/typed value/规则列表/工作流设计器
  的表单能力比 opencode 的通用 Web 组件更贴近企业配置场景。
- 不建议照搬 opencode 的 Solid/Effect/Bun 技术栈，也不应复制其品牌与视觉；
  应把 opencode 的“质量基础设施”做成 common 的框架能力。

## 2. 现状对照

| 维度 | 最新 opencode | 当前 common | 判断 |
| --- | --- | --- | --- |
| 组件规模 | `packages/ui` 151 个 tsx + 70 个 stories；`session-ui` 共享会话时间线 | 63 个入口、60+ widget；agent-ui/workflow 设计器为宿主 | 数量接近，common 更偏“跨端基础件” |
| 跨端共享 | Web 用 Solid；TUI 用 `@opentui/solid` + `packages/tui` 专用 dialogs；`session-ui` 共享数据/时间线 | 同一模板 + DOM/console/xml renderer；部分 DOM 组件在 TUI 降级 | common 的跨端中性更强；opencode 的 TUI 专用组件更精致 |
| 响应式 | Solid signals/context | Proxy + effect + 绑定自动追踪 | 各有所长；本仓库模式更适合 IoC 宿主 |
| 组件文档 | Storybook + stories + mocks + Playwright 组件测试 | README/catalog 单测 + DOM/TUI 单测；无可视化 catalog | **opencode 明显领先** |
| 动效 | `ui/src/motion`：spring/共享 frame loop/WAAPI/reduced motion/perf 基准 | `AnimationClock` + CSS 动画；无统一物理/减动效契约 | **opencode 领先** |
| 表单原语 | `forms/field`、`typeahead`、`search-list`、`inline-input`、`redirect-paste` | select/autocomplete/search-field 分散；field a11y 未统一 | **opencode 更系统** |
| 浮层/焦点 | overlays/dialog + 焦点管理、键盘/ARIA 近期强化 | dialog 滚动契约已修；焦点陷阱/恢复/overlay stack 未集中 | 需补齐 |
| 数据表 | 异步/资源式 UI、列配置、虚拟化生态 | 排序/分页/展开/固定列/选择；无异步数据源/列可见性/虚拟化 | 需补齐 |
| 会话 UI 共享 | `session-ui` 独立包，import-boundaries 测试、fixtures、storybook、snapshot | agent-ui 内共享模板/投影；无独立边界/快照契约 | 需补质量门禁 |
| 主题 | `@opencode/theme` + CSS tokens + contrast/story | `--ui-*` + 宿主 CSS（agent-ui、workflow 设计器）重复 | 需收敛 |
| 性能门禁 | `packages/ui/perf`、motion bench、Playwright | components bench 覆盖核心；common 无 bench | 需补 common bench |
| 可访问性 | roving tabindex、dialog chrome、ARIA、键盘可达近期修复 | keymap/select 有部分；缺少全组件键盘/ARIA 矩阵 | 需系统化 |

## 3. 优点与问题

### 3.1 common 的优点（应保留）

1. **单模板跨端**：widget 只声明语义模板/属性，DOM 与终端各自绘制；比
   opencode 的 Web/TUI 双组件更能保证结构和行为一致。
2. **IoC + Proxy 响应式**：状态变化直接重跑绑定，无需每组件 signals/订阅；
   适合 agent-ui 的会话状态、设置页、工作流设计器共享同一 state。
3. **配置表单深度**：`dynamic-form` 的 typed value、规则列表、引用选择、
   key/value、可见性/校验，是 opencode 通用 UI 包不具备的业务能力。
4. **语义契约稳定**：`ui-*` selector、`data-*`、tone/size、catalog/aliases/
   layering 测试，为多宿主复用提供基础。
5. **已有跨包复用**：`select`、`dialog`、`panel`、`list`、`tabs`、`tab-bar`、
   `toast`、`status-list`、`keymap`、`syntax` 已被 agent-ui 使用。

### 3.2 主要问题（按影响排序）

1. **缺少可视化 catalog/Storybook**：采用成本高，视觉/键盘回归靠读测试；
   opencode 70 个 stories + fixtures + Playwright 是明显优势。
2. **动效无统一抽象**：common 只提供时钟/属性，CSS 动画散落宿主；无
   spring/帧循环/reduced-motion/perf 预算。
3. **表单字段原语不统一**：label/hint/error/required/aria 由宿主重复；
   异步 options 无统一 loading/error/abort 模型。
4. **overlay/焦点管理分散**：dialog/drawer/popover/command palette 各写焦点与
   滚动；缺少 focus trap/restore/stack/脏检查契约。
5. **数据表缺异步/列配置/虚拟化**：大数据后台（审计、运行历史、工具输出）受限。
6. **主题 token 未收敛**：`--ui-*` 与 agent-ui/web console/workflow CSS 重复，
   对比度/完整性无自动门禁。
7. **质量门禁偏单测**：common 无 bench、无 DOM/TUI parity harness、无
   import-boundaries 测试（syntax/markdown 之外的依赖边界靠约定）。
8. **TUI 精致度**：opencode TUI 有 59 个专用 dialog/prompt；common 的
   command palette/dialog 在终端仍以同一模板降级，部分交互不够“终端原生”。

## 4. 优化方案

> 原则：不引入 Solid/Effect/Bun 依赖；不复制品牌/配色；新能力优先落在 common，
> 平台差异放 renderer/host；所有旧 props/alias 保留，未知能力必须可降级。

### P0 — 组件 catalog 与契约测试（先做，价值最高）

**目标**：让 common 像 opencode 一样“可浏览、可回归、可验收”。

- 新增 `common/catalog/`：
  - 从组件 `@Attribute()` 元数据生成属性表（name/type/default/required/description）；
  - 每个 widget 一个 `*.catalog.ts`：示例 props、DOM 语义、TUI 语义、键盘说明；
  - catalog 数据必须在测试中校验：每个入口有 catalog、属性全覆盖、`ui-*` selector 存在。
- 新增 `catalog.spec` 扩展：
  - 渲染每个示例到 `@tsdi/components/xml` 节点树，断言语义 class/`data-*`/ARIA；
  - 交互组件补键盘矩阵：Tab/Shift+Tab/Enter/Space/Escape/Arrow/Home/End/PageUp/PageDown。
- TUI parity：在 `components/console/test` 增加基于真实 `TuiRenderer` 的 fixture
  快照（复用 agent-ui 的 ANSI screen buffer 思路，但不反向依赖 agent-ui）；
  DOM 侧在 `components/html/test` 增加对应语义断言。
- 文档：README 只保留入口与原则，属性/示例由 catalog 生成，避免手工漂移。

**验收**：catalog 测试覆盖所有 63 个入口；新增组件缺 catalog/属性表/键盘说明
直接失败；DOM 与 TUI fixture 对同一语义断言通过。
**状态（2026-11-25）**：已落地 `catalog/`（`types`/`collect`/`overrides`/markdown）：
从组件源码自动抽取 `ui-*` selector、doc 摘要与全部 `@Attribute()`，核心四件
（dialog/select/data-table/dynamic-form）有人工 keyboard/surfaces/examples；
`test/catalog-metadata.spec.ts` 覆盖 60 个实际 widget 入口、属性唯一性与 markdown 输出。
**剩余**：catalog 示例的真实 DOM/TUI fixture 渲染、键盘矩阵自动执行。

### P1 — 表单原语与异步 options

- 新增 `forms/field`（renderer-neutral）：`label`/`hint`/`error`/`required`/
  `ariaDescribedBy`/`invalid`，select/text-input/textarea/checkbox/switch/
  dynamic-form 统一使用，宿主不再重复拼 aria。
- 新增 `forms/typeahead` + `forms/search-list`：
  - `source: (query, signal) => Promise<{items,total?,error?}>`；
  - loading/empty/error/retry 状态；请求序号 + AbortSignal 丢弃过期结果；
  - DOM 浮层、TUI 窗口模型共用；select/autocomplete/cascader 逐步委托。
- `inline-input`：行内编辑（session 重命名、tab 重命名、任务标题）统一 Enter/
  Escape/失焦提交语义。
- dynamic-form 对接：字段错误来自 `setIssues`/异步校验时，统一经 field 渲染；
  提交聚焦第一个错误字段（common 只发 `focusFieldAction`）。
- 状态（2026-11-25）：`field`（`ui-field-group`）已落地：label/hint/error/required、
  `aria-describedby`、`data-invalid`、可投影 control；DOM 测试与 catalog override 已补。
  下一步：text-field/select/dynamic-form 迁移到 field，及 typeahead/search-list。

**验收**：agent-ui `/sessions`、`/model`、`/provider`、workflow 引用选择器共享
同一搜索/异步/键盘行为；DOM/TUI 的 loading/error/empty 文案与焦点一致。

### P1 — Overlay / 焦点管理器

- 新增 `overlays` 服务（renderer-neutral token + host adapter）：
  - stack（dialog > drawer > popover > menu），Esc/点击外部只关最上层；
  - `initialFocus`/`restoreFocus`/`focusTrap`/`beforeClose`（同步/异步）；
  - DOM 由 html renderer 实现真实 focus trap；TUI 由 console host 映射 focus layer。
- dialog/drawer/popover/menu-bar/command-palette 全部走该服务；统一
  `.ui-dialog-header/body/footer` 与滚动预算。
- 补键盘/ARIA 回归：打开聚焦、Tab 循环、关闭恢复、脏检查阻止关闭。

**验收**：agent-ui 审批/设置/命令/模型选择，workflow 配置弹窗全部满足；
TUI 与浏览器 Esc/Tab/焦点恢复一致；不出现双滚动/背景滚动。

### P2 — Motion 与主题 token

- 新增 `common/motion/`（不引 DOM/node）：
  - 纯数学 `Spring`（closed-form damped harmonic）、`VelocityTracker`；
  - `FrameLoop` 接口由宿主注入（DOM rAF、TUI AnimationClock）；
  - `prefersReducedMotion()` 由 host 提供，默认 false；减动效时直接 snap。
- HTML renderer 提供 `springStyle`/WAAPI 实现；TUI 用 AnimationClock 驱动帧；
  禁止业务组件自建 setInterval/requestAnimationFrame。
- 主题：固化 `--ui-*`（color/tone/spacing/radius/z/motion），提供
  `installUiStyles` neutral skin；agent-ui/web console/workflow 设计器只覆盖 token；
  增加 light/dark/solarized/high-contrast 的 token 完整性与对比度计算测试。

**验收**：动画无每帧分配基准；reduced-motion 全链路生效；宿主 CSS 不再复制
widget 选择器；主题切换无残留硬编码颜色。

### P2 — DataTable / Command palette

- data-table：
  - 异步模式 `source({page,pageSize,sort,filters}, signal)` + `total/loading/error/retry`；
  - 列配置 `hidden/width/align/filter/sortKey/render`；固定 header/footer；
  - 行窗口化/虚拟化（DOM 与 TUI 同一窗口模型，按可见行渲染）。
- 新增 `command-palette`（基于 typeahead/search-list）：分组、最近使用、
  快捷键展示、`/` 菜单与 workflow palette 复用；menu-bar 支持溢出折叠/typeahead/
  roving tabindex。
- 与 agent-ui 的 `/` 菜单、`/help`、`/sessions`、`/model` 对齐，保留现有
  overlay 锚定（贴输入框上方、不占 footer）。

**验收**：1k/5k 行数据表滚动稳定；异步 loading/error/retry 可见；命令面板在
DOM/TUI 的搜索、分组、键盘选择一致；现有 agent-ui 菜单行为不回归。

### P3 — 质量门禁与性能预算

- `common/bench/`：dynamic-form 500 字段、list/data-table 5k 行、select 2k options、
  menu/palette 搜索、catalog 渲染；沿用 calibration 缩放 + gate 预算。
- import-boundaries 测试：common 不得引用 html/console/node；syntax/markdown
  不得反向依赖 agent-ui；新增入口必须声明 exports。
- Storybook/catalog 静态页（用 common 渲染）：可本地启动；Playwright 组件测试
  覆盖 dialog/select/table/palette 的关键交互。
- 按需加载：upload/image/qr-code/code editor 等重组件由宿主动态 import，
  首屏只保留基础 token/field/overlay。

**验收**：`npm run test` + `bench:check` + DOM/TUI parity + catalog 全部进 gate；
新增组件必须同时有 catalog、键盘矩阵、bench（交互型）和边界声明。

## 5. 落地顺序（建议）

1. **迭代 1（P0）**：catalog 数据结构 + 属性/键盘生成 + XML/DOM/TUI fixture；
   先把 dialog/select/data-table/dynamic-form 四个核心组件纳入。
2. **迭代 2（P1）**：`forms/field` + `forms/typeahead` + overlay service；
   agent-ui 的 `/sessions`、`/model`、审批弹窗迁移验证。
3. **迭代 3（P2）**：motion 抽象 + 主题 token 收敛；data-table 异步/列配置。
4. **迭代 4（P2/P3）**：command palette/menu-bar；bench + Playwright + 边界测试。

## 6. 不采纳的 opencode 做法

- 不引入 Solid signals/Effect/Bun 作为 common 依赖；保持 IoC + Proxy。
- 不照搬 Web 与 TUI 双组件树；仍以单模板 + renderer 分层为准，TUI 专用体验
  通过 host adapter/overlay 语义补齐。
- 不复制 opencode 品牌、配色或 Tailwind token 名；只借鉴信息架构、焦点/键盘、
  catalog/motion/perf 的工程方法。
- 不在 common 中引入任意 DOM 注入或平台分支；扩展点仍用 schema/provider。

## 7. 验收总表

| 门禁 | 内容 |
| --- | --- |
| catalog | 63/63 入口有 catalog、属性表、示例、键盘说明 |
| a11y | 交互组件键盘/ARIA 矩阵（DOM + TUI） |
| parity | 同一 fixture 在 html 与 console renderer 的语义断言一致 |
| forms | field/typeahead 异步/错误/焦点在 agent-ui 与 workflow 验证 |
| overlays | 焦点陷阱/恢复/stack/脏检查跨 DOM/TUI |
| motion | reduced-motion、无每帧分配、AnimationClock 统一驱动 |
| theme | token 完整性 + 对比度 + 宿主零重复 widget CSS |
| perf | common bench 基线进 gate，不回退 |
| boundaries | common 不依赖 html/console/node，新增入口导出校验 |

## 8. 与既有 `component-optimization.md` 的关系

- 既有文档对标 Node-RED，重点在 `dynamic-form` 可扩展性（widget registry、
  异步校验、typed input、规则列表）。
- 本文档对标 opencode，重点在**组件工程化与跨端质量**（catalog、a11y、overlay、
  motion、theme、bench）。两者互补，可并行推进；共享的 `forms/field`、
  `typeahead`、overlay/焦点能力应作为第一阶段共同基础。
