# 组件库对标 MUI / Ant Design：展示、操作与 TUI 一致性评估及优化方案

> 日期：2026-11-26
> 范围：`packages/components/common` 的重点交互组件，以及 `agents/agent-ui`、
> `activities` 等消费者对共享组件的使用方式。
> 参考：Material UI (React)、Ant Design、Radix/Headless UI 的交互原则。
> 原则：对标**信息架构、状态层级和操作细节**，不复制品牌与视觉；保持
> renderer-neutral 单模板、Proxy 响应式、DOM/TUI 共用状态与键盘契约。

## 1. 结论摘要

### 1.1 已经形成的优势

1. **一套状态驱动两端**：DOM 与 TUI 共用模板、状态和键盘规则；
   `focusable`、`data-*`、ARIA 与终端焦点层共同承载交互语义。
2. **键盘与焦点基础扎实**：Tabs/TabBar、Tree、Toolbar、MenuBar、Select、
   Autocomplete、SearchList、Cascader、TreeSelect、DataTable 都有 roving /
   Arrow / Home / End / Enter / Escape 的实现，并有选择组件 parity fixture。
3. **浮层基础统一**：`OverlayManager` 提供栈、Escape、beforeClose、焦点恢复；
   Dialog/Drawer/Popover 已有滚动锁；Tooltip/Popover 已有翻转和视口位移。
4. **配置表单深度较高**：typed value、规则列表、异步选项、异步校验、首个错误
   聚焦、widget registry，已经超过多数通用组件库的表单原语。
5. **反馈组件可用性强**：Toast 支持 action、优先级、暂停/恢复、容量；
   Progress/Spinner 使用共享 `AnimationClock`，并支持 reduced motion。
6. **质量基础好**：单测 + DOM 集成 + 真实 TUI surface 测试 + catalog 文档，
   且新增组件持续保持 700 行源码门禁。

### 1.2 仍然明显落后的地方

按影响排序：

1. **视觉系统仍是“组件变量集合”，不是完整 design system**
   MUI/AntD 的“专业感”来自统一的字号、密度、圆角、阴影、状态层级和动效；
   当前大量组件各自维护 fallback 值，跨组件的层级关系不稳定。
2. **复杂组件的“组合能力”不足**
   Button 无 ButtonGroup/link/loading spinner；Select 无多选/分组/类型筛选；
   Tree 无 checkbox/multi/lazy；Accordion 无分组单开；Toast 无全局 provider。
3. **表单的“工作流”还不完整**
   已有校验和首个错误，但缺少 dirty/touched 汇总、错误摘要、离开确认、
   pending/valid 的稳定视觉状态。
4. **DataTable 仍偏展示，不是完整数据工作台**
   缺少可编辑单元格/校验、列选择器、行分组/树行、完整服务端契约的可视反馈。
5. **浮层策略尚未完全产品化**
   缺 backdrop/inert、进出场动画、统一的 outside/portal 策略；Drawer 与
   Tooltip 的放置仍依赖宿主或局部实现。
6. **TUI 与浏览器的“对齐规则”没有被文档化**
   哪些能力 DOM-only、哪些用焦点替代 hover、哪些动效必须停用，目前靠实现约定，
   容易在新增组件时再次分叉。
7. **质量门禁仍偏功能测试**
   缺少视觉回归、全组件键盘矩阵、主题/密度 snapshot、自动 a11y 检查。

### 1.3 相对成熟度（粗略评分，用于排优先级）

| 维度 | 评分 | 说明 |
|---|---:|---|
| 语义与 ARIA | 4/5 | 重点交互组件已有 role/state 关联；复杂网格/树仍有缺口 |
| 键盘与焦点 | 4/5 | 基础导航完整；组合组件和编辑态尚未统一 |
| 状态模型 | 4/5 | loading/disabled/error/selected 覆盖较好；pending/valid/dirty 不完整 |
| 视觉一致性 | 3/5 | 有 CSS 变量，但缺统一 token 层级和标准密度 |
| 组合能力 | 3/5 | 单组件可用，组/工具栏/多选/懒加载等组合不足 |
| TUI 对齐 | 4/5 | 共享模板与 focusable 做得较好；溢出、动画、浮层仍需规则化 |
| 文档与示例 | 3/5 | catalog 有属性/键盘说明；缺“推荐用法/反例/视觉状态”示例 |
| 质量门禁 | 3/5 | 功能测试充分；缺视觉、a11y、跨主题回归 |

## 2. 对标原则：不要“像 MUI”，要“具备同样的操作契约”

MUI/AntD 值得学习的不是品牌色，而是以下稳定规则：

