# @tsdi/components/common 组件优化方案（对标 Node-RED）

> 范围：`packages/components/common` 的通用组件与 `dynamic-form` 配置表单。
> 目标：在保持 renderer-neutral（DOM / TUI / XML）与现有行为不降级的前提下，
> 补齐 Node-RED 在“节点配置”上的关键能力，并把可复用能力沉淀到 common。

## 1. 现状基线

### 1.1 已有能力

- 60+ 个 renderer-neutral 组件：表单、选择、列表、表格、树、对话框、抽屉、
  标签、步骤、统计、上传、分页、Toast、Pager、语法 token 等。
- `dynamic-form` 提供声明式字段模型：类型、分组、可见性、规则校验、typed 值
  （literal/msg/flow/global/env）、typed codec、可重复列表、key/value 行、
  字段动作、JSON 行/原文切换。
- 同一套模板在 DOM 与 TUI 渲染；语义 class / `data-*` / ARIA 稳定。
- 组件级测试较完整：catalog、DOM 与纯状态测试共 137 个；`ui-*` 选择器、
  `tone`/`size`、布尔属性归一化等约定有测试锁定。
- 刚修复的对话框滚动契约：标题/操作固定，仅 body/list/select rows 滚动。

### 1.2 与 Node-RED 的主要差距

| 能力 | Node-RED | 当前 common | 影响 |
| --- | --- | --- | --- |
| typedInput | 每类型有独立编辑器/校验/补全/展开（msg/flow/global/env/json/jsonata/bool/num/bin/date/cred） | 只有统一文本 + 前缀 source；各宿主自行扩展 | 节点配置需要大量宿主侧代码，难以保证一致性 |
| 自定义字段控件 | 节点可在 `oneditprepare` 里插入任意 jQuery 控件 | 字段类型封闭在 `DynamicFormFieldType`，无控件注册 | 新节点/复杂配置必须改 common 或退化成 textarea |
| 可重复列表 | editableList：添加/删除/排序/自定义行/过滤 | 基础 add/remove，无排序、无自定义行组件、无行汇总 | 规则/端口/映射类配置体验弱 |
| 校验 | jQuery 校验 + 节点自定义，但一致性一般 | 规则校验是同步的；无异步/服务端校验、无外部 issue 注入、无提交聚焦 | 表达式/引用/跨字段错误只能在运行/发布时暴露 |
| 对话框 | jQuery UI dialog：焦点陷阱、Esc、遮罩 | 有 Esc/ARIA/尺寸；缺焦点陷阱/恢复/初始焦点/脏检查/提交状态 | 键盘与可访问性不足 |
| 选择器 | 大量 options/autocomplete；typedInput 内建补全 | select / autocomplete / tree-select / cascader 各自实现；无统一搜索+异步+分组组合框 | 行为碎片化，TUI/DOM 键盘细节不一致 |
| 数据表 | 调试/上下文表、过滤 | 排序/分页/展开/固定列/选择已具备；无异步数据源、列筛选/可见性、虚拟化 | 大数据/服务端分页场景受限 |
| 主题 | 一套 CSS 变量 + 主题 | `--ui-*` + 各宿主 CSS（agent-ui、workflow 设计器） | 样式重复、主题覆盖易互相打架 |
| 文档/示例 | 节点帮助 + 编辑器示例 | README 目录 + 单测；无可交互 catalog/属性表 | 采用成本高，回归靠读源码 |

Node-RED 的强项主要是“配置编辑器的可扩展性”，弱项是 jQuery/DOM 绑定、
校验一致性与可访问性。优化方向不是照搬插件模型，而是用 schema + widget
registry + 异步校验，把可扩展性做成框架能力。

## 2. 优化原则

1. **保持 renderer-neutral**：新能力通过语义组件/属性实现，禁止在 common 中
   引用 html/console 或按平台分支。
