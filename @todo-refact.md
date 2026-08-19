# agent-ui 平台基础组件重构方案

## 目标

`@tsdi/agent-ui` 只保留 Agent Console 的业务组件、状态和交互逻辑，不声明、复制或选择 `div`、`span`、`br`、`label`、`input`、`textarea`、`select`、`panel` 等平台基础组件。

- `@tsdi/components/console` 定义并导出 TUI/Console 基础组件实现。
- `@tsdi/components/html` 定义并导出 Browser/DOM 基础组件实现。
- `@tsdi/components` 定义并实现框架级 schema 元数据、传播与模板校验能力。
- `@tsdi/components/common` 定义并导出跨 renderer 的基础组件、公共契约和纯工具函数；HTML/Console 只实现平台差异。
- `@tsdi/agent-ui/web-console` 是浏览器 HTML 嵌入的规范命名入口；现有 `@tsdi/agent-ui/web` 必须保留并通过兼容转发维持全部功能；`@tsdi/agent-ui/console` 是命令窗口 shell/TUI 入口。
- `@tsdi/agent-ui/src` 只消费稳定的模板 selector 和平台无关 port，不直接引用 `@tsdi/components/console`、`@tsdi/components/html` 或 Node API。
- 属性变化继续依赖 Components 响应式链路驱动渲染；不得增加定时刷新或布局脏节点缓存。

## 当前问题

当前工作区处于未完成的迁移中，实施前必须以此为起点收口：

- `src/console-ports.ts` 新增了 `ConsoleComponents`、`consoleComponents` 和 `CONSOLE_COMPONENTS`，但这是“可变全局类注册表 + DI token”两套机制并存。
- `src/AgentConsolePanels.ts` 已引用 `CONSOLE_BASE_IMPORTS`、`LabelComponent`、`PanelComponent`、`buildTerminalBrandBlock` 等未定义符号，当前不能作为稳定基线。
- `src/web-console.ts` 在业务入口内直接选择 `HtmlTemplateModule`，平台选择职责仍在 `src`。
- `console/run-agent-console.ts` 和 `console/run-agent-ui.ts` 只装配 TUI，尚没有统一的 HTML/TUI 平台适配 API。
- `components/console/src/components.ts` 已包含 TUI 的基础实现；`components/html` 目前主要提供 renderer/compiler，缺少与 TUI 对称、可显式导出的基础组件模块。

## 目标依赖方向

```text
@tsdi/components
        ^
        |
@tsdi/components/common
        ^-----------------------------^
        |                             |
@tsdi/components/console      @tsdi/components/html
        ^                             ^
        |-------------|---------------|
                      |
          @tsdi/agent-ui/web-console       @tsdi/agent-ui/console
                    ^                       ^
                    |                       |
             browser host             shell/TUI host

@tsdi/agent-ui/src -> @tsdi/components + agent-ui 自有 ports
@tsdi/agent-ui/src -X-> components/console | components/html | node:*
```

## 约定的公共契约

两端实现使用相同 selector，业务模板无需知道实际平台类：

| selector | Console 实现 | HTML 实现 | 最小契约 |
| --- | --- | --- | --- |
| `div` / `span` / `br` / `label` | Console directives | HTML directives 或 DOM passthrough directives | style、render region、文本布局 |
| `input` / `textarea` | TUI editable components | HTML editable directives | `value`、`cursorPos`、`focused`、输入事件 |
| `select` | `TuiSelectComponent` | HTML select directive/component | options、selected index、change/confirm |
| `panel` | Console panel component | HTML panel component/directive | title、expanded、style、projection |

公共契约只包含模板真正使用的属性和事件。平台专属能力通过 `console-ports.ts` 中的抽象服务注入，不把 DOM、ConsoleNode 或 terminal surface 类型泄漏到业务组件。

已确定的实现边界：