1. **状态齐全**：default / hover / active / focus-visible / disabled /
   loading / invalid / selected / read-only / pending。
2. **层级稳定**：标题、正文、辅助文本、错误、计数、操作区的位置与字重固定。
3. **操作可预期**：点击区域、键盘路径、焦点归还、关闭/确认、异步取消一致。
4. **组合自然**：ButtonGroup、InputGroup、Tabs+Panels、Tree+Checkbox、
   Table+Toolbar+ColumnChooser 等组合有明确边界。
5. **响应式与溢出**：先收起次要操作，再提供明确的“更多”入口，不突然出现
   左右翻页箭头（Tabs 已按此修正）。
6. **可访问性不是补丁**：ARIA 与焦点模型来自组件 anatomy，而不是渲染后追加。

## 3. 系统级差距

### 3.1 Design tokens 与视觉基线

| 项目 | 当前 | 对标目标 |
|---|---|---|
| 颜色 | 组件级 `--ui-*` fallback 分散 | 统一语义 token：surface/text/muted/border/accent/success/warning/danger/focus |
| 字体 | 各组件自定义字号/字重 | `display/headline/title/body/label/caption` 六级 + 标准行高 |
| 密度 | 大多只有单密度；Accordion 刚补 sm/md | 全组件 `size="sm|md|lg"`，TUI 默认 compact |
| 圆角/阴影 | 局部变量 | elevation 0–3 与 radius 0–2 的稳定映射 |
| 动效 | 部分 CSS transition；无统一时长/easing | motion token（fast/base/slow + ease）+ reduced-motion |
| 焦点环 | 多数组件有 focus-visible | 统一 ring 宽度、offset、颜色与高对比主题 |
| 状态 | hover/active/disabled 覆盖不均 | 全组件状态矩阵与 `data-state` 语义 |

### 3.2 行为基础设施

- **SelectionCore** 已统一扁平列表的 active/禁用跳过/循环/Home/End；仍需把
  type-ahead、分组、多选、异步状态纳入同一 contract。
- **OverlayPolicy** 已有滚动锁，但 backdrop/inert/outside/portal/动画未统一。
- **FieldCore** 已有 ARIA 与 hint/error 顺序；缺 pending/valid、错误摘要、
  dirty/touched 生命周期。
- **DataGridCore** 已有键盘/排序/过滤/列布局；缺编辑态、列选择器、行分组。
- **Motion** 目前是组件中的 CSS 变量；需要统一 token 与 DOM-only 降级规则。
- **TUI parity** 需明确“DOM 能力 → TUI 等价物”的映射表并纳入 review checklist。

### 3.3 DOM / TUI 能力映射

| 能力 | 浏览器 | TUI 等价物 |
|---|---|---|
| hover | CSS hover / pointer | 不使用；用 focus/active 或显式行状态 |
| 浮层 portal | 固定/绝对定位、碰撞翻转 | 可见屏幕内浮层或内联菜单；不插入流 |
| 动画 | CSS transition/keyframes | 共享 `AnimationClock`（Progress/Spinner）；其余立即完成 |
| 布局测量 | getBoundingClientRect | 不测量；使用显式 `maxVisible`/窗口数据 |
| 拖拽 | pointer/mouse | 上移/下移 action 与键盘命令 |
| 多列宽度 | 像素测量 | 字符宽度与固定预算 |
| 选中态 | ARIA + CSS | `focusable` + `data-*` + 高亮字形 |
| 溢出 | 菜单/滚动/收缩 | 单行窗口 + “…”菜单，不默认左右箭头 |

## 4. 重点组件逐项评估

### 4.1 Button / 操作面

**现状**
- variant/tone/size/shape、iconOnly、block、pressed、loading、disabled；
- 原生 button、`aria-busy`/`aria-pressed`、TUI `[ label ]`；
- 缺 loading spinner、固定宽度、ButtonGroup、link 形态、autoFocus、异步 action。

**对标**
- MUI：loading 保留内容宽度，spinner 与状态无缝切换；ButtonGroup attached。
- AntD：危险/幽灵/文本按钮、href 链接按钮、提交状态明确。

**方案**
1. loading 期间保留 label 槽位，可选 `spinner` 帧（共享 AnimationClock）。
2. 新增 `ButtonGroup`：roving tabindex、Arrow/Home/End、attached 边框与圆角。
3. `href` 时渲染 link 语义；保留 disabled/pressed。
4. `autoFocus`、`form`/`name`/`value` 提交属性由宿主显式开启。

### 4.2 Field / TextField / Form

**现状**
- label/for、hint/error、describedby、required、prefix/suffix/addon、password
  reveal、clear、count、IME 保护、Ctrl/Cmd+Backspace；
