# opencode UI 深度对标与优化方案（2026-11-27）

> 参考基线：`~/workspace/opencode`，`449c128a5b225efcf986201d57519697d8bb7fe1`（2026-11-26）。
> 目标范围：`@tsdi/components/common` 及其在 `agents/agent-ui`、activities、workflow-admin 的接入。
> 约束：保持 IoC + Proxy 响应式、单模板 renderer-neutral（DOM/TUI 共用）、不引入 Solid/Kobalte/Tailwind，不删除或降级既有功能。

## 1. 结论摘要

opencode UI 的领先点不在“组件数量”，而在**交互状态模型、可访问性细节、主题生成、动效基础设施和可视化回归**。我们的 common 组件覆盖面更广（64 个 widget，含 data-table/tree/dynamic-form/markdown/layout），但多数组件仍是“能用的模板 + 直接操作状态”，在 search/select/typeahead、field、theme、motion 的深度上落后。

建议按四层推进：

1. **交互状态机化（P0）**：typeahead / search-list / select 抽出纯状态机，补 debounce、cache、stale、timeout、controlled/uncontrolled、preview/undo。
2. **SearchList 与 Field 升级（P0）**：section/sticky/fade/scroll restore/field injection；Field context + prefix/suffix/tooltip + aria 自动接线。
3. **主题与动效基础设施（P0/P1）**：OKLCH primitives → 对比度校准语义 token；analytic Spring + frame loop + reduced-motion observer + WAAPI adapter。
4. **可视化回归与门禁（P2）**：交互式 catalog、DOM/TUI 键盘矩阵、perf/alloc 预算，再迁移 agent-ui `/` 建议菜单。

## 2. opencode UI 优点

### 2.1 交互状态机

- `forms/typeahead/machine.ts`：`ready/debouncing/loading/failed/disposed`，请求序号、15s timeout、cache、stale rows、initial failed/retry。
- `hooks/list-machine.ts`：`controlled/uncontrolled` filter、keyboard/mouse highlight 模式、异步 load/timeout、fuzzy sort/group。
- `forms/select/machine.ts`：`closed/idle/previewing/committed/disposed`，highlight 预览与撤销，选择/关闭时正确 revert。
- 状态机是纯函数，组件只负责副作用与渲染，边界测试成本低。

### 2.2 SearchList 的完整交互

- section 分组 + sticky header；
- 顶部/底部 fade，随滚动强度变化；
- scrollTop 恢复、resize observer 重测量；
- `field` 注入（页面自己的输入框）与 `popover` 模式；
- 同一行出现在多个 section 时的去重导航；
- `Ctrl/Alt + ↑/↓` 跨 section 跳转，Home/End，IME composing 处理；
- `stale` 行保留并变暗，而不是列表瞬间塌缩。

### 2.3 Field 组合能力

- Context 统一 `controlId/labelId/prefixId/suffixId`；
- `Field.Label/Prefix/Suffix/Control` 组合；
- label info tooltip；
- 自动把 `aria-labelledby` / `aria-describedby` / `aria-invalid` 写到内部 control，处理 prefix/suffix 注册时序；
- invalid 同时落到 shell 的 `data-invalid`，样式与 a11y 同源。

### 2.4 主题工程

- OKLCH 基础色阶 + 感知均匀（perceptual）中性色 ramp；
- 由少量 anchor 生成 light/dark 两套语义 token；
- accent/state/focus 颜色经过 WCAG 对比度校准；
- `muted/faint` 文本按背景亮度自动推导；
- 20+ 主题 JSON，schema 化；
- 语义 token 分 background/text/border/overlay/state/elevation/illustration，host 只覆盖 token。

### 2.5 动效基础设施

- analytic damped-harmonic `Spring`，含稳定性校验与 `fromDuration`（duration/bounce）；
- `VelocityTracker` 固定 ring buffer，2D、无每帧分配；
- `createFrameLoop` 侵入式链表，read/write 分离，无每帧数组/闭包分配；
- reduced-motion 系统偏好 + `data-motion` 覆盖 + MutationObserver 实时切换；
- WAAPI adapter、Solid adapter、motion bench。

### 2.6 质量与可视化

- 70 个 stories + storybook scaffold；
- 44 个测试文件（状态机、focus、a11y、motion、theme resolve）；
- `perf/motion.bench.ts`；
- 组件默认文案走 i18n context。

