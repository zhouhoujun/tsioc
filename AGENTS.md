# AGENT.md

## 架构约束（必须遵守，2026-08 用户确认）

### 1. Components 是响应式框架（全框架通用，含 `@tsdi/components`、`@tsdi/components/console` 及 consumers 如 `agents/agent-ui`）

数据变化驱动界面更新，**不需要手动触发更新，不需要定时刷新**。

- 更新链路：属性 set → `effect.trigger` → 绑定重跑 → `textContent` setter（值短路，`components/console/src/console.ts:246`）→ `notifyChanged` → `CHANGE_EVENT` 冒泡到 root → `requestRender`（微任务合并）。
- **禁止在组件层用 `setInterval`/`setTimeout` 主动刷新界面**；渲染完全由真实数据变化驱动，无数据变化即无渲染。
- 动画必须"时间派生"：getter 内由 `Date.now()` 计算（如 Working 面板的 `dotFrame`），动画帧随真实数据驱动的渲染自然推进，不额外驱动渲染。
- **禁止布局层"脏节点追踪"跳过未变面板**：响应式更新会替换节点（旧节点在渲染前离树，parentNode 链断裂）且同帧批量变更多个面板，基于变化源复用的缓存会误判并输出陈旧界面，违反"数据变化驱动界面更新"契约（P63 曾尝试，2 个 agent-ui 测试回归，已回退）。

### 2. 跨平台（agent-ui 需同时运行于浏览器与命令行窗口 TUI）

- 渲染/动画改动必须在 `@tsdi/components`、`@tsdi/components/console` 通用层落地，不得只在 agent-ui 侧 hack。
- 浏览器端走 `ConsoleRenderer`（DOM），命令行端走 `TuiRenderer` + `TuiTerminalSurface`；两平台共用同一实现。
- **`agent-ui/src/` 不得直接引用 `@tsdi/components/console` 或 node 库**（`node:` 模块、`process`、`Buffer`、`fs`、`__dirname` 等）；console 相关的类型和函数统一从 `@tsdi/agent-ui/console` 引入，由各平台适配层提供实现。
- `components/console` 与 agents 库**不得直接引用 node API**（`node:` 模块、`process`、`Buffer`、`fs`、`__dirname` 等）；需要环境信息时用全局守卫（如 `(globalThis as { process?: ... }).process`）访问。
- `components/common` 是 renderer-neutral 公共层，只能依赖 components 核心，不得反向引用 `components/html` 或 `components/console`。
- `components/html` 与 `components/console` 是并列平台 renderer，禁止互相引用、互相模拟或把一端兼容逻辑塞入另一端。
- `agent-ui/src` 是平台无关 UI 层，不得直接引用 `@tsdi/components/html` 或 `@tsdi/components/console`。
- `agent-ui/console` 只连接 agent-ui 与 `components/console`；`agent-ui/web-console` 只连接 agent-ui 与 `components/html`，两个适配层禁止互相引用。

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

## 测试方式（验证过的标准流程）

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
