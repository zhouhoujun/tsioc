# AGENT.md

## 架构约束（必须遵守，2026-08 用户确认）

### 1. Components 是响应式框架（全框架通用，含 `@tsdi/components`、`@tsdi/components/console` 及 consumers 如 `agents/agent-ui`）

业务数据变化驱动界面更新，**不需要手动触发更新**。动画与实时计时属于时间状态，允许由 components 通用层的共享生命周期时钟驱动。

- 更新链路：属性 set → `effect.trigger` → 绑定重跑 → `textContent` setter（值短路，`components/console/src/console.ts:246`）→ `notifyChanged` → `CHANGE_EVENT` 冒泡到 root → `requestRender`（微任务合并）。
- **禁止业务组件、agent-ui 或平台适配层各自用 `setInterval`/`setTimeout` 刷新界面**；动画与 elapsed-time 统一订阅 `@tsdi/components` 的共享生命周期时钟，首个订阅启动、最后一个订阅停止，并在 directive/application 销毁时清理。
- 动画与实时计时必须由真实时钟持续推进，DOM 与 TUI 共用 components 通用实现；测试必须验证无其他业务数据变化时也会推进，不得用手动调用内部 `render()` 代替用户可见行为验收。
- **禁止以优化、重构、性能或架构整改为由删除、关闭、降级或改变已有用户功能**。如果既有功能与架构规则发生冲突，必须先保留功能并向用户说明冲突、询问取舍；不得自行删除功能后把降级行为改写成测试预期。
- **禁止布局层"脏节点追踪"跳过未变面板**：响应式更新会替换节点（旧节点在渲染前离树，parentNode 链断裂）且同帧批量变更多个面板，基于变化源复用的缓存会误判并输出陈旧界面，违反"数据变化驱动界面更新"契约（P63 曾尝试，2 个 agent-ui 测试回归，已回退）。
- **stream 布局全程使用 native scrollback**（含 turn 运行中的流式内容），多轮对话历史不得按视口高度裁剪；仅显式 `dynamic` 模式才窗口化。
- 长回复在 native scrollback 下不得向上移动超过终端视口高度，不得重复绘制或覆盖视口外历史。
- 用户消息与最终回答由整个动态模板容器提供纵向 padding，禁止给正文每行重复添加上下 padding；最终回答不显示 assistant `•` role label（Working 状态点只属于执行状态）。

### 2. 跨平台（agent-ui 需同时运行于浏览器与命令行窗口 TUI）

- 渲染/动画改动必须在 `@tsdi/components`、`@tsdi/components/console` 通用层落地，不得只在 agent-ui 侧 hack。
- 浏览器端走 `ConsoleRenderer`（DOM），命令行端走 `TuiRenderer` + `TuiTerminalSurface`；两平台共用同一实现。
- **`agent-ui/src/` 不得直接引用 `@tsdi/components/console` 或 node 库**（`node:` 模块、`process`、`Buffer`、`fs`、`__dirname` 等）；console 相关的类型和函数统一从 `@tsdi/agent-ui/console` 引入，由各平台适配层提供实现。
- `components/console` 与 agents 库**不得直接引用 node API**（`node:` 模块、`process`、`Buffer`、`fs`、`__dirname` 等）；需要环境信息时用全局守卫（如 `(globalThis as { process?: ... }).process`）访问。
- `components/common` 是 renderer-neutral 公共层，只能依赖 components 核心，不得反向引用 `components/html` 或 `components/console`。
- `components/html` 与 `components/console` 是并列平台 renderer，禁止互相引用、互相模拟或把一端兼容逻辑塞入另一端。
- `agent-ui/src` 是平台无关 UI 层，不得直接引用 `@tsdi/components/html` 或 `@tsdi/components/console`。
- `agent-ui/console` 只连接 agent-ui 与 `components/console`；`agent-ui/web-console` 只连接 agent-ui 与 `components/html`，两个适配层禁止互相引用。
- console 能力统一从 `@tsdi/agent-ui/console` 暴露，Web 能力从 `@tsdi/agent-ui/web-console` 暴露，由 CLI、browser、desktop、VS Code 等宿主选择对应适配。
- 不复制 Codex/opencode 品牌或配色，只参考其信息架构、稳定 identity、状态层级和交互原则。