## 3. opencode UI 局限 / 不可直接照搬

1. **技术栈不同**：Solid + Kobalte + Tailwind/CSS，我们的 common 是 IoC + Proxy + 自有模板编译器。状态机思想可借鉴，组件实现不能复制。
2. **DOM/TUI 双组件树**：opencode `packages/ui` 与 `packages/tui` 是两套组件。我们的优势是单模板 + renderer adapter，盲目拆分会造成行为漂移。
3. **组件面窄**：opencode UI 聚焦会话/设置/对话框；没有 data-table、tree、dynamic-form、workflow layout 等我们已有能力。
4. **状态机成本**：每个小组件都上完整 machine 会过度设计；应只用于有真实异步/预览/受控语义的组件。
5. **视觉重依赖 CSS/Tailwind**：我们的 TUI 不能依赖 CSS；需要把视觉增强放在 host adapter，而不是 common 模板里写 DOM-only 逻辑。

## 4. 当前 common 的优点

- **覆盖面广**：64 个 widget，包含 data-table、tree/tree-select、dynamic-form、tabs/tab-bar、menu-bar、markdown/syntax、layout、upload、qr-code 等。
- **单模板双端**：同一模板在 DOM 与 console renderer 渲染，TUI 不是另一套组件；overlay/菜单/表格共享语义。
- **响应式契约清晰**：proxy 自动依赖收集，组件与 agent-ui 状态直接绑定；无需手写 subscribe/notify。
- **已有工程化基础**：catalog 元数据、257 个 common 测试、source-size ratchet、common bench gate、theme tokens、overlay focus/trap。
- **DataTable 深度**：异步 source、过滤、render、虚拟窗口、固定列/选择/展开。
- **DynamicForm**：schema、校验、typed value、widget registry（含 DI）、异步 issue、字段聚焦。
- **agent-ui 已实际接入**：command palette 已使用 `ui-search-list` 的 controlled 模式；overlay 已接入 focus/escape handoff。

## 5. 差距矩阵

| 能力 | opencode | 当前 common | 影响 | 优先级 |
| --- | --- | --- | --- | --- |
| typeahead | 状态机 + debounce + cache + stale + timeout | 每次输入直接请求，abort 后丢弃 | 高频输入抖动、慢网体验差 | P0 |
| search-list | section/sticky/fade/scroll restore/field/popover | 基础分组、recent、键盘 roving | 命令面板/选择器深度不足 | P0 |
| list/select | controlled/uncontrolled、preview/undo、groupBy | select 基础 options，高亮直接改 state | 选择预览、受控状态不统一 | P0/P1 |
| field | context + prefix/suffix/tooltip + aria 自动 | 语义 helper + field-group 投影 | 复合输入/工具提示需宿主拼装 | P0 |
| theme | OKLCH 生成 + 对比度校准 + 20+ 主题 | 4 套静态 token + 对比度测试 | 主题扩展/品牌定制成本高 | P0 |
| motion | frame loop + 2D velocity + reduced observer + WAAPI | Spring/一维 velocity/reduced 静态参数 | TUI 动画基础设施不足 | P1 |
| catalog | 70 stories + storybook + visual tests | 静态 catalog + DOM/TUI 测试 | 交互/视觉回归仍靠读测试 | P2 |
| i18n | 组件默认文案走 i18n context | 默认英文属性，宿主传值 | 宿主重复本地化 | P1/P2 |
| perf gate | motion bench + 组件测试 | 4 项 common bench，opt-in | 热路径回归覆盖不足 | P2 |
| a11y/focus | Kobalte focus scope + dialog layer | OverlayManager + dialog trap | 其他 overlay 尚未统一审计 | P1 |

## 6. 优化原则

1. **只迁移模型，不迁移技术栈**：状态机、token 生成、motion 数学可借鉴；不引入 Solid/Kobalte/Tailwind。
2. **纯逻辑先于渲染**：异步/受控/预览逻辑必须是纯函数或 controller，可用单测覆盖。
3. **单模板优先**：视觉增强通过 host adapter（focus/scroll/measure/animation clock）实现，禁止在 common 里判断 DOM/TUI。
4. **渐进增强**：新增属性全部可选，默认行为不变；旧 host 不受影响。
5. **不降级功能**：迁移 search-list 到 agent-ui `/` 菜单前，先实现 inline row layout、select-rows 命中、detail/window 等价能力；否则保持 legacy。
6. **可测量**：每个阶段有测试、bench、DOM/TUI 键盘矩阵和 source-size 预算。