- dynamic-form 有异步校验、AbortSignal、首个错误聚焦、typed/list/widget。

**差距**
- 无 pending/valid 的稳定视觉与 `aria-busy`；
- 无错误摘要、dirty/touched/initial snapshot、离开确认；
- 错误与 hint 的显示策略、表单级 server error 的呈现仍需统一。

**方案**
1. Field 增加 `status`：`default | pending | valid | invalid`，统一 `aria-busy`；
2. 表单顶部错误摘要（可点击跳转字段）+ 首个错误聚焦；
3. `dirty/touched/initialValue` 快照与 `reset/undo` 契约；
4. `beforeLeave` 统一守卫，TUI 用确认菜单，浏览器用原生/浮层确认；
5. 异步校验保持请求序号 + AbortSignal，字段级 pending 不阻塞整表操作。

### 4.3 Select 家族

**现状**
- SelectionCore 已统一 active/禁用/Home/End/循环；
- Autocomplete 支持异步/分组/多选 chips；SearchList 支持异步/错误/重试；
- Cascader 列键盘、TreeSelect roving/wrap 已完成；
- Select listbox 支持键盘和 aria-activedescendant。

**差距**
- Select 无多选、分组、type-ahead、清空；
- Tree/TreeSelect 无 checkbox/multi/lazy/type-ahead；
- 各组件 empty/loading/error/retry 的视觉与朗读仍未完全统一；
- 浮层定位仍依赖局部 CSS，缺统一 portal/collision 能力。

**方案**
1. 在 SelectionCore 上增加 type-ahead、分组索引、多选模型；
2. Select 补齐 `multiple`、`groups`、`clearable`、`placeholder`、空态；
3. Tree 增加 `selectable: single|multiple`、checkbox、parent/child 级联、
   lazy load 与 type-ahead；
4. 统一选择面板 anatomy：label/value、active、selected、disabled、loading、
   error/retry、empty，DOM 用 ARIA，TUI 用相同文本与 focusable。

### 4.4 Dialog / Drawer / Popover / Tooltip

**现状**
- OverlayManager 栈/top-only Escape/beforeClose/焦点恢复；
- Dialog/Drawer/Popover 滚动锁；
- Tooltip 支持 delay、flip、cross-axis shift；Popover 支持 flip/shift。

**差距**
- 缺 backdrop/inert 背景、统一 outside click；
- Drawer 缺碰撞/placement 策略；Popover/Tooltip 未 portal；
- Dialog/Drawer 无进出场动画与 reduced-motion 统一；
- Drawer/Popover 的焦点陷阱与关闭归还仍需统一到 OverlayPolicy。

**方案**
1. 扩展 OverlayPolicy：`backdrop/inert/outside/portal/animation/initialFocus`；
2. 统一关闭顺序：beforeClose → 动画 → 卸载 → 焦点恢复；
3. Tooltip/Popover 使用 portal + 共享 placement/shift 解析；
4. Drawer 提供 `placement + size + collision`，窄屏/边缘自动调整；
5. 动画 token 化，`prefers-reduced-motion` 与 TUI 均立即完成。

### 4.5 Tabs / TabBar

**现状**
- 稳定 id/aria-controls/labelledby、roving、activationMode；
- 溢出默认单个 `…` 菜单（DOM + TUI），不再默认左右箭头；
- 关闭按钮可聚焦，关闭后焦点回到活动/相邻 tab；菜单 fixed 定位避免裁剪。

**差距**
- 无 tab 拖拽重排、无 tab 右键菜单（关闭其他/左侧/右侧）；
- 溢出菜单只提供选择，没有搜索/最近使用分组；
- 多行/收缩策略未定义（当前是菜单模式）。

**方案**
1. 保持“先窗口/菜单，后箭头”的默认策略；
2. 增加 `tabChangeAction(order)` 与键盘重排；
3. 右键/长按菜单：关闭、关闭其他、关闭右侧、复制标题；
4. 溢出菜单支持 type-ahead 搜索与当前活动标记；
5. 统一 close/create/more 的焦点顺序与 TUI 可点击区域。

### 4.6 DataTable

**现状**
- 排序/多列排序/过滤/分页/多选/展开/固定列/列宽拖拽/异步 source/
  虚拟窗口/网格键盘/列顺序与宽度持久化/重置布局。

**差距**
- 无单元格编辑与校验、无列选择器 UI、无行分组/树行；
- 服务端契约未覆盖所有操作的可视 pending/error；
- 列固定/重排仍以声明式为主，缺少完整的 column chooser。