- `div`、`span`、`br`、`label` 由 Components 全局 schema/基础元素规则处理，不声明 directive；只有 `PanelComponent` 这类确有交互和投影行为且只依赖 Renderer/RNode 抽象的实现迁入 common。
- 输入、textarea、select、光标、clipboard 和 terminal surface 行为留在各平台包；两端实现相同模板契约，但不共享 DOM/TUI 专属代码。
- `buildTerminalBrandBlock`、窗口计算、enter action、index label、cursor clamp 等不依赖 renderer 的纯函数迁入 common；ANSI、terminal size、DOM selection 等平台函数不得进入 common。
- 业务组件不持有具体平台类引用。平台 module 的 exported declarations 应通过 application injector 对业务组件可见；在删除组件 `imports` 前必须用最小集成测试锁定该行为。

## `@tsdi/components` Schema 契约

- `SchemaMetadata`、`CUSTOM_ELEMENTS_SCHEMA`、`NO_ERRORS_SCHEMA` 及其运行时语义均归属 `@tsdi/components`；其他组件包直接从根包消费，不重新声明或转移所有权。
- `schemas` 的主要配置位置是 `@Component({ schemas: [...] })`；可选的应用默认值通过 `@tsdi/components` 自有 DI token/provider 合并，不修改 `@tsdi/ioc` 的 ModuleMetadata/ModuleDef。
- 默认模式校验未知元素和未知属性；`CUSTOM_ELEMENTS_SCHEMA` 只放行 dash-case 自定义元素及 dash-case 属性；`NO_ERRORS_SCHEMA` 放行任意元素和属性。
- schema 必须进入实际 template parser/compiler 校验链，不能只停留在类型声明。HTML 与 Console parser 使用同一判定 helper，平台 parser 不各自复制规则。
- schema 只影响模板合法性判断，不负责注册 renderer 实现；被 schema 放行的元素仍按当前 renderer 的普通节点语义创建。

### 1a. 在 `@tsdi/components` 落实 schemas

- [ ] 保留并完善 `src/template/schema.ts` 的公共 API，新增统一的 element/property schema matcher 和可诊断的 validation error。
- [ ] 让 `@Component`、`@Directive` metadata 的 `schemas` 被 compiler 读取；在 ComponentsModule 中以 schema provider/token 支持模块级默认值，并定义与 component-local schema 的合并规则，不修改 IoC 元数据。
- [ ] 将有效 schemas 放入 template parser/compiler context；所有 renderer/compiler 通过同一个根包 helper 校验，不在 HTML、Console、XML、JSON 包复制规则。
- [ ] 明确默认行为、dash-case 规则和属性校验，并保证错误包含 component、element/property 与 template 位置信息。
- [ ] 在 `packages/components/test` 增加核心测试：默认拒绝、component schemas、directive schemas、module schemas、嵌套 module 合并、CUSTOM_ELEMENTS_SCHEMA、NO_ERRORS_SCHEMA。
- [ ] 对现有模板先执行兼容性盘点；如果开启默认严格校验会破坏既有合法模板，采用兼容模式分阶段启用，不得无说明改变现有 parser 行为。

验收：`@tsdi/components` 自身证明 schemas 元数据已进入实际 compiler 链路；平台包只验证继承结果，不包含 schema 规则实现。

## 分步实施

### 1. 建立可编译基线

- [ ] 盘点 `AgentConsolePanels.ts` 和 `AgentConsoleComponent.ts` 使用的全部基础 selector、属性、事件和组件 imports，形成契约测试表。
- [ ] 补齐当前未定义符号，或临时回到模块级声明解析，使 agent-ui 恢复编译；不得覆盖工作区中其他未提交改动。
- [ ] 运行 agent-ui targeted smoke test，确认后续失败来自本重构而非当前中间态。
- [ ] 将当前基线失败和通过数记录在本文件的“实施记录”。

验收：`npx tsc -p packages/agents/agent-ui/tsconfig.json --noEmit` 不再出现缺失基础组件符号。

### 2. 新增 `@tsdi/components/common`