2. **schema 仍是纯数据**：新增字段属性必须可 JSON 序列化；函数型扩展走
   provider token 或字段 widget 注册表。
3. **渐进增强**：未知/自定义 widget 在 TUI 缺失时回退到 `text`/`textarea`，
   不允许配置页因平台缺失而不可用。
4. **不降级既有功能**：旧 schema/旧字段/旧文档继续可用；新属性全部可选。
5. **单一职责 + ratchet**：`dynamic-form.ts` 已接近 700 行，新增能力落到
   `widgets/`、`validation/`、`list/` 子模块，保持文件预算。

## 3. 目标能力设计

### 3.1 DynamicForm widget registry（P0）

解决“Node-RED 每个节点可自定义编辑器”的等价问题，但不允许任意 DOM 注入。

```ts
// dynamic-form/src/dynamic-form.widgets.ts
export interface DynamicFormWidgetContext {
    field: DynamicFormField;
    value: any;
    values: Record<string, any>;
    error?: string;
    disabled: boolean;
}

export interface DynamicFormWidget {
    /** schema 中的 widget 名，例如 typed-input / rule-list / reference / code */
    type: string;
    /** renderer-neutral 组件（模板由 common 组件描述） */
    component: Type<unknown>;
    /** TUI/无 DOM 环境的降级字段类型 */
    fallback?: 'text' | 'textarea' | 'json';
    /** 值编码/解码；默认直接使用原值 */
    decode?(value: any, field: DynamicFormField): any;
    encode?(value: any, field: DynamicFormField): any;
}

export const DYNAMIC_FORM_WIDGETS = createToken<DynamicFormWidget[]>('dynamic-form.widgets');
```

- `DynamicFormField` 新增可选 `widget?: string`；`DynamicFormSchema` 新增
  `widgets?: DynamicFormWidget[]`。
- `dynamic-form.template.ts` 用一个 `v-switch`/动态组件出口渲染注册 widget；
  未注册时按 `fallback` 渲染，不抛错。
- 首批内置 widget：
  - `typed-input`：typed source 下拉 + 每 source 编辑器 + 字段动作（ƒ 表达式）；
  - `key-value` 增强：类型列（string/number/boolean/json/expression）；
  - `rule-list`：规则行（operator + typed value + 删除/排序）；
  - `reference`：资源选择 + create/edit 动作（从 activities 的
    `buildReferenceView` 抽象，宿主只提供 options/actions）；
  - `code` / `expression`：宿主提供编辑器组件（CodeMirror 只在宿主层加载）。
- 宿主扩展方式：activities 在自己的 module 里注册 widget，不修改 common；
  `widgets` 可来自 DI token，避免每处 schema 重复传数组。

验收：现有 activities 检查器里的 typed value、reference picker、规则列表可以
由注册 widget 重建，DOM/TUI 行为与当前一致；未知 widget 在 TUI 降级不崩。

### 3.2 异步 / 外部 / 跨字段校验（P0）

```ts
export interface DynamicFormValidationContext {
    value: any;
    values: Record<string, any>;
    field: DynamicFormField;
    signal?: AbortSignal;
}

export interface DynamicFormIssue {
    key: string;
    message: string;
    severity?: 'error' | 'warning';
}

export interface DynamicFormField {
    /** 同步或异步；返回 message 即失败 */
    validate?(value: any, context: DynamicFormValidationContext):
        string | undefined | Promise<string | undefined>;
}

export interface DynamicFormSchema {
    /** 提交/变更后运行的跨字段校验 */
    validate?(values: Record<string, any>, signal?: AbortSignal):
        DynamicFormIssue[] | Promise<DynamicFormIssue[]>;
}
```

- `DynamicFormComponent.setIssues(issues)` 注入宿主校验结果（服务端/引用/
  表达式预加载），进入 `validationErrors` 并参与 `validityAction`，字段修改时
  清除对应 issue（与 activities 现有 inspector issue 列表合并）。
