# 组件库对标 MUI / Ant Design：2026-11-27 复审与下一阶段优化方案

> 日期：2026-11-27
> 范围：`packages/components/common` 及其消费者（`agents/agent-ui`、`activities`）。
> 前序文档：`component-parity-plan-2026-11-26.md`（首轮差距审计）。
> 参考：Material UI (React)、Ant Design、Radix/Headless UI、Chrome tab strip。
> 原则：对标信息架构、状态层级、操作细节和专业观感，不复制品牌；保持
> renderer-neutral 单模板，DOM/TUI 共享状态与键盘契约。

## 1. 本轮结论

首轮 P0–P2 已落地：design token 基线、Button/Field/Form、Select 多选/分组/
type-ahead、Tree checkbox/多选/懒加载/级联/type-ahead、DataTable 编辑/列选择器、
Overlay backdrop/inert、Tabs 溢出菜单/拖拽/上下文回调、Menu checkbox/radio、
Toolbar 溢出/拖拽、Accordion group、ToastProvider、Spinner/Tooltip/Popover portal。

组件库已从“可用组件集合”进入“有统一操作契约的组件库”阶段，但与 MUI/AntD
相比仍有四类明显差距：

1. **token 已存在但未全面消费**：组件仍保留大量局部 fallback 与各自字号/密度，
   Design System 尚未成为唯一视觉来源。
2. **复杂组件的组合层未完成**：DataTable 行分组/树行/编辑校验、Select 异步/
   tags、Tree 过滤/虚拟化、Tabs 内置上下文菜单、Menu 多级子菜单。
3. **浮层仍未完全产品化**：Select/Autocomplete 面板未 portal；Drawer/Popover
   碰撞定位仍依赖宿主；缺退出动画与统一 outside 策略。
4. **质量门禁仍偏语义测试**：已有 keyboard/visual-a11y contract fixture，
   但缺真实截图视觉回归、自动 axe 检查、移动端/触摸验证。

## 2. 当前相对成熟度

评分用于排序，不是绝对标准。

| 维度 | 评分 | 说明 |
|---|---:|---|
| 状态完整性 | 4.2/5 | loading/pending/valid/invalid/selected/disabled 覆盖明显提升 |
| 键盘/焦点 | 4.5/5 | 选择、树、表格、tab、toolbar、menu 均有契约测试 |
| 视觉一致性 | 3.8/5 | 已有语义 token，但尚未强制所有组件消费 |
| 组合能力 | 4/5 | ButtonGroup、AccordionGroup、ToastProvider、ColumnChooser 已补齐 |
| DOM/TUI 对齐 | 4.3/5 | 溢出菜单、portal、checkbox、拖拽降级规则已成形 |
| 浮层专业性 | 3.8/5 | backdrop/inert/scroll lock/翻转已具备；动画与 portal 未全覆盖 |
| 数据工作台 | 3.8/5 | 编辑/列选择器已具备；分组/树行/编辑校验仍缺 |
| 文档/示例 | 3.8/5 | catalog + examples 已有；缺可视状态与 live demo |
| 质量门禁 | 3.8/5 | 语义/键盘/a11y fixture 已有；缺截图与 axe |

## 3. 与 MUI / Ant Design 的逐项差距

### 3.1 Button / action surfaces

**现状**：loading spinner、原 label 槽位、ButtonGroup、link button、pressed/
disabled/tone/size/shape。

**仍缺**
- ButtonGroup 没有 attached 状态样式之外的“选择组”语义（MUI ToggleButtonGroup）；
- 没有异步 action 的 pending/error 约定（MUI LoadingButton / AntD Button loading）；
- 没有 icon position、danger confirm、tooltip 内置集成；
- TUI 没有 ButtonGroup 的快捷键提示/状态摘要。

**方案**
1. 新增 `ToggleButtonGroup`（单选/多选，roving，aria-pressed）。
2. Button `action` 支持 Promise 返回值，自动维护 pending/error + 防重复提交。
3. `iconPosition`、`dangerConfirm`（可选确认步骤）。
4. ButtonGroup 在 TUI 输出 `[ A | B | C ]` 并复用同一 roving。