### 3. 响应式代理机制（`@tsdi/components/src/reactive.ts` + `impl/effect.ts`）

**组件实例封装**
- `ComponentRefImpl.createInstance` 用 `reactive(instance, injector.get(ReactiveEffect), computeds)` 把组件实例包成 proxy；每个组件注入器提供**自己的** `DefaultReactiveEffect` 实例（组件间不共享 effect）。
- 组件属性对象（如 `sessionState`、嵌套对象）在**读取时**经 get trap 懒封装：`canReactive(res)` 通过则 `reactive(res, effect)`，用**当前组件自己的 effect** 包成嵌套 proxy；函数属性原样返回（非 native 不 bind）。
- `REACT_FlAG`（`Symbol('__REACT')`）标记定义在 **proxy 上**（不在 raw target 上），因此同一 raw 对象可被多个组件用各自 effect 封装成多个 proxy；`canReactive` 对已带标记的对象返回 false（不套层）。

**依赖追踪（DefaultReactiveEffect）**
- 绑定更新在 `effect.run(fn)` 内读取状态：`run` 维护 `activeEffects` 集合、`runningDepth` 与 `currentFn`；`track(target, key)` 在 `runningDepth > 0` 时把 **`currentFn`** 注册进 `depsMap[target][key]`。
- 注意：`track` 注册的是 `currentFn`，不是 `this.fn`（类中不存在该字段，曾导致注册 undefined、trigger 时崩溃）。
- `trigger(target, key)` 执行 `depsMap[target][key]` 中所有 fn。

**跨组件状态更新（代理广播，不再用 subscribe/notify）**
- 共享状态（如 `AgentConsoleSessionState`）被多个组件读取，各自封装成不同 proxy、track 到不同 effect；set trap 只会触发**创建该 proxy 的 effect**，单靠 `effect.trigger(target, key)` 无法更新其他组件的绑定（曾因此消息面板不刷新）。
- 因此：
  1. get trap 对 `key !== REACT_FlAG` 的读取**无条件登记读取者**：`subscribableEffects`（WeakMap<target, WeakSet<effect>>）加入当前 effect，并 `track(target, SUBSCRIBABLE_NOTIFY)`（绑定读取时该符号依赖注册成功）。
  2. set/deleteProperty 值变化时：① `effect.trigger(target, key)`（本 proxy）；② **广播**：遍历 `subscribableEffects.get(target)`，对非当前 effect 调 `subEffect.trigger(target, SUBSCRIBABLE_NOTIFY)` → 各组件绑定重跑 → 界面更新。
- **禁止恢复 `state.subscribe()` / `listeners` / `notify()`**：广播已由 proxy 层统一承担，`AgentConsoleSessionState` 中的 `subscribe()` / `listeners` / `batch()` 已删除。

**调试要点**
- 绑定不更新排查：先确认读取经 proxy（get trap 有 track）且 `runningDepth > 0`（绑定在 effect.run 内）；再确认写入触发的 effect 是否命中该绑定注册的 effect 实例；跨组件场景依赖 SUBSCRIBABLE_NOTIFY 广播，而不是同一 effect 实例。
- `[TRIGGER-DEBUG]` 等调试 log 不得留在 `effect.ts` 等核心文件。

### 4. 代码体量与单一职责（ratchet 必守，2026-09 用户确认）

针对"逻辑已抽出、类却持续膨胀"的巨型文件（如 `agent-ui/src/AgentConsoleComponent.ts` 8000+ 行），以下为强制规则：