- [ ] 创建标准 package 结构、public index、package.json、tsconfig、taskfile 和 unit runner，并加入根 tsconfig paths/build 配置。
- [ ] 定义最小 value/event interfaces；不得引用 DOM、Node、ConsoleNode 或 `@tsdi/components/console` 类型。
- [ ] 迁入 renderer-neutral primitives 和纯工具函数；Console/HTML 包通过 module imports/re-export 消费，不复制实现。
- [ ] 新增 `CommonComponentsModule`，统一 declarations/exports common primitives。
- [ ] 直接消费 `@tsdi/components` 提供的 schema API；common 不实现、不复制 schema matcher/validator。
- [ ] 保留 terminal lifecycle、surface accessor、input handler 等 port，但移除组件类构造器注册表。
- [ ] 删除 `consoleComponents` 可变单例；不要用模块加载副作用填充实现。
- [ ] 若 `CONSOLE_COMPONENTS` 没有运行时消费者则删除；若确有动态创建需求，将其缩小为只读 capability service，并由适配模块提供。

验收：common 包测试 EXIT=0；`rg "consoleComponents|CONSOLE_COMPONENTS" packages/agents/agent-ui/src` 不再发现可变平台类注册逻辑。

### 3. 收口 `@tsdi/components/console` 基础实现

- [ ] 从 common 导入通用 primitives，只将 `TuiInputComponent`、`TuiTextareaComponent`、`TuiSelectComponent` 等平台差异实现整理到明确的 Console primitives module。
- [ ] 由该 module 统一 `declarations`/`providers`/`exports`，避免 `TuiTemplateModule` 与 `TuiConsoleModule` 重复列举。
- [ ] 从 `@tsdi/components/console` public index 显式导出 primitives module 及确有公共用途的实现类型。
- [ ] 将通用输入、选择、panel 行为留在该包，不向 agent-ui 回流平台实现。
- [ ] 确认包内没有直接 Node API；环境信息只允许使用带类型守卫的 `globalThis`。

验收：在 `packages/components/console` 执行 `npm run test`，预期 72+ passing、EXIT=0。

### 4. 为 `@tsdi/components/html` 提供对称实现

- [ ] HTML module 导入 common primitives；对 `div`、`span`、`br`、`label` 等原生 DOM 元素不重复声明平台实现。
- [ ] 新增 HTML primitives module，只为输入/光标/select 等 common 无法覆盖的契约缺口提供 DOM directive/component。
- [ ] 优先复用原生 DOM 的 value、selection、focus、input/change/copy/cut/paste 语义；只在 Components 属性同步需要时添加 directive。
- [ ] `panel` 的 projection、expanded change 和 style 行为与 Console 端对齐，但不得复制 agent-ui 业务逻辑。
- [ ] 从 `@tsdi/components/html` public index 导出 HTML primitives module 和必要类型。
- [ ] 让 `HtmlTemplateModule` 通过 imports/exports 组合 primitives module，调用者不再逐个声明基础组件。

验收：在 `packages/components/html` 执行 `npm run test`，预期 117+ passing、EXIT=0；新增契约 spec 覆盖输入光标、select 和 panel projection。

### 5. 让 `@tsdi/agent-ui` 只保留业务组件

- [ ] 从 `AgentConsolePanels.ts` 删除 `CONSOLE_BASE_IMPORTS`、`LabelComponent`、`PanelComponent`、`TuiSelectComponent`、`TuiTextareaComponent` 等平台类引用。
- [ ] 业务组件模板继续使用公共 selector，由运行时导入的平台 primitives module 解析。
- [ ] `AgentUiModule` 只声明/export `AgentConsole*` 业务组件和业务 services，不 imports 任一具体 renderer/primitives module。
- [ ] 将 `buildTerminalBrandBlock` 等纯函数迁到平台无关包或改为注入 `ConsoleUtils`；组件不得从可变全局对象取函数。
- [ ] 检查 `src/` 的所有 import，清除 `@tsdi/components/console`、`@tsdi/components/html`、`node:`、`process`、`Buffer`、`fs` 和 `__dirname` 的直接依赖。

验收：

```bash
rg "@tsdi/components/(console|html)|from 'node:|from \"node:|\bprocess\b|\bBuffer\b|\b__dirname\b" packages/agents/agent-ui/src
```

结果只能包含允许的带守卫 `globalThis` 环境访问；不得包含平台包 import 或 Node import。

### 6. 在平台子路径中选择和注入

