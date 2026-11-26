# 通用组件交互细节对标 MUI / Ant Design 与优化方案

> 范围：`packages/components/common` 的重点交互组件（Button、Field/TextField、
> Select 家族、Dialog/Drawer/Popover/Tooltip、Tabs/TabBar、DataTable、Form、
> Menu/Tree/Toolbar/Accordion、Toast/Progress/Spinner）。
>
> 目标：保留 renderer-neutral（DOM/TUI/XML 同模板）与 Proxy 响应式架构，
> 参考 MUI/Ant Design 的**操作细节**补齐键盘、焦点、异步、组合与可访问性，
> 不复制品牌与视觉。

## 1. 结论摘要

### 应保留的优点

1. **单模板跨端**：同一模板由 DOM/TUI renderer 绘制，状态与文本天然一致；
   这是多数 Web 组件库（MUI/AntD）不具备的约束和优势。
2. **Proxy 响应式**：状态写入直接驱动绑定，无 per-component signal/订阅；
   `dynamic-form`、agent-ui、工作流设计器共享状态成本低。
3. **语义契约稳定**：`ui-*` selector、`data-*`、ARIA、tone/size 与 catalog
   测试，为多宿主复用提供基础。
4. **配置表单深度**：typed value、规则列表、引用选择、可见性/校验、widget
   registry，已超过 MUI/AntD 通用表单原语。
5. **基础设施已成形**：`OverlayManager`、`Field`/`Typeahead`/`SearchList`、
   `AnimationClock`、motion/theme token、catalog 与 DOM/TUI 测试。

### 核心问题（按影响排序）

1. **选择类组件行为碎片化**：`Select`、`Autocomplete`、`Typeahead`、
   `SearchList`、`Cascader`、`TreeSelect`、`MenuBar` 各自实现键盘、焦点、
   异步、空态/错误，快捷键和 ARIA 不一致。
2. **交互契约只覆盖“能点/能跑”，缺少操作细节**：加载保持宽度、输入法组合、
   长按/重复、类型筛选、焦点归还、滚动锁定、嵌套浮层、取消/重试等。
3. **DataTable 缺少网格级键盘与列配置**：有排序/分页/展开/虚拟化/固定列，
   但没有单元格/行焦点模型、列可见性/顺序/持久化、多列排序、可编辑单元格。
4. **Tabs/TabBar 的 ID/ARIA 关联不完整**：tab 与 tabpanel 未稳定互链，
   关闭按钮的焦点/朗读、溢出导航的键盘细节不一致。
5. **浮层策略分散**：Dialog/Drawer/Popover/Tooltip 的 backdrop、滚动锁、
   外点关闭、延迟、碰撞翻转、嵌套恢复尚无统一策略。
6. **反馈组件偏薄**：Toast 无 action/优先级/暂停策略；Tooltip 无 delay/
   intent；Progress/Spinner 的 reduced-motion 与 aria 文本未统一。
7. **质量门禁偏“单测通过”**：缺少键盘矩阵、DOM/TUI 语义 parity fixture、
   真实交互路径的视觉/焦点回归。

## 2. 重点组件逐项分析

评分维度：键盘 / ARIA / 状态模型 / 异步 / 组合性 / TUI 一致性 / 文档示例。

### 2.1 Button（MUI Button / AntD Button）

**现状优点**
- variant/tone/size/shape（round/circle）/iconOnly/block/pressed/loading。
- 真实 `<button>`，disabled/loading 阻止 action，`aria-pressed`/`aria-busy`。
- TUI 以 `[ label ]` 表达按钮，和终端语义一致。

**操作细节差距**
- loading 只改文本，没有共享 `AnimationClock` 驱动的 spinner；切换时宽度跳动。
- 无 ButtonGroup / attached buttons（相邻按钮共享边框、圆角、键盘循环）。
- 无 `href`/link 形态、`autoFocus`、`form`/`name`/`value` 提交语义。
- 无 async action 的 pending/error 约定（宿主重复实现）。

**优化**
- `loading` 期间保持原 label 宽度（隐藏文本占位），增加可选 spinner 帧；
  `aria-busy` + `aria-live="polite"`。
- 新增 `ButtonGroup`（roving tabindex、Arrow/Home/End、attached 皮肤）。
- `href` 时渲染 link 语义并保留 disabled/pressed；支持 `autoFocus`。
- 文档补“提交中/失败重试”示例，避免宿主各自实现。

### 2.2 Field / TextField（MUI TextField / AntD Input）

**现状优点**
- label `for`、`aria-describedby`、`role="alert"` error、required、invalid。
- `Field` 统一 label/hint/error，dynamic-form 已复用。
- TUI 使用真实 input/textarea，可聚焦编辑。