### 3.2 Field / Form

**现状**：pending/valid、错误摘要、initialSnapshot、dirty/touched、leave guard、
async validation、IME、counter。

**仍缺**
- Field 的 pending/valid 没有完全透传到 dynamic-form widget；
- 错误摘要没有按 group/severity 分组；
- 缺 warning 与 error 的视觉/提交差异说明；
- 缺 `onTouched`/字段级 `validateOn` 覆盖；
- 缺表单级 reset/undo 的 UI 约定。

**方案**
1. `DynamicFieldWidget` 增加 `pending`/`valid` 透传，字段级 async 状态不阻塞整表。
2. 错误摘要按 group 分组，warning 单独区，可折叠。
3. `Reset`/`Undo` 明确恢复 initialSnapshot 或 schema default。
4. `beforeLeave` 提供浏览器确认与 TUI 选择菜单的共享 contract。

### 3.3 Select / Autocomplete / Tree

**现状**：多选/分组/type-ahead、checkbox 级联/半选、lazy load、SearchList 异步。

**仍缺**
- Select/Autocomplete 面板未 portal，滚动容器可能裁剪；
- Select 没有 async source/tags/load more；
- Tree 缺 filter/highlight、虚拟化和拖拽；
- TreeSelect 多选显示/清空/标签仍需宿主拼装；
- 选择类空态/loading/error 的视觉与 ARIA 仍未完全统一。

**方案**
1. 抽出 `SelectionPanelPolicy`：portal、placement、collision、outside、aria-live。
2. Select 增加 `loadOptions`/`onLoadMore`/`tags`，复用 Autocomplete 请求序号。
3. Tree 增加 filter（保留祖先）、visible window、drag reorder action。
4. TreeSelect 多选增加 chips/清空/最大标签数。
5. 所有选择面板统一 `listbox` + active descendant + loading/error/retry 结构。

### 3.4 Overlay / Tooltip / Popover

**现状**：OverlayManager 栈、scroll lock、Dialog/Drawer backdrop/inert、
Tooltip/Popover flip/shift/portal、Tooltip delay。

**仍缺**
- Drawer 的 placement collision、Popover 的固定定位仍以 host CSS 为主；
- 浮层退出动画与 reduced-motion 生命周期没有统一；
- outside click 只覆盖 backdrop，非 modal popover 依赖宿主；
- Select/Autocomplete 尚未使用 portal；
- 嵌套 overlay 的 inert 目前只覆盖 body 直接子节点。

**方案**
1. `OverlayPolicy` 统一 `backdrop/inert/outside/portal/animation/focus`。
2. 抽出 `resolveOverlayPosition`，Door/Popover/Select 共用。
3. 增加 enter/exit state machine（DOM CSS，TUI 立即完成）。
4. inert 改为“沿 overlay 祖先链”计算，支持嵌套。
5. 非 modal 浮层 outside click 使用共享 pointerdown capture。

### 3.5 Tabs / TabBar

**现状**：稳定 id/ARIA、activationMode、`…` 溢出、fixed 菜单、拖拽重排回调、
contextAction、关闭焦点。

**仍缺**
- 上下文菜单只是 host callback，没有内置 UI；
- 拖拽没有视觉 drop indicator/键盘重排；
- 溢出菜单没有搜索/最近使用排序；
- 关闭其他/右侧、复制标题等常用动作没有默认实现。

**方案**
1. 内置 `tabContextMenu` 菜单（Close/Close others/Close right/Copy）。
2. `reorderAction` 提供 drop indicator，并支持 Alt+Arrow 键盘重排。
3. 溢出菜单加入 type-ahead 和 active 标记。
4. TUI 使用同一菜单数据，保持单行/窗口模型。

### 3.6 DataTable

**现状**：多排序/过滤/分页/多选/展开/固定列/列宽/列顺序/持久化/网格键盘/
虚拟窗口/异步 source/编辑单元格/ColumnChooser。