- 异步校验带请求序号/AbortSignal，过期结果丢弃；字段显示 validating 状态
  （DOM/TUI 都只是文本/属性，不需要新渲染分支）。
- `submit()`：标记 touched → 运行 schema 校验 → **聚焦第一个错误字段**
  （浏览器 `focus()`，TUI 由宿主映射；common 只发 `focusFieldAction(key)`）。
- `validateOn: 'change' | 'blur' | 'submit'`（默认现状），避免每次按键请求。
- 表达式语法校验继续由宿主预加载 JSONata；common 不引入 jsonata。

验收：活动层现有 `validateWorkflowConfigs` 的必填/引用/表达式/凭据错误可通过
`setIssues` 显示在字段下方；修复后自动清除；提交时聚焦首个错误。

### 3.3 typed input 统一（P0/P1）

把 activities 现有 typed value 体验下沉为 common widget：

- sources：literal/string/num/bool/json/regex/expression/msg/flow/global/env/node；
- 每 source 的编辑器：bool 用 select，json 可展开 raw/结构化，regex 显示
  正则错误，expression 走宿主编辑器动作，env/context 支持补全；
- codec 仍由宿主注入（activities 的 `{type,path}` 存储不变），common 只负责
  展示与交互；旧 `msg.` 前缀字符串继续兼容；
- completion provider：静态补全 + 上次运行路径（宿主提供）合并去重。

验收：Change/switch/inject 等节点的值编辑无需在 activities 内维护第二套
typed 控件；DOM/TUI 的 source 选择、禁用、错误、补全一致。

### 3.4 可重复列表 / 规则构建器（P1）

扩展现有 `list` 字段：

- `reorder?: boolean`：DOM 拖拽 + 上下按钮，TUI 使用 Ctrl+↑/↓ 或行动作；
- `rowWidget?: string`：整行使用注册 widget（Node-RED editableList 的等价）；
- `rowSummary?(item, index)`：折叠时显示“字段 = 值”摘要；
- `rowTitleKey?`、`minItems`/`maxItems` 已有；新增 `addLabel` 菜单模板；
- 行级 `validate`/issue 显示；删除确认可选；
- 内部复用 `ListComponent` 的窗口化，避免大规则集全量渲染。

验收：switch rules、assign mappings、HTTP headers、subflow ports 等配置可
显示行摘要、调整顺序、行级报错；TUI 键盘可完成同样操作。

### 3.5 select / autocomplete 统一为 combobox（P1）

当前 select、autocomplete、tree-select、cascader、select-trigger 各有行为。
建议新增共享 `combobox` 语义层（不是删除旧组件）：

- `searchable`、`group`、`loadOptions(query)`（异步 loading/empty/error）、
  `multiple` + chip、`create` 动作、`renderOption` 由 widget 提供；
- 统一键盘/ARIA：Arrow/Home/End、PageUp/PageDown、Enter、Escape、Tab 关闭；
- DOM：锚定浮层；TUI：同一窗口模型 + 固定标题/提示；
- `select`/`autocomplete`/`tree-select` 逐步委托到该层，保留旧 props/alias；
- 合并重复的 `maxHeight`/`visibleCount`/`window` 逻辑。

验收：`/model`、`/provider`、`/sessions`、节点引用选择器共享同一套搜索/异步/
键盘行为；现有组件测试不改语义。

### 3.6 Dialog / Drawer 契约补齐（P1）

在刚完成的“只滚动 body”基础上：

- `focusTrap`（浏览器）：打开时聚焦首个可交互元素，Tab 循环，关闭恢复原焦点；
  TUI 由宿主把焦点层映射到 overlay；
- `autofocus`、`initialFocus`、`restoreFocus` 开关；
- `beforeClose?: () => boolean | Promise<boolean>`：脏检查/异步提交；
- `submitting`、`submitError`、错误摘要插槽；`actions` 插槽固定 footer；
- 共享 overlay 管理器：宿主只挂载一次，避免每个消费者重复写
  `position:fixed` 与滚动样式（agent-ui/workflow 设计器目前各有一套）；
