# Node-RED 对标复审与组件优化方案（2026-11-27）

> 范围：最新 `packages/components/common`（74 个目录 / 65 个 catalog widget）
> 及其消费者 `activities`（节点配置、workflow 设计器）与 `agents/agent-ui`。
> 参考：Node-RED 1.x editor（typedInput、editableList、node editor hooks、
> config nodes、palette/search、debug sidebar）。
> 原则：保持 renderer-neutral 单模板、Proxy 响应式、DOM/TUI 同一语义；
> 不复制 Node-RED 的 jQuery/DOM 注入模式，也不复制其品牌。

## 1. 最新基线

### 1.1 已具备能力

- 74 个目录、65 个 catalog 条目；新增 `field`、`search-list`、
  `command-palette`、`typeahead`、`inline-input`、`motion`、`bench`、`catalog`。
- 表单：`dynamic-form` + widget registry（DI/schema）、异步/外部校验、
  `setIssues`、typed codec、typed-value widget、可搜索/多选引用、列表行 widget、
  行排序/摘要。
- 选择：autocomplete（搜索/异步/分组/多选 chips）、typeahead、search-list、
  command-palette、select（多选/分组/type-ahead/组合键）、tree/tree-select/
  cascader/transfer。
- 数据：data-table（排序/多排序/过滤/清除/分页/多选/展开/固定列/列宽/列顺序/
  持久化/异步 source/虚拟窗口/编辑/列选择器）、pager/scroll-box。
- 交互：dialog/drawer/popover 的 overlay 栈、scroll lock、焦点陷阱/恢复、
  Tab 循环、beforeClose、tooltip/popover flip/shift/portal、menu/toolbar 溢出、
  tabs 溢出、toast provider、motion token。
- 质量：DOM/TUI 测试、ARIA/键盘矩阵、a11y/focus 契约、catalog demo/属性表、
  component bench、source-size gate。
- 主题：`THEME_TOKENS` + `--ui-*` 投影；workflow 设计器、agent web console
  已桥接宿主主题变量。

### 1.2 Node-RED 的优势

| 能力 | Node-RED | 说明 |
| --- | --- | --- |
| typedInput | 每个类型独立编辑器/校验/补全/展开 | msg/flow/global/env/json/jsonata/bool/num/bin/date/cred |
| editableList | 自定义整行控件、排序、过滤、add/remove hooks | 规则/端口/映射类配置体验成熟 |
| node editor hooks | `oneditprepare`/`oneditsave`/`oneditcancel` | 节点可注入任意配置面板 |
| config nodes | 选择 + create/edit + 使用计数 | broker/TLS 等共享配置 |
| palette/search | 搜索、分类、drag/drop、quick add | 编辑器入口统一 |
| debug sidebar | 过滤、表格式消息检查 | 运行期排障 |
| subflow | 内嵌子流程画布/端口生成 | 组合复用 |

Node-RED 的弱项：jQuery 手工 DOM、浏览器专用、校验/焦点/a11y 不一致、
缺少 schema/测试/跨平台，正是当前 common 已明显超过的部分。

## 2. 当前优缺点（相对 Node-RED）

### 优点

1. **配置模型可扩展**：`DynamicFormWidget` + DI registry，节点配置可注册组件，
   不需要修改 inspector；Node-RED 的 node hooks 也可以映射到该模型。
2. **校验一致**：字段/schema 异步校验、外部 issues、warning/error、typed codec
   validate、焦点首错，DOM/TUI 共用。
3. **typed input 已落地**：per-source 编辑器、引用/多选引用、表达式编辑/预览、
   上次运行补全；Node-RED 的 typedInput 仍是最完整的对标项。
4. **选择/数据基础强**：autocomplete/typeahead/search-list/command-palette、
   data-table 的过滤/异步/虚拟/列管理，超过 Node-RED 的调试表。
5. **浮层/可访问性**：共享 overlay/focus/scroll-lock/ARIA 矩阵；Node-RED 无同等约束。
6. **跨平台**：同一模板 DOM/TUI；Node-RED 仅浏览器。
7. **质量/性能**：catalog、bench、source-size、a11y 矩阵、异步 race 测试。