- [ ] `@tsdi/agent-ui/console` 只提供 shell/TUI 装配：导入 `TuiConsoleModule`/Console primitives，注入 terminal lifecycle、surface accessor、输入处理和 TUI `ConsoleUtils`。
- [ ] `@tsdi/agent-ui/web-console` 只提供浏览器 HTML 装配：导入 `HtmlTemplateModule`/HTML primitives，注入 `DOCUMENT`、浏览器 `ConsoleUtils` 和 terminal capability no-op adapter。
- [ ] `runAgentTUI` 只从 `@tsdi/agent-ui/console` 导入；Web mount 只从 `@tsdi/agent-ui/web-console` 导入。两个入口不能互相依赖。
- [ ] 平台适配模块可以共享纯类型/业务 bootstrap helper，但不能共享 renderer、基础组件声明或 Node/DOM 专属实现。
- [ ] 防止同时安装两套同 selector primitives；检测到冲突时在启动阶段抛出清晰错误。
- [ ] 防止同时安装两套同 selector primitives；检测到冲突时在启动阶段抛出清晰错误。

验收：应用入口只需导入 `AgentUiModule` 加一个选定的平台适配 module，业务模块本身不决定 renderer。

### 6a. `@tsdi/agent-ui/web-console` 浏览器子路径

- [ ] 明确 `@tsdi/agent-ui/web-console` 为浏览器宿主入口，内部只依赖 `AgentUiModule` + HTML 平台适配 module；不得由 consumer 手工拼接 `HtmlTemplateModule`、`ComponentsModule` 或 TUI module。
- [ ] 将当前 `src/web-console.ts` 的 mount、PWA 注册、DOM `DOCUMENT` 注入和 HTTP RPC 装配迁移到浏览器平台实现；`@tsdi/agent-ui/web-console` 作为规范入口，`@tsdi/agent-ui/web` 保留为兼容 re-export，不能删除或改变既有选项、返回值和全局宿主 API。
- [ ] web 入口只使用浏览器安全 API（`document`、`navigator.serviceWorker`、`fetch`），不得引入 `node:*`、`Buffer`、`process`、文件系统适配器或 TUI terminal lifecycle。
- [ ] web 适配 module 提供 HTML primitives、HTML renderer/compiler、浏览器 `ConsoleUtils` 及 terminal capability no-op adapter；浏览器入口不得注册 TUI renderer。
- [ ] 更新 `package.json` exports、`tsconfig` paths、`build-web.ts` bundle entry 和 web dist 产物，使 `@tsdi/agent-ui/web-console` 成为稳定入口；兼容入口只保留薄转发。
- [ ] 增加 browser-only 装配测试：DOM mount、输入/光标同步、select change、panel projection/展开、响应式消息更新、PWA 注册失败回退，以及 bundle 中不出现 TUI/Node 依赖。

验收：浏览器 consumer 只需 `import { mountAgentWebConsole } from '@tsdi/agent-ui/web-console'`，命令窗口 consumer 只需从 `@tsdi/agent-ui/console` 调用 shell/TUI 启动 API；两者无需显式导入 renderer 或基础组件模块。

### 7. 调整 public API 和包依赖

- [ ] `@tsdi/agent-ui` 主入口仅导出跨平台业务 API 与 ports。
- [ ] `@tsdi/agent-ui/console` 导出命令窗口 shell/TUI 注入和启动 API；consumer 不再直接依赖 `@tsdi/components/console`。
- [ ] `@tsdi/agent-ui/web-console` 导出浏览器 HTML mount 和注入 API；consumer 不再直接依赖 `@tsdi/components/html`。
- [ ] 保留 `@tsdi/agent-ui/web` 到 `@tsdi/agent-ui/web-console` 的薄转发，并增加兼容测试；旧路径的 `mountAgentWebConsole`、PWA 注册、配置读取和 `TsdiAgentWeb` 全局 API 必须继续可用。
- [ ] 检查 `package.json` exports、taskfile/build-web entry 和 tsconfig paths，保证子路径在源码、测试和发布包中一致。
- [ ] 对旧的 `consoleModule` 参数和直接导入路径提供一个发布周期的 deprecated 兼容层，再在独立变更中删除。