**方案**
1. `editable` 单元格 + edit/commit/cancel + field error，复用 Field/TextField；
2. ColumnChooser（显示/隐藏/顺序/宽度/恢复默认）复用 Popover+Checkbox；
3. 行分组/树行 + 展开状态与 keyboard 一致；
4. 服务端 source 统一 `{page,pageSize,sorts,filters,signal}` 的 pending/error；
5. 响应式：窄屏优先隐藏低优先级列，提供“列”菜单而非横向挤压。

### 4.7 MenuBar / Toolbar / Accordion

**现状**
- MenuBar：子菜单、type-ahead、Escape/焦点归还、可选 Overlay；
- Toolbar：roving、Home/End、溢出菜单、Enter/Space 激活；
- Accordion：sm/md、default/plain/card、展开动画、reduced motion。

**差距**
- Menu 缺 `menuitemradio`/`menuitemcheckbox`、二级以上子菜单；
- Toolbar 无拖拽重排、无自动响应式断点；
- Accordion 无 group/单开模式、无 heading 语义包装。

**方案**
1. Menu 增加 radio/checkbox 状态与分组分隔；
2. Toolbar 增加 `overflowMode` 与拖拽重排 action；
3. Accordion 增加 `accordion` 单开容器（group context）与可选 headingLevel；
4. 统一键盘矩阵：Menu/Toolbar/Accordion rows 的 Enter/Space/Arrow 行为。

### 4.8 Tree / TreeSelect

**现状**
- Tree roving、selectionFollowsFocus、wrapFocus、Home/End/Arrow/Enter；
- TreeSelect 方向键 rove、Enter/click 提交、焦点归还。

**差距**
- 无 checkbox/multi-select、lazy load、filter/type-ahead；
- TreeSelect 只支持单选；
- 树与列表的选择模型尚未共享多选语义。

**方案**
1. Tree 增加 `selectable: single|multiple` + checkbox 级联/半选；
2. `loadChildren(node)` 异步加载 + loading/error/retry；
3. TreeSelect 支持 multiple + chips，复用 SelectionCore 的 selected 集合；
4. 树过滤与 highlight，保持 TUI 用纯文本/焦点表达。

### 4.9 Feedback（Toast / Tooltip / Progress / Spinner）

**现状**
- Toast action、priority、pause/resume、pauseAll、容量；
- Tooltip delay/flip/shift；
- Progress/Spinner AnimationClock + reduced motion + localizable label。

**差距**
- 缺全局 Toast provider/portal 与队列策略（只提供 stack 组件）；
- Tooltip 未 portal，嵌套滚动容器中仍可能被裁剪；
- Toast action 的错误/成功后状态没有统一约定；
- Spinner 尺寸/颜色 token 未统一。

**方案**
1. 增加 `ToastProvider`（portal/位置/最大宽度/队列策略），保留现有 service；
2. Tooltip portal + 共享 placement；
3. Spinner 使用统一 size/tone token；
4. 文档化 feedback 的 aria-live/role/优先级规则。

## 5. DOM / TUI 展示对齐方案

### 5.1 同一个 anatomy，不同的 skin

每个重点组件固定以下语义结构（类名/`data-*`/ARIA 一致）：

- root：尺寸、tone、状态、方向；
- header/label/control：可聚焦元素与 aria 关联；
- content/options/rows：列表或正文；
- actions：主/次/危险/关闭；
- feedback：loading/empty/error/retry/count。

DOM 与 TUI 只允许在**measured layout、hover、transition、portal** 上不同。

### 5.2 统一状态矩阵

所有交互组件至少覆盖：

`default / hover / active / focus-visible / disabled / loading / invalid /
selected / read-only / pending`。

TUI 将 hover 映射为 focus/active；将动画映射为立即完成；将 portal 映射为
可见屏幕内浮层或内联菜单。

### 5.3 视觉规则

- 标题、正文、辅助文本、错误文本的字号/字重/颜色层级固定；
- 操作区与内容区的间距使用同一密度 token；
- 危险动作只使用 danger tone，不通过布局“挤”出来；
- 焦点环在浅色/深色/高对比主题都有可见对比；
- 图标只表达语义，不承担唯一的可访问名称。

### 5.4 溢出策略（以 Tabs 为基准）

1. 优先窗口/收缩/菜单，不默认出现左右箭头；
2. 溢出入口只有一个，位置稳定（通常尾部）；
3. 菜单列出隐藏项并支持键盘；
4. 浏览器可滚动，但必须有明确的“更多”入口；
5. TUI 使用同一菜单数据源，不插入滚动位置。

## 6. 分阶段实施计划

### P0（先解决“专业感”和核心工作流）