## 7. 分阶段方案

### P0-1 交互状态机

新增纯状态机（不依赖 DOM）：

- `typeahead/src/typeahead.machine.ts`
  - `ready | debouncing | loading | failed | disposed`；
  - `attempt` 请求序号、`cache: Map<query, items>`、`stale` 标记；
  - `delayMs` 防抖、15s timeout、retry；
  - 选择保持：pending 时保留旧结果并标 stale。
- `search-list/src/search-list.machine.ts`
  - `controlled/uncontrolled` query；
  - `keyboard/mouse` highlight；
  - async `source` load state、timeout；
  - section 构建、同项去重、跨 section 导航。
- `select/src/select.machine.ts`
  - `closed/idle/previewing/committed`；
  - `onHighlight` 返回 undo，选择/关闭时 revert；
  - controlled open。

**改造**：现有 typeahead/search-list 组件调用 machine；保留现有 `source(query, signal)` 和 `selectAction` API，新增可选 `debounce`、`timeout`、`cache`、`initial`。

**验收**：

- 单测覆盖 debounce、乱序响应、timeout、retry、cache、stale、dispose。
- 现有组件测试全部通过；新增 stale 行/恢复测试。
- 请求 abort 后不再写入状态。

### P0-2 SearchList v2

在 machine 之上补交互能力：

- `section`/`header`、sticky header；
- 顶部/底部 fade（DOM 用 CSS 变量，TUI 用行窗口/边框淡出策略，均由 host adapter 提供）；
- `scrollTop` 恢复 + `onScroll` 回传；
- `field` 注入与 `popover` 模式；
- `same` 去重、`Ctrl/Alt+↑/↓` section 跳转、Home/End、IME composing；
- `rowLayout: 'stacked' | 'inline'`：
  - agent-ui `/` 建议菜单需要 label + description 同行，先在 common 提供 inline layout，再迁移；
- `data-slot`/稳定 `id`，供 DOM 鼠标命中与 TUI 窗口复用。

**验收**：

- DOM 与 console 各一组键盘矩阵测试：↑↓/Home/End/Ctrl+↑↓/Enter/Esc/IME。
- 1k/5k items 滚动稳定；bench 纳入 common gate。
- agent-ui `/` 建议菜单可切换为 common search-list 而保持现有 label+description/select-rows 行为。

### P0-3 Field v2

- 新增 `field/src/field-context.ts`：
  - `controlId/labelId/prefixId/suffixId`；
  - `registerPrefix/Suffix`、`describedBy`、`invalid`；
  - `Field.Label/Prefix/Suffix/Control` 组合。
- `label` 支持 info tooltip（host 提供 tooltip 组件，common 只发结构）。
- text-field/search-field/inline-input/dynamic-form 统一走 field context。
- 保留现有 `ui-field-group` 作为兼容入口，内部委托 Field v2。

**验收**：

- 复合字段（prefix 图标 + suffix 按钮 + tooltip）aria 全链路测试。
- dynamic-form 不再手写 `describedByFor`；错误/描述顺序统一。
- 现有 DOM class / selector 不破坏。

### P0-4 Theme v2

- 在 `src/theme/` 新增：
  - `color.ts`（sRGB/OKLCH/contrast/ensureContrast）；
  - `primitives.ts`（neutral/accent ramp）；
  - `semantic.ts`（background/text/border/overlay/state/elevation）；
  - `resolve.ts`（由 anchor 生成 light/dark）。
- `THEME_TOKENS` 保持现有导出，内部改为 v2 生成结果；
- 新增主题 JSON schema；host 只覆盖 primitive/anchor，不复制 widget CSS；
- 保留四套内置主题作为兼容别名，新增高对比/品牌主题示例。

**验收**：

- 所有内置主题 fg/bg ≥ 4.5、muted ≥ 3、accentFg/accent ≥ 4.5；
- 主题快照测试 + token 完整性测试；
- workflow/agent-ui/web console 的主题切换不残留硬编码色。

### P1-1 Motion v2