- 统一“payload/body 滚动、header/footer 固定”的 class 契约
  （`.ui-dialog-header` / `.ui-dialog-body` / `.ui-dialog-footer`），并加回归测试。

验收：配置弹窗、审批、命令面板、设计器对话框全部：header/footer 不随内容滚；
Tab/Esc 行为一致；关闭时焦点回到触发元素。

### 3.7 DataTable（P2）

- 异步/服务端模式：`loadPage({ page, pageSize, sort, filters })`、`total`、
  `loading`/`error`、`retryAction`；保留本地模式；
- 列配置：`hidden`、`width`、`align`、`filters`、`sortKey`、`render`（widget）；
- 行操作/批量操作区固定 footer；
- TUI 窗口化行 + 固定表头；
- 导出/复制（宿主 action 即可，不内置文件 API）。

验收：调试/运行历史/Audit/部署列表可使用异步分页与列筛选；DOM/TUI 排序、
分页、选择语义一致。

### 3.8 MenuBar / Command palette（P2）

- menu-bar：溢出折叠（`⋯`）、分组/快捷键展示、roving tabindex、typeahead；
- 新增通用 `command-palette`（基于 combobox）：搜索命令/节点/资源，分组、
  最近使用、快捷键盘导航；供 workflow 设计器 palette 与 agent 命令菜单复用；
- 统一“菜单/对话框 overlay”锚定与滚动契约。

### 3.9 主题与视觉 token（P2）

- 固化 `--ui-*` token：颜色（tone/state）、间距、字号、圆角、层级、动画；
- `installUiStyles` 提供 neutral skin，宿主只覆盖 token，不再复制组件选择器；
- 收敛 agent-ui/web/console.css 与 workflow 设计器样式中的通用 widget 规则；
- 增加 light/dark/solarized/high-contrast 对比度与 token 完整性测试
  （纯计算，不需要截图）。

### 3.10 文档、catalog 与质量门禁（P3，持续）

- 组件 catalog 页（用 common 自己渲染）：每组件示例、属性表、DOM/TUI 预览、
  键盘说明；元数据从组件/测试生成，避免 README 手工漂移；
- 属性表契约测试：README/catalog 必须覆盖所有 `@Attribute`；
- 键盘/ARIA 矩阵测试：每个交互组件至少覆盖 Tab/Enter/Space/Escape/方向键；
- TUI parity harness：用 ANSI screen buffer 断言 DOM 与 TUI 的结构/顺序一致；
- 性能基线：dynamic-form 大 schema、list 1k 行、data-table 1k 行、select 1k
  options、menu/palette 搜索；沿用 calibration 缩放预算；
- source-size ratchet 覆盖 common 的新子模块（已在上限 700 行内）。

## 4. 优先级与路线图

| 阶段 | 内容 | 价值 | 依赖 |
| --- | --- | --- | --- |
| P0（1-2 迭代） | widget registry、异步/外部校验、typed input widget、dialog 滚动/焦点契约测试 | 直接提升节点配置可扩展性与正确性 | 无 |
| P1 | 可重复列表增强、combobox 统一、field issues 接入 activities/agent-ui | 配置体验接近 Node-RED，减少宿主特判 | P0 |
| P2 | DataTable 异步/列配置、menu/palette、token 收敛 | 大数据后台与命令入口 | P1 |
| P3 | catalog、a11y/键盘矩阵、性能基线、文档生成 | 长期维护与采用成本 | 持续 |

建议先做 P0 的一个垂直切片：
1. `widgets.ts` + `typed-input` widget（用 activities 现有 codec 验证）；
2. `setIssues` + 异步字段校验 + submit 聚焦；
3. 用 workflow 检查器的 Change/switch 规则 + reference picker 迁移验证；
4. 同一提交补 DOM/TUI 测试与 bench，确认无功能回退。