- **行数门槛（ratchet）**：`scripts/check-source-size.mjs` 检查 `packages/agents/**`（排除 `test`/`dist`/`lib`）的行数，`scripts/source-size-baseline.json` 记录现存超额文件。**已入基线的文件只允许下降；未入基线的新文件上限 600 行**。统一 gate 的 `source-size` 阶段必须通过——任何让基线文件增长、或新增 >600 行文件的提交都算失败。
- **单一职责 / 禁止 god-object**：`agent-ui/src/AgentConsoleComponent.ts` 是 TUI 组合根与 facade，**不得再往其中新增业务逻辑**。新增 console 能力必须落到既有模块（`AgentConsoleCommandHandlers`、`AgentConsoleCodingTaskHandlers`、`AgentConsolePanels`、`AgentConsoleMessageRenderers`、`AgentConsoleSessionService` 等）或新建的 `AgentConsole*Controller`。
- **命令处理用注册表**：新增 `/command` **不得再往单体 `switch` 里加 `case`**；统一走命令注册表，实现放进 handler 模块。
- **抽取纪律**：抽取时必须保持用户可见行为与测试不变（交叉引用第 1 条"禁止降级功能"）；每降低一个文件体量，**在同一提交内下调其 baseline**。
- **约定拆解顺序**：P4 命令注册表 → P3 Turn/Input 控制器（`submit`/`consumeStream*`/`runTurnStream`/键处理）→ P2 诊断/导出/附件/语音控制器 → P1 纯函数（`format*`/媒体 IO）。目标：`AgentConsoleComponent.ts` < 1500 行。
- **验证命令**：`node scripts/check-source-size.mjs` 或 `bash scripts/agents-gate.sh source-size`；改动 agent-ui 后按"测试方式"全量回归。

### 5. 会话主线与时间线

- 用户请求是 turn 的视觉锚点；最终回答独立于 thought、tool、command 和 lifecycle event。
- 生命周期事件属于 `event`，不能替换、合并或升级为最终结论。
- 同一事实默认只出现一次；tool 生命周期按稳定 key 原地归并。
- 事件主线只展示动作、对象、状态和必要摘要；raw payload、stdout/stderr、stack、diff 进入 inspector。
- 事件只展示总耗时：后端 `durationMs` 优先，否则按稳定 identity 配对开始/结束时间。
- execution 轨道紧凑；running/blocked/error 保持较高权重，completed 降噪；错误根因和最终回答不能被折叠吞掉。
- 用户消息和最终回答由整个动态模板容器提供纵向 padding，禁止给正文每行重复添加上下 padding。
- 最终回答不显示 assistant `•` role label；Working 状态点只属于执行状态。
- 长回复在 native scrollback 下不得向上移动超过终端视口高度，不得重复绘制或覆盖视口外历史。

### 6. 输入、历史与候选

- 输入框 `↑/↓` 历史只按规范化 `workspace` 目录关联，与 session、project、thread 和 fresh/resume 状态无关。
- 同一 workspace 下所有会话的用户 prompt 聚合；不同 workspace 严格隔离。
- 历史只记录真实用户 prompt；排除 `/` 命令、空输入以及 assistant/tool/system 内容。
- 历史去重后按最近使用顺序保留最多 200 条。
- `↑` 从最新 prompt 向旧 prompt 浏览；`↓` 反向浏览并最终恢复按键前的原始草稿。
- suggestion menu 只在尚未浏览历史时优先消费方向键；历史浏览一旦开始，本次浏览期间 `↑/↓` 必须继续属于历史。
- pending question 激活时输入框可键入自定义答案：空草稿时数字键选择编号选项，已有草稿时数字属于答案文本，Enter 提交自定义答案或选中项。
- turn 运行中按 Enter 默认排队（保留当前 turn 不取消）；steer（打断并取消当前 turn 开新 turn）必须显式启用 `ui.steerMode`。
- 用户消息的 @mention 上下文以紧凑 `Files · <paths>` 展示，不显示原始 `[Mention Context]` 块；发给运行时的提示仍携带完整上下文。
- browser textarea、TUI escape sequence、Vim history action 必须遵守同一契约。

### 7. Workspace、Project 与跨会话协同

- `workspace` 是文件目录、权限和输入历史边界。
- workspace 可以直接作为默认 project：没有显式 `projectId` 时，以规范化 workspace 作为稳定默认 project key。
- workspace 与 project 不强制一一对应：一个 workspace 可以承载多个显式 project，一个协调流程也可以关联多个不同 project。
- project 分组不得影响 workspace 输入历史聚合。
- 显式创建、加入、fork、delegate 项目时，必须持久化 `projectId`、`primaryThreadId`、`originThreadId`、`sessionRole` 等关系。
- project/thread/delegation/background 协同必须可跨进程、跨重启恢复，不能只依赖进程内状态。

### 8. 数据库与数据安全