**操作细节差距**
- 无 prefix/suffix/addon、password 显隐、`maxLength` + 计数、`inputMode`/
  `autocomplete`/`enterKeyHint`。
- 无“异步校验中/成功”状态；错误与 hint 同时存在时的朗读顺序未定义。
- 清除按钮是 `<button>`，TUI 会出现 `[ ✕ ]`；缺少键盘清除快捷键。
- 无受控/非受控边界说明；blur 提交与 Enter 提交的组合策略不统一。

**优化**
- Field/TextField 统一 `prefix`/`suffix` 投影、`addonBefore/After`、
  `maxLength` 计数、password toggle（`aria-pressed`）。
- 增加 `pending`/`valid` 状态与 `aria-busy`；错误优先级固定：
  error > hint，`aria-describedby` 顺序固定。
- clear 使用 `data-plain` 或统一二次确认策略；支持 Ctrl/Cmd+Backspace 清空。
- 补 IME composition 处理：组合输入期间不触发提交/过滤。

### 2.3 Select 家族（Select / Autocomplete / Typeahead / SearchList / Cascader / TreeSelect / Menu）

**现状优点**
- SearchList/Typeahead 已有异步 source、AbortSignal、loading/error/retry、
  `aria-activedescendant`、recent/group。
- Autocomplete 支持同步/异步 options；Cascader/TreeSelect 有层级路径。
- TUI 输入框 + 行点击可用。

**主要问题**
- **七套键盘/打开/关闭/选中语义**：有的用 input、有的用触发按钮、有的用树；
  Enter/Escape/Arrow/Home/End/Tab/类型筛选/清空行为不一致。
- `Select` 的 DOM listbox 不可聚焦，没有 `aria-activedescendant`；
  多选、分组、type-ahead、清空、禁用组缺失。
- Autocomplete 选项在 TUI 不可聚焦（依赖 input 键盘），与 SearchList 的
  active row 模型不同。
- 异步状态重复：Autocomplete、Typeahead、SearchList 各写 loading/error/
  abort，Select/Cascader/TreeSelect 没有统一异步契约。
- 无统一浮层定位/碰撞/滚动策略，长列表在窄终端与浏览器行为不同。

**优化（P0，最高优先）**
- 抽 `SelectionCore`（纯逻辑）：
  - `query`、`items`、`activeIndex`、`open`、`disabled`、`loading/error`、`retry`；
  - `handleKey(event, mode)` 统一 Arrow/Home/End/PageUp/PageDown/Enter/
    Escape/Tab/type-ahead；
  - `select`/`clear`/`toggle`/`isSelected` 支持单选/多选；
  - 异步 source + request seq + AbortSignal。
- 各组件只保留“呈现形态”：
  - Select = listbox/group/multi；
  - Autocomplete/Typeahead = combobox + 输入过滤；
  - SearchList = 无输入/受控 active 的通用列表；
  - Cascader/TreeSelect = 层级列/树，共享 open/active/ARIA。
- 统一 `activeDescendant`/option id 生成，TUI 选项可聚焦；
  关闭后焦点回到触发控件。
- 统一空态/loading/error/retry 文案与 `aria-live`；多选显示 chips。
- 验收：一张键盘矩阵测试覆盖所有选择组件的同一按键序列。

### 2.4 Dialog / Drawer / Popover / Tooltip

**现状优点**
- OverlayManager：栈、top-only Escape、beforeClose、焦点恢复；
- Dialog 支持 focus trap/initialFocus/restoreFocus/aria-modal/plain close；
- TUI 行内面板/关闭按钮，DOM 焦点可恢复。

**操作细节差距**
- 无统一 backdrop/scroll lock/inert background/外点关闭策略；各宿主自行实现。
- Tooltip：无 open/close delay、hover intent、碰撞翻转、portal；focusable
  默认 false，TUI 需要宿主打开。
- Popover/Drawer placement 只给 class，实际定位由宿主 CSS 负责；
  窄屏/边缘无自动翻转。
- Escape 语义分散：Dialog 走 OverlayManager，Drawer/Popover 仍本地 close；
  嵌套时可能出现双重关闭或焦点跳到错误层级。
- 无关闭动画/`prefers-reduced-motion` 统一契约。

**优化**
- 新增 `OverlayPolicy`：`modal/backdrop/scrollLock/closeOnOutside/
  closeOnEscape/initialFocus/restoreFocus/inert`；四类浮层共用。
- 统一注册/注销/嵌套顺序；Escape 只由栈顶处理；关闭后焦点按栈恢复。
- Tooltip 增加 `openDelay/closeDelay/portal/collision`；TUI 用 focus 打开。
- Drawer/Popover 提供 `placement` + 边缘翻转工具函数（DOM 测量，TUI 忽略）。
- 动画统一走 motion token，减动效时立即完成。