**仍缺**
- 行分组与树形行；
- 编辑校验（field error/pending）；
- 列选择器尚未内建到 table header；
- 全量 server contract 的 pending/error/selection 跨页语义；
- 移动端/触控横向滚动和低优先级列折叠；
- 固定列表头列宽同步与 sticky 阴影层级。

**方案**
1. `groupBy`/`treeRows` 展平模型；group header 与 row selection 解耦。
2. `editable` 支持 field schema/validateAction，编辑失败保持编辑态。
3. 内建 `columns` 菜单按钮，直接复用 ColumnChooser。
4. server source 统一 `{page,pageSize,sorts,filters,signal}` 与 pending 状态。
5. 窄屏列优先级 `minWidth/priority`，提供列菜单。

### 3.7 Menu / Toolbar / Accordion

**现状**：Menu type-ahead/checkbox/radio/flyout；Toolbar overflow/drag/autoOverflow；
Accordion size/variant/group/animation。

**仍缺**
- Menu 多级（>1）子菜单与键盘进入/返回；
- Toolbar 在 TUI 的拖拽等价命令、移动端 touch 拖拽；
- Accordion group 没有内建 `headingLevel` 包装；
- Accordion 展开动画没有统一 motion token（已有 CSS 但未纳入 token 体系）。

**方案**
1. Menu recursive submenu + ArrowRight/Left/Escape 栈。
2. Toolbar `moveAction`（上移/下移）与 drag 共享 reorder action。
3. Accordion `headingLevel`/`headingComponent` 语义。
4. Motion token 统一到 `--ui-motion-*`。

### 3.8 Feedback / Provider

**现状**：Toast action/priority/pause/capacity/provider；Progress/Spinner clock/
reduced-motion；Tooltip delay/flip/shift/portal。

**仍缺**
- ToastProvider 没有队列优先级策略 UI（只是 service 数据）；
- Toast action 的 pending/disabled/error 状态；
- Spinner/Progress 的 size/tone token 已在但未覆盖所有主题；
- Snackbar/Notification 的“全局共享容器”与 aria-live 去重。

**方案**
1. Toast action 增加 pending/disabled/result 状态。
2. Provider 支持 notice/queue policy、max visible、priority 排序。
3. Progress/Spinner 使用统一 feedback token 与 aria-valuetext 本地化。

### 3.9 质量与文档

**现状**：DOM/TUI 测试、selection parity、interaction contracts、visual/a11y
contracts、catalog examples、bench。

**仍缺**：真实截图视觉回归、axe 自动检查、移动端触摸、RTL、catalog live demo。

**方案**
1. 建立 Playwright/HTML snapshot（或 JSDOM serializer）覆盖 6 状态 × 3 主题。
2. axe-core 集成到 DOM fixture。
3. PTY/TUI 关键字快照与焦点轨迹。
4. catalog 增加状态预览和可复制示例。

## 4. DOM / TUI 展示对齐规则（下一阶段执行）

| 能力 | 浏览器 | TUI |
|---|---|---|
| hover | CSS hover | focus/active 或显式行状态 |
| portal/碰撞 | fixed + shift | 可见屏幕内浮层或内联列表 |
| 动画 | CSS transition/animation | 立即完成；时间反馈用 AnimationClock |
| 拖拽 | pointer drag | `moveUp/moveDown` action + 键盘命令 |
| 列宽 | 像素测量 | 固定 token/字符宽度 |
| 触摸 | pointer/touch | 键盘/菜单 |
| 溢出 | 单个 more 菜单 | 单行窗口 + 同一 more 菜单数据 |
| 选中/半选 | ARIA + CSS | `focusable` + glyph + data 状态 |

新增组件必须提供：
- 默认（无宿主 skin）可用的语义结构与状态类；
- TUI 等价操作（不能只有 hover/pointer）；
- 键盘矩阵测试；
- 至少一个真实消费方回归。

## 5. 下一阶段路线图（Wave 2）

### P0（优先解决“专业感”和复杂工作流）