- 生产库默认位于 `~/.tsdi-agent/agent.db`；测试必须使用独立临时 HOME/root 和独立数据库。
- 测试、schema 同步和启动流程不得清空、覆盖或重建生产库。
- 实体字段变化必须验证旧 session/message/memory 数据在升级启动和关闭后仍完整保留。
- 禁止把删除数据库作为迁移方法。
- 发现旧库或备份时先只读报告并制定可回滚恢复方案，不得自动覆盖当前库。
- 输入历史加载失败不得静默伪装成空历史；应保留可诊断错误，同时不阻断 TUI 启动。

### 9. 配置、路由与本地化

- 不得把无效/占位配置（`cancel`/`q` sentinel、空 profile、嵌套重复 `profiles`）持久化到 `settings.json`；读取必须净化，且净化结果应可自愈写回。
- 路由或配置缺失/无效不得静默或抛错终止 turn；必须回退到可用配置并给出可诊断提示。
- 用户可见文案必须经 i18n，不得硬编码英文（含 plan 头部/结尾、事件句子、状态词）。
- 工具失败信息必须可操作：包含允许范围（workspace root）与修复建议；越界路径不得只报 `outside the allowed workspace root`。

## 测试方式（验证过的标准流程）

### 完成标准（必须满足）

- 单元测试必须覆盖真实调用边界，不能只靠手工设置 state、伪造 renderer 输出或局部纯函数证明完整交互可用。
- 输入交互至少覆盖真实 ORM、AppRpc、CLI/TUI decoder、component/state 和 PTY 按键链。
- 回归测试必须先证明在旧实现上稳定失败，再证明修复后通过。
- 涉及响应式核心时回归 components、components/console、agent-ui；涉及 browser/TUI 时同时验证两端。
- 收尾门禁包括 agents 各包、framework 核心及 components/common、components/html、components/console、相关 tsc、Web build、DOM/TUI、metrics regression、真实 PTY 和 `git diff --check`。
- 未解释数据丢失、未覆盖真实复现路径或仍存在开放复现时，不得仅凭测试数字宣布完成。

**没有根级测试 runner**；每个包自带 `unit.ts`（`runTest('./test/**/*.ts', { baseURL: __dirname, platform? })`），必须进入包目录执行。

### 跑某包全部测试
```bash
cd packages/<包名>            # 例：components、components/common、components/html、components/console、agents/agent-ui
npm run test                  # 等价于: ts-node -r tsconfig-paths/register unit.ts
```
- 已知基线：components 110 通过；components/common 5 通过；components/console 77 通过；components/html 117 通过；agents/agent-ui 以当前 runner 输出为准。
- runner 会把 summary 打印两遍，属正常（unit-console 行为），以 EXIT code 为准。
- `npm run test:coverage` 可用（NODE_V8_COVERAGE=.nyc_output）。
- 共享 components 或 agent-ui 改动必须按影响范围覆盖 components、components/common、components/html、components/console 与 agent-ui；统一 agents gate 必须单独包含这四个 components 包。

### 跑单个 spec（targeted 验证）
`@tsdi/unit` 的模块解析依赖包内路径，**临时 runner 文件必须建在包内**（`/tmp` 下会报 Cannot find module '@tsdi/unit'）：

```bash
cd packages/components/html
cat > test/run-one.tmp.ts << 'EOF'
import { runTest } from '@tsdi/unit';
runTest('./test/<spec>.spec.ts', { baseURL: __dirname, platform: 'browser' })
    .then(() => process.exit(0))
    .catch((err: Error) => { console.error('RUNNER-FAIL', err); process.exit(1); });
EOF
npx ts-node -r tsconfig-paths/register test/run-one.tmp.ts && rm test/run-one.tmp.ts
```
- html 包必须带 `platform: 'browser'`（unit.ts 里就这么配的）；components/console、agent-ui 不需要。
- 改完核心响应式代码（`reactive.ts`/`impl/effect.ts`）后，至少回归：agent-ui 全套 + components + components/common + components/html + components/console。

### 已知既有问题（已修复，2026-08）
- `components/html` 曾因测试全部通过但进程 EXIT=1（TypeError）。延迟微任务（compiler-fns.ts `Promise.resolve().then`）里 `CaseDirective.onInit`/`DefaultDirective.onInit`（switch-case.dir.ts）对非 switch 的 `_switchDirective` 直接调 `unregisterCase`/`unregisterDefault` 崩溃；已补上与 `bindToSwitch`/`onDestroy` 一致的 `typeof ... === 'function'` 守卫。修复后 117 passing EXIT=0。