### 2.5 Tabs / TabBar

**现状优点**
- roving tabindex、Arrow/Home/End/Enter/Delete、TabBar overflow、关闭/新建；
- TUI 已补 focusable，方向键可切换。

**操作细节差距**
- tab 与 tabpanel 未稳定 `id`/`aria-controls`/`aria-labelledby` 互链；
- 关闭按钮是 `role=button`，浏览器不在 Tab 序列，朗读名称不包含 tab 名；
- 无 `activationMode`（automatic/manual）；
- 溢出时浏览器原生滚动，键盘无法滚动 strip；
- 关闭当前 tab 后的焦点目标未统一（相邻/最后/新建）。

**优化**
- 生成稳定 id：`tab-<id>` / `panel-<id>`，补齐 `aria-controls/labelledby`。
- `activationMode="automatic"|"manual"`；手动模式下 Enter/Space 激活。
- 关闭按钮 `aria-label="Close <tab>"`，可通过 Delete 关闭；关闭后焦点按
  “相邻 → 最后 → 新建”规则。
- 溢出：Arrow 到边缘时自动滚动 strip；Home/End 首尾。
- TUI/DOM 共用同一 tab 键盘状态机与焦点规则。

### 2.6 DataTable（AntD Table / MUI DataGrid）

**现状优点**
- 排序、过滤、分页、异步 source、虚拟窗口、多选、展开行、固定列、列宽拖拽、
  loading/empty/error、caption/aria-rowcount。
- TUI 有行文本/选择 glyph/详情行；DOM/TUI 共享数据投影。

**操作细节差距**
- 无网格键盘模型（单元格/行焦点、Arrow/Home/End/PageUp/PageDown、Enter 编辑）。
- 无列可见性/顺序/宽度持久化；拖拽只存在内存，刷新丢失。
- 无多列排序/排序优先级；服务端分页/排序/过滤契约只覆盖部分。
- 无行分组/树形数据/可编辑单元格/校验；固定列只支持声明宽度累加偏移。
- 过滤只有数据层 `filters`，无表头过滤控件/清除全部的可访问交互。

**优化**
- 增加 `grid` 键盘模式：roving cell/row、`aria-colindex`/`rowindex`、
  Enter/Space 进入编辑/展开；Tab 离开表格。
- 列配置：`hidden/order/width` 可受控，`columnChangeAction`；本地持久化由宿主。
- 多列排序：`sorts: {key,direction}[]`，排序优先级可视。
- 服务端契约：`source({page,pageSize,sorts,filters,signal})` 统一；选择跨页语义明确。
- 表头过滤组件（复用 Field/Select）与“清除全部”按钮；固定列偏移基于实际测量。

### 2.7 Form / DynamicForm

**现状优点**
- schema、widget registry、typed value、规则列表、可见性、inline issues、
  字段 ARIA、异步选项（widget/DI）。
- 比 MUI/AntD 的通用表单更贴近企业配置。

**操作细节差距**
- 无异步校验/服务端错误注入的统一状态；提交后不自动聚焦第一个错误。
- 无 dirty/touched 汇总、离开确认、重置到初始值/撤销。
- 布局密度/列/分组折叠不统一；长表单无可访问的错误摘要。
- 自定义 widget 的 fallback 与错误边界需明确（TUI 降级）。

**优化**
- `validationMode`（onChange/onBlur/onSubmit）+ 异步 validator（AbortSignal）。
- 错误摘要 + `focusFieldAction(firstInvalid)`；错误字段 `scrollIntoView`。
- dirty/touched/initial snapshot；表单级 beforeLeave。
- 统一 grid/columns/density；field group 支持描述与操作区。

### 2.8 MenuBar / Tree / Toolbar / Accordion

**现状优点**
- MenuBar：键盘开合、子菜单、OverlayManager 可选、ARIA；
- Tree：roving、Arrow/Home/End、展开/折叠、aria-level/selected；
- Toolbar：roving、跳过 disabled；
- Accordion：header button、aria-controls/region、TUI inline。

**差距**
- MenuBar 无 type-ahead、二级以上子菜单、菜单项分组 radio/checkbox 语义。
- Tree 无多选/checkbox/异步加载/type-ahead/lazy；TreeSelect 只单选。
- Accordion 行（items）不是可聚焦按钮；无多开/手风琴模式、拖拽重排。
- Toolbar 无溢出菜单（窄屏折叠到 “…”）。