- `Spring` 增加 analytic 稳定性校验、`fromDuration(value,{duration,bounce})`、resting 阈值；
- `VelocityTracker` 改 ring buffer + 2D + 时间窗；
- 新增 `frame-loop.ts`：host 注入 `requestFrame/cancelFrame`，TUI 用 `AnimationClock`；
- `reduced.ts`：系统偏好 + `data-motion` 覆盖 + 订阅；
- `waapi.ts`：DOM WAAPI adapter（可选）；
- bench：200k spring steps、velocity ring、frame loop 分配。

**验收**：

- motion core 单测；reduced-motion 切换即时生效；
- 无每帧数组/闭包分配（bench 对比）；
- TUI/ DOM 共用同一 Spring 数学。

### P1-2 Select v2

- `groupBy`、`appearance`（inline/small/base/large）、`surface`；
- `onHighlight` 预览/undo；
- controlled open；
- `numeric` 选择；
- agent-ui select panel 的 palette 分支继续用 controlled search-list；suggestions 在 P0-2 完成 inline layout 后再迁移。

### P1-3 Overlay / Focus 审计

- 统一 dialog/drawer/popover/menu-bar/command-palette 的：
  - initialFocus/restoreFocus/focus trap；
  - Escape/outside 只关最上层；
  - `aria-modal`/background inert/scroll lock；
  - dirty check。
- 现有 OverlayManager 已具备栈与 focus adapter；补齐 drawer/popover 的 `initialFocus`/`trapFocus` 与 TUI focus layer 映射。

### P1-4 i18n 默认文案

- common 增加轻量 `UiI18n` token（`t(key, fallback, params)`），组件默认文案从 token 读取；
- 不硬编码业务语言；agent-ui 传入 translator；
- 逐步覆盖 close/empty/loading/retry/aria 默认文案。

### P2-1 交互式 catalog / 视觉回归

- 现有静态 catalog 增加：
  - 可切换 props；
  - keyboard matrix 自动执行；
  - DOM 截图/快照、TUI 文本快照；
  - 主题切换预览。
- 目标：dialog/search-list/typeahead/select/field/data-table 六个核心组件纳入视觉回归。

### P2-2 Bench / 门禁 / 兼容

- common bench 扩展到 typeahead/list/search-list/overlay focus；
- 默认 gate 采用 calibration 缩放，保留 `SKIP_COMMON_BENCH=1` 逃生口；
- source-size 继续 ratchet；新增文件优先 controller/machine 拆分。

## 8. 迁移顺序

1. 状态机 + tests（不改 UI）。
2. SearchList v2 内部切换，agent-ui command palette 保持 controlled 模式。
3. Field v2 接入 text/search/inline/dynamic-form。
4. Theme v2 生成器替换静态 token，保留导出别名。
5. Motion v2 + frame loop。
6. Select v2 + overlay/focus 审计。
7. agent-ui `/` suggestions 迁到 SearchList（先 inline row layout 等价）。
8. catalog 交互化 + bench/gate 扩展。

## 9. 风险与对策

| 风险 | 对策 |
| --- | --- |
| 状态机改造导致现有 typeahead 行为变化 | 保留 `source(query,signal)` API；旧测试全部保留；新增测试先红后绿 |
| SearchList section/sticky 在 TUI 无法用 CSS | 只把测量/滚动抽象成 host adapter，TUI 用窗口模型；DOM 用 CSS |
| Field v2 改变 DOM 结构破坏宿主样式 | 保留 `ui-field-group` 兼容入口与既有 class；新增 context 不强制替换 |
| Theme v2 影响 agent-ui/web 视觉 | 先快照对比；保留四套旧主题别名；host 仍可只覆盖 CSS 变量 |
| Motion 每帧分配回归 | bench 纳入 gate；frame loop 使用侵入式链表 |
| `/` 菜单迁移降级 | 先实现 inline row layout/select-rows 命中；未达标不迁移 |

## 10. 验收总表

| 阶段 | 关键指标 |
| --- | --- |
| P0 | typeahead/search-list/select machine 单测；DOM/TUI 键盘矩阵；common 全量测试不降 |
| P1 | theme 对比度与快照；motion bench；overlay focus 审计；select group/preview |
| P2 | catalog 交互示例；视觉/文本快照；bench/gate；source-size |

完成标准：不删除功能、不改变默认行为、DOM/TUI 语义一致、所有新增热路径有 bench、所有新增交互有真实 renderer 测试。