验收：TUI consumer 只通过 `@tsdi/agent-ui/console`，Web consumer 只通过 `@tsdi/agent-ui/web-console`，构建产物不包含另一平台不需要的入口副作用。

### 8. 增加架构与契约测试

- [ ] 在 Console 与 HTML 包各写一套相同用例的 primitives contract spec：属性同步、事件、projection、show/hide 和响应式更新。
- [ ] 在 common 包覆盖公共 primitives 和纯函数；schema matcher 在 Components 根包测试，HTML/Console 包验证各自 parser 对同一 schema fixture 的继承结果一致。
- [ ] 在 agent-ui 增加装配测试：TUI 解析为 Console primitives，HTML 解析为 HTML primitives。
- [ ] 增加冲突测试：同一 application 不允许同时注册 HTML/TUI 默认 renderer。
- [ ] 增加静态架构测试，禁止 `agent-ui/src` import 平台包或 Node 库，并禁止重新声明公共基础 selector。
- [ ] 保留现有跨组件状态广播回归测试，确认平台拆分没有绕过 reactive proxy。
- [ ] 验证数据无变化时不会额外渲染，代码中不出现为刷新 UI 新增的 `setInterval`/`setTimeout`。

### 9. 全量回归与清理

- [ ] `cd packages/components && npm run test`，预期 110+ passing、EXIT=0。
- [ ] `cd packages/components/common && npm run test`，全部通过、EXIT=0。
- [ ] `cd packages/components/console && npm run test`，预期 72+ passing、EXIT=0。
- [ ] `cd packages/components/html && npm run test`，预期 117+ passing、EXIT=0。
- [ ] `cd packages/agents/agent-ui && npm run test`，预期 328+ passing、EXIT=0。
- [ ] 执行 Web bundle 构建并验证浏览器 mount、输入、选择、消息更新和 panel 展开。
- [ ] 执行真实 TUI smoke test，验证键盘、鼠标、resize、clipboard、光标和增量渲染。
- [ ] 删除临时兼容 alias、未使用 token、重复 declarations 和迁移注释。
- [ ] 更新 agent-ui README/CHANGELOG，记录新平台入口及旧 API 的 deprecated 周期。

## 实施顺序与提交边界

建议每一步独立提交并保持可回滚：

1. 恢复当前中间态编译并加入契约测试。
2. 在 Components 根包完成 schema 运行时链路及核心测试。
3. 建立 common 包及通用组件契约测试。
4. 整理 Console primitives module，不改变行为。
5. 增加 HTML primitives module和对称测试。
6. 引入 agent-ui platform adapter，同时保留旧启动 API。
7. 移除 agent-ui 中的平台类注册表和组件 imports。
8. 切换 TUI/Web consumers，增加架构测试。
9. 删除临时迁移代码、跑全量回归并更新文档。

不要在同一提交中同时移动实现、改变 selector 和修改交互行为；否则测试失败时无法区分模块装配问题与组件行为回归。

## 完成定义

- `agent-ui/src` 没有平台包或 Node 库直接依赖。
- agent-ui 没有声明或复制公共基础组件，也没有可变的组件类注册表。
- Components 根包拥有生效的 schema 机制；Common 拥有通用 primitives 和纯函数；Console/HTML 分别拥有并导出平台差异实现。
- `@tsdi/agent-ui/web-console` 和 `@tsdi/agent-ui/console` 分别是浏览器 HTML 与命令窗口 shell/TUI 的平台选择和 DI 装配位置。
- 浏览器和 TUI 共用 Agent Console 业务组件与响应式状态实现。
- 四个相关包全量测试 EXIT=0，Web/TUI smoke test 通过。

## 实施记录

| 日期 | 步骤 | 结果 | 备注 |
| --- | --- | --- | --- |
| 2026-08-19 | 方案建立 | completed | 基于当前 dirty worktree 和未完成的 `ConsoleComponents` 迁移编写，尚未执行代码重构。 |
| 2026-08-19 | 重构实现 | completed | Common、Component schemas、Web/Console 入口、全量测试与构建均完成；结果见 `packages/agents/todo.md` P170 收尾记录。 |