**优化**
- Menu：type-ahead、`menuitemradio`/`menuitemcheckbox`、二级子菜单。
- Tree：`selectable: single|multiple`、checkbox、lazy load、type-ahead。
- Accordion：`accordion` 单开模式、行 role/键盘、拖拽排序 action。
- Toolbar：overflow 计算与 `…` 菜单（DOM/TUI 共享数据）。

### 2.9 反馈（Toast / Tooltip / Progress / Spinner）

**优点**：AnimationClock、live region、tone、indeterminate 扫描、ARIA。
**差距**：Toast 无 action/优先级/暂停 hover；Tooltip 无 delay；Progress 的
`aria-valuetext`/reduced-motion 未统一；Spinner 无尺寸/颜色 token 说明。
**优化**：Toast action + priority + pauseOnHover；统一 feedback provider；
Progress 的 aria 文案与 reduced-motion；Spinner 复用 motion token。

## 3. 横向优化设计

### 3.1 交互契约矩阵（P0）

为每个交互组件建立一张表：
`组件 | 打开 | 关闭 | 移动 | 选择 | 清除 | 多选 | 焦点归还 | TUI 差异`
测试直接从矩阵生成键盘用例，避免“每个组件各写一套”。

### 3.2 共享控制器（P0）

- `SelectionCore`：选择类组件统一 active/open/query/async/多选。
- `OverlayPolicy`：浮层统一 backdrop/scroll lock/inert/focus/escape。
- `FieldControl`：label/hint/error/prefix/suffix/password/count/aria。
- `FocusScope`：焦点陷阱/恢复/嵌套；DOM 与 TUI 适配。

### 3.3 DOM/TUI Parity Harness（P1）

- 同一 fixture 同时渲染 DOM 与 `TuiTerminalSurface`，断言语义文本、ARIA
  （DOM）与可见状态（TUI）。
- 键盘矩阵在两种 renderer 上执行同一序列。
- 视觉回归只针对稳定语义 class，不绑定像素。

### 3.4 Catalog 与文档（P1）

- 每个组件 catalog 增加“键盘/焦点/空态/错误态/TUI 行为”说明与可执行示例。
- 新增属性必须同步 catalog，否则测试失败。

### 3.5 质量门禁（P2）

- `prefers-reduced-motion`、焦点可见、对比度 token 测试。
- 交互路径性能：长列表/表格滚动、虚拟窗口、浮层打开关闭的帧预算。
- 真实 PTY/TUI 键盘回归（已有基础，扩展到选择/浮层/表格）。

## 4. 分阶段路线图

### P0（1–2 个迭代，先解决不一致与高风险）

1. `SelectionCore` + 选择组件键盘矩阵；Select 多选/分组/type-ahead；
   统一 activeDescendant/焦点归还/空态/异步。
2. `OverlayPolicy`：backdrop/scroll lock/inert/outside/escape/focus 统一；
   Tooltip delay/portal；Drawer/Popover 边缘翻转工具。
3. Field/TextField：prefix/suffix/addon/maxLength/password/IME；
   clear 的 TUI 语义与键盘快捷键。
4. Tabs/TabBar：id/aria-controls/labelledby、activationMode、关闭焦点规则。
5. Form：异步校验、错误摘要、首个错误聚焦、dirty/touched。
6. 验收：新增键盘矩阵 + DOM/TUI parity 测试，全部通过；不改变既有公开 API。

### P1（2–3 个迭代）

1. DataTable：网格键盘、列配置/持久化、多列排序、服务端契约完善、
   表头过滤控件。
2. MenuBar type-ahead/二级菜单；Tree 多选/checkbox/lazy；
   Accordion 单开模式 + 行键盘。
3. Toast action/priority/pause；Progress/Spinner reduced-motion。
4. Catalog 增加交互说明与示例；生成属性表。

### P2（长期）

1. 可编辑 DataTable（cell edit + validation + undo）。
2. TreeSelect/Cascader 全量委托 SelectionCore；虚拟化列/树。
3. 统一 feedback provider、motion 物理与 perf 预算。
4. 真实 PTY + 浏览器交互回归流水线。

## 5. 验收标准

- 每个交互组件有：键盘矩阵用例、ARIA 断言、空/loading/error 状态用例、
  DOM/TUI 语义 parity 用例。
- 选择类组件在同一按键序列下行为一致（差异必须显式配置并有测试）。
- 浮层嵌套时 Escape 只关闭栈顶，焦点按栈恢复，backdrop/滚动锁可配置。
- DataTable 支持纯键盘浏览/排序/分页/展开，列配置可受控并持久化。
- 表单一处错误可被屏幕阅读器朗读并自动聚焦；异步校验可取消。
- 所有改动保持旧 props/selector 兼容；TUI 无 DOM 专属 API 依赖。