## 5. 风险与约束

- **不要复制 jQuery widget 模型**：不提供任意 DOM 注入；widget 必须是
  renderer-neutral 组件，宿主编辑器（CodeMirror/JSONata）只通过 action/插槽接入。
- **schema 可序列化**：函数只放在字段属性（宿主构造 schema 时提供）或 token/
  provider 中，不写入持久化文档。
- **TUI 降级**：未知 widget/键盘不可用时必须回退到 text/textarea，并保留
  值编辑与校验；不能出现“浏览器能配、TUI 不能配”。
- **不重排现有 API**：新增属性可选；旧 typed 字符串、旧 `DynamicFormField`
  和现有 activities 迁移逻辑继续工作；alias 保留一个 minor 周期。
- **性能**：widget registry 解析、异步校验、combobox 过滤都要有缓存/请求序号；
  新增 common bench 指标并纳入门禁，避免每次按键全表校验。

## 6. 验收标准（整体）

- workflow 设计器：新增节点配置只需声明 schema + 注册 widget，不再修改
  `AgentConsole`/designer 单体；规则列表可排序/摘要/行级报错；表达式/引用
  错误在字段内联显示，提交时聚焦。
- agent-ui：命令/菜单/对话框共享 overlay 与键盘契约；TUI 与浏览器滚动、
  Tab/Escape、ARIA 一致。
- 质量：common 测试覆盖新增 widget/校验/combobox/表格异步模式；DOM/TUI
  parity、a11y、bench 全部通过；source-size 不增长。
- 文档：catalog 可直接运行并作为采用入口；README 属性表由 catalog 校验。

## 7. P0 落地进度（2026-11）

已完成并进入 common：

- **字段 widget registry**
  - `DynamicFormField.type: 'widget'` + `field.widget`；`DynamicFormSchema.widgets`
    注册 `{ type, component }`。
  - `DynamicFieldWidgetComponent` 负责创建/更新子组件，向 widget 传入
    `field`、`value`、`values`、`disabled`、`error`、`changeAction`；
    widget 组件应在方法里调用 `changeAction`（模板直接调用函数属性不保留上下文）。
  - 未知 widget 自动退化为 text input，不存在“浏览器能配、TUI 空白”的情况。
- **校验**
  - `DynamicFormField.validate` / `schema.validate` 支持 Promise；
  - `setIssues()` / `clearIssues()` 注入宿主或服务端问题，warnings 不阻塞；
  - `validateAsync()` / `submitAsync()` 忽略过期运行并聚焦首个错误；
  - `validateOn` + `validationDelay` 可开启 change/blur 自动校验；
  - typed codec 新增 `validate()`，错误进入字段错误与表单 validity。
- **typed input**
  - `DynamicFormTypedSource.input` 指定当前 source 的输入控件
    （text/number/password/url）；默认沿用字段类型。
- **可重复列表**
  - `reorder` 提供上/下移动；`rowSummary(item, index)` 提供行摘要；
    移动保持不可变数组更新，适配响应式列表刷新。
- **activities 接入**
  - workflow 检查器把宿主 issue 通过 `setIssues` 映射到所属字段，规则错误仍由
    dynamic-form 本地化显示；引用/表达式/凭据类问题直接显示在字段下。
  - `WORKFLOW_TYPED_CODEC.validate` 复用 typed literal 校验，Change/switch 等
    类型化值可在编辑时发现 JSON/regex/表达式错误。
- **拆分**
  - `dynamic-form.ts` 降到 667 行；normalize / projection / widgets / validation
    状态分别落在独立模块，避免 god-object。

测试：common 215 passing（widget DOM、异步/外部校验、typed codec、list reorder）；
components 194；activities 542 + 设计师 UI 96。'