| # | 任务 | 验收 |
|---|---|---|
| P0-1 | token 全面消费 + 密度/主题映射 | 组件无新增硬编码颜色；light/dark/high-contrast contract 通过 |
| P0-2 | `ToggleButtonGroup` + 异步 Button action | pending/error/防重复；DOM/TUI 键盘 |
| P0-3 | Field pending/valid 透传到 dynamic-form widget + 错误摘要分组 | async 字段 pending 不阻塞表单；warning/error 分层 |
| P0-4 | Select tags/async、Tree filter/虚拟化、TreeSelect chips | 选择面板统一 loading/error/empty；键盘矩阵扩展 |
| P0-5 | Overlay 退出动画、outside、portal 全覆盖 | Drawer/Popover/Select/Tooltip 嵌套/边缘测试 |
| P0-6 | DataTable 行分组/树行 + 编辑校验 + 内建列菜单 | 分组选择、编辑错误保持编辑态、ColumnChooser 集成 |

### P1（组合与细节）

| # | 任务 | 验收 |
|---|---|---|
| P1-1 | Tabs 内建 context menu + 键盘重排 | Close/others/right + Alt+Arrow；菜单可访问 |
| P1-2 | Menu 多级子菜单 | 任意层级 ArrowRight/Left/Escape/Home/End |
| P1-3 | Toolbar TUI moveAction + 触控拖拽 | 两端 reorder 结果一致 |
| P1-4 | Accordion headingLevel + group 完整语义 | heading/region/aria 测试 |
| P1-5 | Toast action pending + Provider 队列策略 | 全局 aria-live；priority/maxVisible |
| P1-6 | Spinner/Progress feedback token | 三主题 + reduced motion |

### P2（质量与生态）

| # | 任务 | 验收 |
|---|---|---|
| P2-1 | 全组件键盘矩阵 | 同一按键矩阵覆盖所有交互组件 |
| P2-2 | 视觉回归截图（6 状态 × 3 主题） | DOM 截图基线 + 差异阈值 |
| P2-3 | axe 自动 a11y | label/role/aria 回归失败即门禁失败 |
| P2-4 | catalog live demo + 状态矩阵 | 文档可作为验收基准 |
| P2-5 | PTY/性能回归 | 真实 TUI 流式 turn 与 CPU 预算 |

## 6. 建议立即开工的 6 项

1. token 全面消费（先 Button/Field/Tabs/DataTable）。
2. Select/Tree 选择面板 portal + filter/virtual。
3. DataTable 行分组/树行 + 编辑校验。
4. Overlay 退出动画/outside/inert 祖先链。
5. Tabs 内建 context menu。
6. Playwright/axe 质量门禁。

目标：完成 Wave 2 P0 后，组件库在“状态完整性、键盘/焦点、复杂数据工作流、
浮层专业性、DOM/TUI 对齐”上达到可直接对照 MUI/AntD 评审的水平。

## 7. Wave 2 实施记录（2026-11-27）

已落地：

- P0-1～P0-6：token 基线、Button loading/ToggleButtonGroup、Field/Form 状态与错误摘要、
  Select/Tree/TreeSelect 组合能力、Overlay backdrop/inert/outside、DataTable 分组/树行/
  编辑校验/列选择器。
- P1-1～P1-6：Tabs 上下文菜单与键盘重排、Menu 三层子菜单、Toolbar 键盘/脚本重排、
  Accordion headingLevel、Toast 异步 action 与 Provider 容量、Spinner tone。
- P2-1：`test/interaction-contracts.spec.ts` 与各组件 DOM/TUI 键盘用例组成统一矩阵。
- P2-2/P2-3（确定性门禁）：`test/visual-a11y-matrix.spec.ts` 对 6 种状态 × 3 个主题
  运行真实组件 DOM 审计；`test/support/a11y-audit.ts` 检查可访问名称、ARIA 状态配对、
  haspopup/expanded、dialog 名称/模态与重复 id。该门禁随 `npm run test` 执行，不依赖
  位图基线，因此在 CI 与无 GPU 环境可稳定复现。

仍待后续：

- P2-2 的位图截图基线（需要固定字体/视口的 Playwright 快照与差异阈值）。
- P2-4 的 live demo 状态切换器与 P2-5 的真实 PTY 性能基准。