### 仍需补齐

| 缺口 | 影响 | 现状 |
| --- | --- | --- |
| typed input 的 msg/flow/global/env 路径**补全** | 复杂表达式/引用易输错 | typeahead 已有，未接入 typed widget |
| 字段 pending/valid/async 状态透传 | 校验时无“检查中/有效”反馈 | `field` 组件有，dynamic-form widget 未转发 |
| 节点级自定义配置面板（oneditprepare 等价） | 插件/复杂节点只能靠字段拼 | 只有字段 widget，没有节点级 sections/插槽 |
| 整行 editableList 编辑/拖拽/模板 | 规则/端口行只能子字段组合 | list 行支持子字段 widget，未支持整行 editor |
| 表单错误摘要分组/折叠 | 大配置面板错误分散 | inspector 有 issue 列表，未按 group/severity |
| 调试/消息检查 | 运行期排障弱于 Node-RED debug sidebar | run-log 为主，未复用 data-table/search-list 过滤 |
| palette/quick-add 统一 | 编辑器入口行为不一致 | workflow 自有 palette，未复用 command-palette/search-list |
| 主题 token 全覆盖 | 宿主组件仍存在局部 fallback/尺寸 | 已桥接 workflow/agent，但仍有局部样式 |
| 视觉/axe/RTL/触控门禁 | 语义测试为主 | 已有 a11y 矩阵；缺截图/axe/mobile |

## 3. 优化方案

### P0：节点配置体验补齐（1-2 迭代）

#### 3.1 字段状态契约（Field/Widget）
- `DynamicFieldWidget` 增加并透传：
  - `pending`（异步校验中）
  - `valid`（已校验通过）
  - `status`（`default|pending|valid|invalid`）
  - `asyncError`（与同步错误区分）
- dynamic-form 在 `validateOn:'change'` 时把字段 async 状态写入 widget；错误摘要
  使用同一状态。
- 验收：typed/ref widget 显示“检查中/有效”，错误不闪烁；DOM/TUI 测试。

#### 3.2 typed input 路径补全
- `DynamicFormTypedSource` 增加：
  - `completion?: 'msg' | 'flow' | 'global' | 'env' | 'node' | 'jsonata'`
  - `completionSource?(query, signal): Promise<{ items, total? }>`
- 新增 `typed-completion` helper，复用 `typeahead`/autocomplete 的请求序号与
  abort 语义；输入 `msg.`/`flow.` 时提供已有路径/上次运行路径。
- 验收：Change/switch/inject 的类型化字段可补全 `payload.*`、`flow.*`、
  `global.*`、`env.*`、`node.*`；无候选时保持可输入。

#### 3.3 节点编辑器 sections（Node-RED oneditprepare 等价）
- 新增 `WorkflowNodeEditorContribution`：
  - `type`
  - `sections: Array<{ id, label, component, order?, visible? }>`
  - 由 `WORKFLOW_NODE_EDITORS` token 注册，inspector 在 dynamic-form 后渲染。
- 共享组件通过 widget/field 上下文获得 `{ node, values, setConfig, issues }`；
  禁止 DOM 注入，仍由模板组件渲染。
- 迁移示例：HTTP/loop/subprocess 的高级选项分成 section；插件节点可加自定义面板。
- 验收：不修改 inspector 即可新增节点配置区块；TUI 未知 section 降级不崩溃。

#### 3.4 表单错误摘要与焦点
- `DynamicFormSchema.issueGroups`/inspector 生成按 group + severity 折叠摘要；
  warning 与 error 分区，点击摘要聚焦字段。
- `focusFirstFormError` 在 TUI 走宿主焦点层，DOM 走真实 focus；已有基础。
- 验收：大配置面板一次定位所有错误；提交后首个错误可见。

#### 3.5 可重复列表整行编辑
- 增加 `DynamicFormField.rowEditor?: string`（注册 widget）和：
  - `rowActions`（上移/下移/复制/删除）
  - `addTemplates`（规则/映射模板）
  - DOM drag + TUI Alt+↑/↓；保留现有 reorder。