| # | 任务 | 验收 |
|---|---|---|
| P0-1 | Design token 基线：颜色/字体/密度/圆角/阴影/动效/焦点 | 组件无散落硬编码；catalog 跨主题截图一致；TUI 有对应 density |
| P0-2 | Button loading/固定宽度 + ButtonGroup + link 形态 | 加载不跳宽；键盘循环；DOM/TUI 测试 |
| P0-3 | Field 状态 `pending/valid` + 表单错误摘要 + dirty/touched | 首个错误聚焦；离开确认；ARIA 状态完整 |
| P0-4 | Select 多选/分组/type-ahead，Tree 多选/checkbox/lazy | 选择键盘矩阵覆盖全部选择组件 |
| P0-5 | OverlayPolicy：backdrop/inert/outside/portal/动画 | 嵌套浮层、Escape、焦点恢复、滚动锁一致 |
| P0-6 | DataTable 编辑单元格 + 列选择器 + 服务端 pending/error | 编辑提交/取消/校验；列配置持久化；DOM/TUI 一致 |

### P1（组合与专业细节）

| # | 任务 | 验收 |
|---|---|---|
| P1-1 | Tabs 拖拽重排 + tab 上下文菜单 | 键盘重排；关闭其他/右侧；焦点稳定 |
| P1-2 | Menu radio/checkbox 语义与多级子菜单 | role/menuitem* + Arrow/Escape 完整 |
| P1-3 | Toolbar 响应式断点 + 拖拽重排 | 溢出只出现一次；TUI 显式 maxVisible |
| P1-4 | Accordion group/单开模式 + heading 语义 | 多 section 单开；ARIA 与动画一致 |
| P1-5 | ToastProvider/portal + Spinner token | 全局堆叠；暂停/优先级/容量；主题一致 |
| P1-6 | Tooltip portal + 统一 placement/shift | 滚动容器/边缘不被裁剪；TUI 降级 |

### P2（质量与生态）

| # | 任务 | 验收 |
|---|---|---|
| P2-1 | 全组件键盘矩阵 fixture | 同一按键序列覆盖所有交互组件 |
| P2-2 | 视觉回归与主题快照 | light/dark/high-contrast、DOM/TUI 对比 |
| P2-3 | 自动 a11y 检查 | label/role/aria/描述关系无回归 |
| P2-4 | catalog 示例升级 | “推荐用法/错误用法/状态矩阵”示例 |
| P2-5 | 性能与真实 PTY 回归 | TUI CPU、帧率、socket 积压达标 |

## 7. 质量门禁建议

1. **Keyboard matrix**：每个交互组件至少覆盖 Arrow/Home/End/Enter/Space/
   Escape/Tab/禁用跳过；选择组件共用同一 fixture。
2. **DOM/TUI parity fixture**：同一状态在 `ConsoleRenderer` 与 `HtmlRenderer`
   输出相同语义文本/焦点可达性。
3. **ARIA snapshot**：验证 label、describedby、expanded、selected、busy、
   invalid、activedescendant。
4. **视觉回归**：每组件 default/hover/focus/disabled/error/loading 六态，
   light/dark/high-contrast 三主题。
5. **性能纪律**：组件改动不进入 reactive 热路径；不新增轮询/业务定时器；
   动画使用共享 AnimationClock 或 reduced-motion 降级。
6. **源码体量**：保持 700 行 ratchet；复杂逻辑优先抽 controller/helper。

## 8. 风险与边界

- **不能为了 Web 效果牺牲 TUI**：portal/hover/动画必须提供 TUI 降级。
- **不能一次性重写**：优先新增 opt-in 属性与兼容默认，避免破坏工作流/agent-ui。
- **不能复制品牌**：只对齐层级、状态、键盘、可访问性和密度。
- **不能把视觉问题都交给宿主 CSS**：共享组件必须给出稳定默认 skin 和 token。
- **不能以“单测通过”代替真实交互**：关键改动必须有真实 DOM/TUI/PTY 证据。

## 9. 建议的下一批 10 个任务

1. 统一 token 与 density（含 TUI compact）。
2. Button loading spinner + 固定宽度。
3. ButtonGroup。
4. Field pending/valid + 错误摘要。
5. Select multiple/groups/type-ahead。
6. Tree checkbox/multi/lazy。
7. DataTable editable cell。
8. DataTable ColumnChooser。
9. Overlay backdrop/inert/portal。
10. Tabs 拖拽重排与 tab 上下文菜单。

完成 P0 后，组件库应达到：**MUI/AntD 级别的状态完整性与组合能力，同时保留
本项目独有的 DOM/TUI 单模板优势**。