## 11. 实施进度（2026-11-27）

### 已完成

- **P0-1 typeahead 状态机**：`typeahead/src/typeahead.machine.ts`
  - debounce、cache、stale rows、15s timeout、retry、attempt 丢弃过期响应；
  - 组件保留原有 `source(query, signal)` / `value` / `selectAction` API；
  - `test/typeahead-machine.spec.ts` + 原 typeahead 测试通过。
- **P0-2 SearchList 增量**：
  - controlled 模式 `showInput=false` + `selectedId`；
  - `rowLayout: inline`（TUI label/description 同行，agent-ui palette 已使用）；
  - `open`、`scrollTop`/`scrollAction`、`Ctrl/Alt+↑↓` section 跳转；
  - async `debounce` / `cache` / `requestTimeout`；
  - sticky group header CSS（DOM skin）；
  - DOM + console renderer 测试覆盖 inline/section/open/debounce/cache/timeout。
  - agent-ui Ctrl+P command palette 与 `/` suggestion menu 已迁到 common search-list
    （controlled + inline row layout）；首屏预算改为 feature-first：500 KiB 仅作为
    `WEB_INITIAL_GZIP_TARGET_KIB` opt-in，baseline 回归仍保留。
- **P0-3 Field 增量**：
  - `labelId`/`tooltipId`/`labelTooltip`，可聚焦 info affordance；
  - 与既有 `pending/valid/status` 语义共存；
  - `ui-field-group` 兼容入口保持不变。
- **P0-4 Theme 增量**：
  - `ensureContrast()`：按 WCAG 目标把前景色推向黑/白；
  - `themeTokens()` 对 fg/muted/accentFg/danger/success/warning 做最终对比度保障；
  - 新增 `resolveThemeTokens(theme, overrides)`，host 可覆盖单个语义 token；
  - 新增 `generateThemeTokens(anchors)` 与 `ThemeService.registerTheme()`，支持运行时品牌主题；
  - 新增 OKLCH `hexToOklch/oklchToHex/mixOklch`，品牌 ramps 使用感知均匀插值；
  - 对比度测试覆盖 unparseable/低对比/品牌覆盖输入。
- **P2 bench**：`bench:check` 增加 typeahead machine 与 theme contrast 指标，并默认进入 agents gate（`SKIP_COMMON_BENCH=1` 可跳过）。
- **agent-ui**：command palette / `/` suggestion 已切到 `ui-search-list`；web size
  baseline 更新为当前构建，初始 gzip 目标改为 opt-in（feature-first）。
- **P1-2 Select 增量**：新增 `select-preview.ts` 与 `highlightAction`，高亮预览返回
  undo；切换/关闭/销毁时正确 revert，选择后进入 committed。
- **P1 i18n defaults**：新增 `UI_I18N` token，SearchList/Typeahead/CommandPalette 的
  placeholder/empty/loading/retry/recent/aria 默认文案可由 host translator 本地化；
  agent-ui 注册 `UI_I18N` 并提供中文 `ui.common.*` 文案。
- **P1 inline rename**：`tab-bar` 支持 `rename` + `ui-inline-input`（DOM 双击/F2），
  agent-ui session tabs 通过 `sessionTabsAction.rename` 持久化标题；键盘/重命名逻辑
  拆到 `tab-bar.keys.ts` / `tab-bar.rename.ts` 控制体积。
- **P1-1 Motion 增量**：
  - `createFrameLoop()`：host scheduler、read-before-write、dt clamp、无每帧数组分配；
  - `Spring.fromDuration()` + `resting`；
  - 测试覆盖 frame loop、异常任务、duration/bounce spring；
  - `observeReducedMotion` 与 ring-buffer `VelocityTracker2D` 已补。

### 待办

- typeahead/search-list 仍缺 section sticky/fade 的 DOM 测量与 TUI 窗口适配（当前 sticky 仅 CSS）。
- Field v2 仍缺 context + prefix/suffix 组合与 dynamic-form 全量委托。
- Theme v2 仍缺 OKLCH ramp/light-dark 生成器与多主题 JSON。
- Motion 仍缺 reduced-motion 实时订阅、2D ring VelocityTracker、WAAPI adapter。
- Select preview/undo、overlay focus 审计、交互式 catalog/bench 扩展仍在 P1/P2。