- 复用 `list` 窗口化与 widget 回调；整行 widget 回写不可变数组。
- 验收：switch rules/HTTP headers/subflow ports 可用整行组件、复制/拖拽。

### P1：编辑器壳与数据工作台（2-3 迭代）

#### 3.6 配置引用与库
- 引用选择器使用 `typeahead/search-list` 异步加载与使用计数；缓存按 library
  revision 失效；create/edit 复用现有 picker。
- 缺失引用 inline issue（已实现）保持。

#### 3.7 Palette / Quick add / Command palette
- workflow palette 搜索与 quick-add 迁移到 common `command-palette`/
  `search-list`，共享分组、最近使用、键盘与空态。
- 保留 palette item drag/drop；TUI 用同一数据源与键盘。

#### 3.8 调试/消息检查
- 运行日志复用 `data-table`/`search-list`：按节点/级别/关键字过滤，消息详情
  进入统一 detail panel；TUI 窗口化行与固定 header。
- 不引入 msg.parts/streaming 非目标。

#### 3.9 DataTable / Tree 高级
- DataTable `groupBy`/树形行/编辑校验/列选择器内建到表头；server 模式统一
  pending/filters/sorts/selection 跨页。
- Tree filter（保留祖先）、visible window、drag reorder；TreeSelect 多选 chips。
- 复用 selection policy 与 focus 工具。

### P2：视觉与质量门禁（持续）

#### 3.10 Overlay/Selection policy
- 统一 `SelectionPanelPolicy`/`OverlayPolicy`：portal、placement、collision、
  outside、enter/exit animation（DOM CSS，TUI 立即）、嵌套 inert。
- Select/Autocomplete/Typeahead/Popover/Drawer 共用；reduced-motion 降级。

#### 3.11 token 全消费
- 所有 common 组件仅使用 `--ui-*` token；删除局部硬编码尺寸/颜色 fallback
  （保留合理默认值）。
- workflow/agent-ui 以外的宿主按同一桥接方式迁移；catalog 增加 theme 预览。

#### 3.12 质量矩阵
- axe-core DOM fixture、Playwright/HTML 截图（状态 × 主题）、TUI PTY 关键帧、
  触摸/RTL；bench 增加选择面板/表格/表单分组指标。
- catalog 增加 live demo/状态切换；README 属性表与 catalog 同源。

## 4. 优先级与首个切片

1. P0-3.1/3.2：Field 状态透传 + typed 路径补全（用户最常操作）。
2. P0-3.3/3.4：节点 sections + 错误摘要（复杂节点配置）。
3. P0-3.5：整行规则编辑（switch/HTTP/ports）。
4. P1-3.7/3.8：palette 与 debug 工作台统一。

**首个垂直切片**：
- 在 `dynamic-form` 透传 pending/valid，typed widget 接入 typeahead；
- 用 `WorkflowNodeEditorContribution` 给 http-request 增加“高级”section；
- 用现有 catalog 增加 live 示例并补 DOM/TUI/键盘测试；
- bench 记录 typed completion 与 sections 投影耗时。

## 5. 验收指标

- 节点配置：新增节点配置区块只需注册 contribution；typed 字段路径补全可用；
  规则行可整行编辑/排序/复制；错误摘要可按组定位。
- 质量：a11y 矩阵、axe、截图、TUI 帧、bench、source-size 全部通过。
- 跨平台：DOM/TUI 的同一 widget/section 语义一致，未知 widget/section 降级。
- 不降级：现有 Node-RED 对标项、typed codec、引用、校验、catalog 行为保持。

## 6. 非目标（保持记录）

- Node-RED `msg.parts` 流式、CSV `multi` 单行多消息、二进制 Buffer；
- HTTP proxy、HTML scraping selectors、内嵌 subflow canvas；
- 不复制 Node-RED 的任意 DOM/jQuery 注入；扩展一律通过 renderer-neutral
  widget/contribution。
