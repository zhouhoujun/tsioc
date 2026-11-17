# 框架优化设计方案（ioc / aop / core / common / compiler / i18n / logger / repository / security / oidc-auth / unit* / platform*）

> 本文只给方案与验收标准，不含代码改动。
> 范围按用户要求划定：**排除** `packages/components*`（含 common/html/console/xml/json）、`packages/microservices/*`、`packages/workflow-admin`、`packages/agents/*`、`packages/activities`。

## 0. 结论摘要

> 下表是**本次工作开始前**的基线；各项的完成情况与最新数字见 §3.5–§3.7 的实施进展。

| 包 | 有效代码行（估） | 测试 | 结论 | 优先级 |
|---|---|---|---|---|
| `@tsdi/ioc` | 4912 | 268 passing | 上轮已修复 7 个确定性缺陷；剩余优化**无实测热路径证据** | 保持 |
| `@tsdi/aop` | 1410 | 58 passing | advised 调用 171 µs → 6.5 µs（26×）；剩余项需对象池化，风险高 | 保持 |
| `@tsdi/core` | 2857 | 130 passing | 启动路径无缺陷，加基准而非改动 | 保持 |
| `@tsdi/logger` | 573 | 8 passing | **三个确定性问题**：每条日志 1 个 Promise、格式化早于级别门控、每次取 logger 重建 appender | **P0** |
| `@tsdi/unit` | 1344 | 8 passing / 1 failing | 自测用例 5 ms 竞态（稳定间歇失败）；glob 0 匹配仍成功（假绿） | **P0** |
| `@tsdi/unit-console` | 708 | 2 passing | 断言仅 `toBeTruthy`；`render(suites,total)` 的 `total` 语义无约束 | P1 |
| `@tsdi/repository` | 722 | **无测试脚本** | 640 行单文件 resolver，零测试 | **P0** |
| `@tsdi/typeorm-adapter` | 713 | 需本地 PG | 无数据库直接 ECONNREFUSED，非 skip 也非明确失败 | **P0** |
| `@tsdi/common` | 2678 | 34 passing | 仅 `http` 子集有测试；大量类型/抽象面，逻辑面未覆盖 | P1 |
| `@tsdi/compiler` | 3418 | 114 passing | AOT 无增量缓存；已采集 mtime 却未用于缓存决策 | P1 |
| `@tsdi/i18n` | 559 | 52 passing | 覆盖尚可；缺“文案键完整性/缺失校验”工具 | P2 |
| `@tsdi/security` | 1058 | 35 passing | 实现有意识用 `timingSafeEqual`/`randomUUID`；缺限流/CSRF 策略层 | P2 |
| `@tsdi/oidc-auth` | 1482 | 54 passing | state/nonce 校验完整；缺 PKCE（公有客户端） | P2 |
| `@tsdi/unit-karma` | 1869 | 81 passing | 与 unit-console 覆盖率收集实现重复 | P1 |
| `@tsdi/platform-server` | 297 | 20 passing | 薄适配，合理 | 保持 |
| `@tsdi/platform-browser` | 60 | **无测试脚本** | 76 行，仅 hrtime 适配 | P2 |
| `@tsdi/annotations` | — | — | **已删除**：无任何代码引用，且在当前 TypeScript 下必然抛错（把 AST 节点塞进 `JSON.stringify`），功能由 compiler AOT 链路取代 | 已完成 |

一句话：**正确性缺口集中在 logger / unit / repository / typeorm-adapter 四个包**；性能缺口集中在 **logger 写入路径** 和 **compiler 全量 AOT**；架构缺口是 **repository 与 typeorm-adapter 职责重叠** 和 **测试/覆盖率基建重复**。

## 1. 现状优势（值得保留的部分）

1. **分层清楚**：`ioc`（容器 + 元数据）→ `aop`（切面/JoinPoint）→ `core`（应用启动、管道、hrtime/日志抽象）→ 平台适配（`platform-server`/`platform-browser`）。抽象层（`HrtimeFormatter`、`LoggerManager`、`Logger`）通过 DI token 注入，端侧只提供实现，这一点设计是对的。
2. **元数据体系完整**：`ClassRef` + `DecorDefine` + `@Injectable/@Computed/@Attribute/@NoReactive` 统一走 IoC 元数据，`getDefines` 等热点已被精确测量（152 ns，非热路径），没有盲目缓存。
3. **AOP 表达力足够**：切点表达式编译（`DefaultAdviceMatcher`）支持 `execution/@annotation/@within/@target/get/set`，`JoinPoint` 承载 state/args/returning/throwing，advice 生命周期在上一轮已修好释放语义。
4. **安全实现有底线**：`security` 与 `oidc-auth` 的签名/HMAC/口令校验都做了长度前置 + `crypto.timingSafeEqual`，随机数用 `randomUUID`/`randomBytes`，OIDC 校验了 `state` 与 `nonce`。
5. **自带测试与基准设施**：`@tsdi/unit` 能跑 TS 测试，`ioc/aop` 已有 best-of-N 基准 + 预算门禁（`npm run bench:check:core`）。

## 2. 缺陷与风险（按证据分档）

### 2.1 P0 正确性 / 可靠性

| 编号 | 位置 | 问题 | 证据 |
|---|---|---|---|
| L1 | `logger/src/aspect.ts` `writeLog` | 每条日志都包一层 `(async () => {...})()`，同步 logger 也付出一个 Promise 分配 | 代码直读；`@Around('execution(*.*)')` 的 `DebugLogAspect` 会把该成本放大到每次业务调用 |
| L2 | `logger/src/aspect.ts` `writeLog` | `formatMessage` 在**级别判断之前**执行：`trace/debug` 关闭时仍然完成全部格式化（含参数拼接、时间戳） | 代码直读；`for` 循环内无 `logger.level` 前置判断 |
| L3 | `logger/src/manager.ts` `getLoggerManager` | 每次取 logger 都执行 `mgr.configure(cfg.config)`；`Log4jsAdapter.configure` 直接 `log4js.configure(config)`，会**重建全部 appender**（文件句柄/流） | `manager.ts:49/57` + `platform-server/log4js/Log4jsAdapter.ts:15` |
| L4 | `logger/src/logger.ts` | `abstract debug(...)` **重复声明两次** | 文件内相邻两处 |
| U1 | `unit/test/UnitTest.ts` `testTimeout` | 用 `@Test(..., 5)`（5 ms 超时）+ 内部 `setTimeout(..., 5)`，天然竞态 | 本机与 HEAD 上均间歇失败：`assert test timeout, timeout 5` |
| U2 | `unit/src/runner` + 各包 `unit.ts` | glob 未匹配到文件时 `runTest` 正常 resolve（0 suite、exit 0 的假绿） | 已在实践踩坑（临时 runner 放错目录 → 0 suite 假绿） |
| R1 | `repository` | 722 行有效代码、**零测试**；`model/field.resolver.ts` 640 行单文件 | `package.json` 无 `test` 脚本 |
| T1 | `typeorm-adapter` | 测试强依赖本地 PostgreSQL，无库即 `ECONNREFUSED 127.0.0.1:5432` 刷屏 | 实测 `npm test` 退出码 1 |

### 2.2 P1 工程质量 / 可维护性

| 编号 | 问题 | 影响 |
|---|---|---|
| E1 | 无根级测试入口，每个包各自 `unit.ts`，CI 必须逐包串脚本 | 全量回归成本高（compiler 单包 12.7 s，activities 10 min） |
| E2 | 覆盖率收集在 `unit-console`（399 行 V8 收集器）与 `unit-karma`（268 行）各写一份 | 同一份 V8 逻辑两处维护，行为容易漂移 |
| E3 | 各包 `test:coverage` 只产数据，无阈值、无合并报告 | 覆盖率无法作为门禁 |
| E4 | `annotations` 的 rollup/glup/esbuild 插件零测试 | 构建插件属于“发布链路”，回归无保护 |
| E5 | `common` 有效代码 2678 行，仅 `http` 子集有 34 个用例 | `stream/headers/message/pattern` 等纯逻辑无测试 |
| E6 | `unit-console` 断言只写 `expect(true).toBeTruthy()`，`render(suites, total)` 的 `total` 传 `[1000000, 2000000]` 得到 `(277.778h)` | 测试不校验输出，契约模糊 |

### 2.3 P2 性能（必须先建基准再动手）

| 编号 | 候选 | 现状判断 | 前置条件 |
|---|---|---|---|
| P1 | logger 过滤路径（级别关闭） | 结构性浪费（L1+L2），预计过滤路径可降一个数量级 | 新增 logger micro-bench |
| P2 | logger 取实例路径（L3） | `log4js.configure` 重建 appender，属“每次取都做重活” | 同上；改后需验证 appender 只建一次 |
| P3 | compiler 增量 AOT | `EsbuildBuildActivity` 已算 `mtime` 但未参与缓存决策，每次全量 emit | 先测 AOT 基线耗时 |
| P4 | `common` stream/headers | 无基准；`stream.ts` 多数是类型声明，逻辑量比行数小 | 先建 bench |
| P5 | ioc `ClassRef.getDefines` | 实测 152 ns 且不在热路径 | **不做**（无证据） |
| P6 | AOP JoinPoint 池化 | 剩余成本主要在对象分配，池化会改变 `joinPoint.destroyed` 契约 | 暂不做，需单独设计 |

## 3. 优化方案

### 阶段 A：正确性收口（P0，预计 1–2 天）

**A1 logger 写入路径**
- 方案：`writeLog` 去掉 async IIFE；先按 `logger.level` 判定是否输出，再格式化；`getLoggerManager` 只在配置首次加载（或配置对象变化）时 `configure`，其余命中缓存。
- 保留公共 API：`LogAspect.processLog/writeLog` 签名与日志内容顺序不变（先写单测锁顺序与文本，再改实现）。
- 验证：新增 `logger/test/write-path.spec.ts` —— ① 级别关闭时 `format` 不被调用（用 spy）；② 输出内容与旧实现逐条一致；③ `configure` 调 N 次 `getLogger` 只发生 1 次。
- 风险：日志顺序/时序变化 → 用“同内容、同步写出”的单测锁定；对异步 logger（log4js）保持原有写入调用。
- 验收：新增 micro-bench `log filtered / log emitted`，过滤路径 ≥5× 提升；logger 测试覆盖级别门控与 manager 幂等。

**A2 unit runner**
- 方案：① `runTest` 匹配到 0 个 spec 时 reject 并提示 glob 与 baseURL；② `testTimeout` 用例改为 `@Test(..., 50)` + 内部 5 ms；③ 超时错误信息带上用例名与耗时。
- 验证：新增 runner 单测——空 glob 必失败、超时用例稳定通过、真实超时仍报错。
- 验收：`packages/unit` 连续 20 次运行无 flaky。

**A3 typeorm-adapter 测试环境**
- 方案：检测连接可用性 → 不可用时 `describe.skip` 并打印“需要 PostgreSQL（PGHOST/PGPORT）”；支持 `SQLJS=1` 走 sql.js 路径（已有 `sqljs-lock.ts` 基建）。
- 验证：无库环境下 `npm test` 退出码 0 且输出 skip 原因；有库环境全量通过。
- 风险：不得把真实失败伪装成 skip —— skip 必须只针对连接失败，断言失败照常失败。

**A4 repository 测试基线**
- 方案：先补契约测试（模型元数据解析、字段解析、事务抽象），不做重构；测试通过后再评估 `field.resolver.ts` 拆分。
- 验证：`repository` 新增 `test` 脚本与 ≥15 个用例。
- 说明：这是后续 B1 的前置条件（无测试不重构）。

### 阶段 B：结构与可维护性（P1，2–3 天）

**B1 repository / typeorm-adapter 边界收敛**
- 现状：`repository` 定义模型/字段/事务抽象，`typeorm-adapter` 又实现驱动细节，`field.resolver.ts` 与 `TypeormAdapter.ts` 职责有重叠。
- 方案：`repository` 只保留“模型元数据 + 字段解析 + 事务接口”；`typeorm-adapter` 只做“驱动连接 + SQL/ORM 映射 + 迁移”。不允许两边都能解析字段。
- 验证：A4 的契约测试 + typeorm 回归（`test:regression`）。

**B2 覆盖率收集下沉**
- 方案：把 V8 覆盖率解析（`unit-console/V8CoverageCollector.ts` + `unit-karma/BrowserCoverageCollector.ts`）收敛到 `@tsdi/unit`（或新 `@tsdi/coverage`），两端只保留“采集入口 + 平台 IO”。
- 验证：两端覆盖率输出对同一 fixture 完全一致（快照测试）。

**B3 annotations 包下线（原“插件冒烟测试”已作废）**
- 结论：`@tsdi/annotations` 是死代码 —— 仓库内除 CLI 的脚手架安装列表外**零引用**，且 `iocAnnotations()` 在当前 TypeScript 下对任何含 class 的文件都会抛
  `TypeError: Converting circular structure to JSON`（`annations.type = node.name` 是 AST 节点）。功能由 compiler 的 AOT 链路取代。
- 已执行：删除 `packages/annotations`，移除 `packages/cli/src/cli.ts` 中 4 处 `@tsdi/annotations` 安装项；包枚举脚本（publish/verify/deps）是动态扫描目录，无需改动。
- 遗留待确认：`compiler/src/activities/AnnotationCompileActivity.ts` 被 `CompilerActivity` 的模板调用，但实现只是 `parse → printer.printFile`，**没有任何 ƿAnn 元数据注入**（还可能因打印 AST 丢失注释/格式）。需要二选一：
  (a) 补全为真正的注解注入（并把 `iocAnnotations` 的能力迁移过来 + 测试）；
  (b) 从 compiler 模板与导出中移除该步骤。

**B4 logger 单元补齐**
- 方案：覆盖 `Level` 判定、`DefaultJoinPointFormater`（各 JoinpointState）、`LoggerManagers` 的 adapter 解析与默认配置选择。
- 验证：logger 用例从 8 → ≥20。

### 阶段 C：性能（P2，3–5 天，逐项“先测后改”）

**C1 logger 基准与优化**
- 基准场景：`filtered`（级别关闭）、`emitted`（console sink）、`named logger 获取`。
- 目标（参照值，改前先测）：`filtered` ≥5×、`named logger 获取` 去掉重复 configure（次数断言）。

**C2 compiler 增量 AOT**
- 方案：以 `(文件路径, mtime, 内容 hash, 编译器选项)` 生成 manifest；命中则复用上次 emit 结果；不命中全量重编。
- 验证：① 二次构建耗时对比（同一工程，改 1 个文件）；② 命中/未命中产物逐字节一致；③ `aot-*.spec.ts` 全绿。
- 风险：AOT 产物含内联元数据，缓存键必须覆盖 tsconfig 与依赖版本。

**C3 common 基准**
- 先建 `bench`（headers 编解码、message 体解析、pattern 匹配），有数据后再决定是否改 `stream.ts`/`headers.ts`。
- 说明：`stream.ts` 大部分是类型声明，改造价值需数据支撑。

**C4 ioc/aop 遗留项**
- 仅当真实 TUI/agent 路径 profile 出证据时才做 JoinPoint 池化；无证据不做（与上一轮纪律一致）。

### 阶段 D：工程化门禁（P1，1 天）

**D1 根级 `gate` 脚本**
- `npm run gate`：包级 `tsc`（ioc/aop/core/common/compiler/i18n/logger/security/oidc-auth/unit*）→ 各包 `npm test` → `node scripts/check-source-size.mjs` → `node scripts/check-core-bench.mjs`。
- 与既有 `scripts/agents-gate.sh` 解耦（后者面向 agents/components），互不阻塞。

**D2 覆盖率门禁**
- 先记录现状（各包 line/function 覆盖率），再按包设定 ratchet 阈值；只允许上升。

**D3 统一 `unit.ts` 校验**
- 新增脚本校验每个声明的 `unit.ts` glob 至少匹配 1 个文件（防 U2 类假绿）。

## 3.5 实施进展（2026-11-17）

### A1 logger 写入路径 —— 已完成

改动：
- `writeLog` 去掉每条日志的 `async` IIFE（同步写出、按调用顺序）；
- 先按 `logger.level` 判定级别再格式化（`state` 派生级别：AfterThrowing→error、Pointcut→info、其余→debug）；
- `LoggerManagers` 每个 adapter 只应用一次配置（`applied` 记录），`configure()` 显式调用会接管并同步回 `cfgs`；
- 删除 `logger.ts` 中重复的 `abstract debug` 声明；
- `Level.ts` 用扁平的 rank 表替代数字 enum 反查（enum 同时含正反向映射，按名查找更慢）。

新增：
- `packages/logger/test/write-path.spec.ts`（10 个用例：级别门控、格式化调用计数、状态级别、未知级别不门控、顺序、configure 幂等/显式 configure 覆盖）；
- `packages/logger/bench/run.ts`（每个场景独立子进程，避免同进程 call-site 干扰）。

实测（best-of-7，20 万样本，隔离进程）：

| 场景 | 旧实现 | 现在 |
|---|---|---|
| 被过滤（info logger 收到 debug） | 151 ns | **21 ns（7.2×）** |
| 被过滤（state 派生级别） | 156 ns | **67 ns（2.3×）** |
| 正常输出（debug logger + debug） | 151 ns | 159 ns（噪声内） |
| 3 次取 logger 的 adapter configure 次数 | 4 | **1** |

测试：`packages/logger` 18 passing（原 8）。

### A2 unit runner —— 已完成

- 新增 `ensureSuitesFound`（`packages/unit/src/runner/ensure-suites.ts`）：glob 未匹配到任何文件时抛错（错误信息含 pattern、baseURL、`allowEmpty` 提示），并计入 BDD `describe` 注册的 suite；新增配置项 `allowEmpty`。
- `UnitTestService` 在 `oldRunner.run()` 之前调用该守卫。
- 修复自身竞态用例：`assert test timeout` 由 5 ms 超时（内部 5 ms 定时器）改为 200 ms，`assert test in time` 同步改为 200 ms。
- 新增 `packages/unit/test/ensure-suites.spec.ts`（8 个用例）。

验证：`packages/unit` **17 passing / 0 failing**（原 8 passing / 1 failing）；空 glob 端到端失败：
`No test files matched "./test/__no_such_spec__.ts" (baseURL: ...)`。

### A3 typeorm-adapter 测试环境 —— 已完成

- `unit.ts` 先做 TCP 探活（`PGHOST`/`PGPORT`，800 ms 超时）：
  - 不可达：打印明确 `[SKIP]` 说明并以 0 退出；
  - `REQUIRE_DB=1`：不可达时以 1 退出（CI 有数据库时用）。
- 验证（两种环境都实测）：
  - 无库：退出 0 + `[SKIP]` 提示；`REQUIRE_DB=1` 时退出 1。
  - 有库（docker `test-postgres`，库 `testdb`/用户 `postgres`）：`REQUIRE_DB=1 npm test` → **80 passing**，退出 0；`npm run test:regression` → **29 passing**，退出 0。

### 顺带修复（被 A1 暴露）

`packages/core/test/serverlog.spec.ts` 原先在 `Application.run()` **之后**删除日志目录，依赖“每次取 logger 都重新 configure”来重建 appender。A1 去掉重复 configure 后该用例失败（`Cannot call write after a stream was destroyed`）。已把目录清理移到应用启动前（这本来就是更正确的测试写法），`packages/core` 恢复 130 passing。

### A4 repository 契约测试（第一片）—— 已完成

- 新增 `packages/repository/unit.ts` + `package.json` 的 `test` / `test:coverage` 脚本（原先完全没有测试入口）。
- 新增 `test/field-resolver.spec.ts`（24 个用例）：
  - `parseDbtype` 的管道选择：通用管道、dbtype 专属管道优先、专属缺失时回退、`length` 透传、date/boolean/json/uuid 映射、缺管道抛可诊断错误、未知 dbtype 必须抛错（防止静默透传）；
  - `toPrimitType` 映射表：int/bigint/varchar/text/boolean/date/datetime/timestamp/bytea/json/jsonb/point/simple-array + 未知类型回退 `Object`。
- 这组测试同时锁住 `parseDbtype`（管道表）与 `toPrimitType`（类型表）两张**重复映射表**的现状，后续若合并为单一来源，可用它们验证无行为漂移。
- 结果：`packages/repository` **24 passing**（首次有测试）。

第二片（`getModelFieldResolver`，6 个用例）：dbtype 列经管道解析、缺值时回退列默认值、两者都没有返回 `null`、按类型名解析管道、缺管道抛可诊断错误、每个 runtime 只缓存一个 handler。

第三片（`@Transactional` 元数据，5 个用例）：默认 `propagation` 为 `REQUIRED`、显式 `propagation`/`connection` 保留、只有被装饰的方法进入元数据、方法选项里注册了 `TransactionResolver`、未装饰方法没有方法选项。

第四片（dbtype 回退表，12 个用例）：`bigint→bigint`、`float8→float`、`decimal→number`、`bit→boolean`、`bytea→buffer(+length)`、`longblob→blob(+length)`、`citext→string(+length)`、`timestamp/timestamptz→int`（已知设计）、`rowversion/hierarchyid→string`、`jsonb→json`。

第五片（全 dbtype 遍历，1 个用例）：用“任意 token 都返回同一个管道”的上下文跑完 `parseDbtype` 的整个 switch（140+ 个 case 标签），任何拼错的 `case` 或落空分支都会让它失败。

第六片（模型参数解析器，9 个用例）：标量/可空/嵌套模型字段解析、可空模型无字段返回 `null`、嵌套模型缺字段抛可诊断错误、缺失标量不设为实例属性、非模型参数透传给下一个 handler、`multi` 参数映射为数组、`multi` 无字段报错。

`packages/repository` 合计 **57 passing**，覆盖率 **65.4% stmts / 63.2% branch / 81.3% funcs / 81.1% lines**（工作前 26.9/27.1/27.6/68.2），基线已随 `--write` 更新。

### B3 annotations 下线 —— 已完成

- 依据：全仓零引用（仅 CLI 脚手架安装列表），且 `iocAnnotations()` 必然抛 `Converting circular structure to JSON`。
- 动作：删除 `packages/annotations`；`packages/cli/src/cli.ts` 移除 4 处 `'@tsdi/annotations'`。
- 门禁：`packages/cli` tsc 通过、`scripts/check-package-deps.mjs` 通过、`scripts/check-source-size.mjs` 通过。
- 注意：npm 上已发布的 `@tsdi/annotations` 版本不受影响；本次只停止后续发布与脚手架安装。

### D1 框架门禁 —— 已完成

- 新增 `scripts/run-framework-gate.mjs` + 根脚本 `npm run gate:framework`，覆盖本次范围内的 15 个包：
  `ioc / aop / core / common / compiler / i18n / logger / repository / security / oidc-auth / unit / unit-console / unit-karma / platform-server / typeorm-adapter`。
  步骤：静态检查（unit glob、source-size）→ 逐包 `tsc --noEmit` → 逐包 `npm test` →（可选 `RUN_BENCH=1`）ioc/aop 性能预算 →（可选 `RUN_COVERAGE=1`）覆盖率 ratchet。
  选项：`--skip-tsc`、`--skip-tests`、`--bench`/`RUN_BENCH=1`、`--coverage`/`RUN_COVERAGE=1`、`REQUIRE_DB=1`（无库时让 typeorm 用例失败而不是跳过）。
- 已验证：`node scripts/run-framework-gate.mjs --skip-tsc` → **framework gate PASSED**（15/15 包绿色，含 typeorm-adapter 真实库 80 用例）。
- 与 `scripts/agents-gate.sh`（面向 agents/components）互不重叠。

### D3 unit 入口 glob 校验 —— 已完成

- 新增 `scripts/check-unit-entrypoints.mjs`：扫描所有 `unit.ts`，校验其中 `./` 相对路径（含数组形式）至少匹配 1 个文件（`allowEmpty: true` 例外）。
- 首次运行即发现 3 个使用「数组变量」而非内联 glob 的入口（coap/http/tcp），据此把校验扩展为同时支持两种写法。
- 结果：**69 个 glob / 61 个 unit.ts** 全部有效。

### E5 common 纯逻辑测试 + 两个修复 —— 已完成

新增 `packages/common/unit.ts`（`./test/**/*.ts`），`package.json` 的 `test` 改为依次跑 `unit.ts` 与 `http/unit.ts`（保留 http 用例原有的 `baseURL` 语义）。

新增测试（51 个用例）：
- `test/utils.spec.ts`：`joinPath`（首尾斜杠、空段）、`normalize`（去尾斜杠/去 query/去前缀）、`parseTokenList`、`append`（Vary 去重/校验报错）、`escapeHtml`、`isIPv4`/`isIPv6`、XML/HTML/XSSI 嗅探。
- `test/pattern.spec.ts`：`patternToPath`（字符串/数字/正则/对象按 key 排序/嵌套/自定义分隔符）、`defaultFormatter`。
- `test/headers.spec.ts`：`HeaderMappings` 大小写不敏感读写、原始名保留、append 多值、delete/置空删除、原始报文解析、forEach、复制；`hasHeader`/`getHeader`/`getHeaders` 对普通对象与 `HeaderMappings` 两种入参。

顺带修复的两个真实缺陷：
1. `utils.ts` 的 `trim$` 正则缺 `g` 标志 —— `String.replace` 只替换第一个匹配，导致 `/a/` 只能去掉前导斜杠，`joinPath('/a/', '/b/')` 产出 `a//b/`、`normalize('/a/b/')` 保留尾斜杠。
2. `HeaderMappings.get(name)` 未做小写化（存储时统一小写），`get('VARY')` 恒为 `undefined`。

记录但**未修改**的限制：`joinPath('a/b', '../c')` 不会消解 `..`（已用测试锁定现状，避免误以为是 bug 修复）。

结果：`packages/common` **51 + 34 passing**；受 `normalize` 影响的路由相关包回归全绿：
service 88 / http 50 / gateway 149 / client 88 / ws 88 / tcp 65 / udp 54。

### E6 unit-console 输出断言 —— 已完成

原用例只断言 `typeof reporter.render === 'function'` 和 `expect(true).toBeTruthy()`，等于没有覆盖。新增 `test/reporter-output.spec.ts`（5 个用例），捕获 `console.log` 并断言真实输出：

- 通过用例：输出包含 `2 passing`、不含 `failed`；
- 失败用例：输出包含 `1 passing` / `1 failed` / 错误信息，且 `process.exit(1)`（用临时替换验证，不真的退出）；
- `renderCase`：通过打印 `√`、失败打印 `x`，并带耗时（`1.00ms`）；
- `renderSuite`：打印套件名；
- `track`：原样抛出错误。

结果：`packages/unit-console` **48 passing**（原 43）。

### B3b platform-*/activities 子路径下线 —— 已完成

结论：`packages/platform-server/activities` 与 `packages/platform-browser/activities` 是**陈旧且不可编译**的适配层。

证据：
- 二者引用的 `ParallelExecutor`、`WorkflowInstance`、`IActivityRef`、`ControlActivityElementRef`、`IContainer` 已不在 `@tsdi/activities` / `@tsdi/ioc` 的导出中；`getTypeName` 也从 `utils/lang` 迁走；构造函数签名与现状不符。
- `tsc --noEmit -p packages/platform-server/tsconfig.json` 与 `platform-browser` 在 HEAD 上就有 8–11 个错误（已用 HEAD worktree 复现，与本次改动无关）。
- 全仓引用只有 `packages/cli/src/cli.ts` 的 3 处脚手架安装项，无任何运行时 import。

动作：
- 删除两个子路径；`packages/cli/src/cli.ts` 移除 3 处安装项（`activity` 的 browser/server 分支与 `pack` 列表）。
- 门禁里 `platform-server` 的 “known pre-existing tsc failure” 条目一并移除（现为 0 条）。

验证：
- `tsc` 三个包全部通过：`platform-server`、`platform-browser`、`cli`（此前 `platform-server`/`platform-browser` 均为失败）。
- `packages/platform-server` 测试 20 passing；`check-unit-entrypoints`（70 glob / 62 入口）与 `check-package-deps` 通过。

### B4 i18n MessageFormatter 修复 —— 已完成

测试时发现并修复 `packages/i18n/src/message.ts` 的两个真实缺陷：

1. **ICU 检测漏判**：`format()` 用 `message.includes(', plural,')` 判断，ICU 允许逗号后不带空格（`{count,plural,one{...}}`），这类消息完全不处理、原样返回。
   修复：改为形状匹配 `/\{\s*\w+\s*,\s*(?:plural|select)\s*,/`。
2. **`$` 序列被当成替换模式**：`result.replace(pattern, replacement)` 会把译文里的 `$&`、`$'`、`$$` 展开成匹配内容，实测 `2 items $& cheap` 被污染成 `2 items {count, plural, ...} cheap`。
   修复：改用函数替换 `replace(pattern, () => replacement)`。

新增 5 个用例（无空格 ICU、`$&` 字面量、select 内嵌占位符、plural 内嵌占位符、俄语复数三形态）；`packages/i18n` **57 passing**（原 52）。

### B5 security JWT 加固 —— 已完成

审计 `packages/security/src/jwt/jwt.service.ts` 发现两个可被利用的问题：

1. **生产环境静默使用内置默认密钥**：`JWT_SECRET` 缺失时回退到 `'default-secret'`，只打印一条 warn —— 等于所有 token 都可伪造。
   修复：`NODE_ENV === 'production'` 且无 `JWT_SECRET` 时**直接抛错**（`refusing to sign or verify with the built-in development secret`）；非生产保留回退但提示更明确。
2. **验证未约束算法族**：使用共享密钥验证时可接受任意算法，留出算法混淆（RS256 token 被当作 HMAC 校验）的空间。
   修复：无 `publicKey` 时默认只接受 `HS256/HS384/HS512`；显式传 `publicKey` 时交由调用方 `algorithms`。

新增 `packages/security/test/jwt-hardening.spec.ts`（5 个用例）：生产环境缺密钥拒签、生产环境正常签验、非生产回退可用、**RS256 伪造 token 用共享密钥验证必须被拒**、显式公钥可验证 RS256。

结果：`packages/security` **40 passing**（原 35），`tsc` 通过。

### D2 覆盖率 ratchet —— 已完成

**修掉的缺陷**：`packages/unit-console/src/V8CoverageCollector.ts` 的 `globToRegex` 只锚定结尾、且 `**/` 语义错误：

- `src/**/*.ts` 能匹配 `/anywhere/packages/ioc/src/a.ts`（结尾匹配）→ **单包覆盖率统计到 204 个文件**；
- `**/node_modules/**` 这类结尾 `**` 永远匹配不到（被翻译成要求尾斜杠）。

修复：锚定开头、按 `**/`（零或多段）、`**`（任意）、`*`（段内）、`?`（单字符）分别翻译，并转义正则元字符。新增 `packages/unit-console/test/coverage-glob.spec.ts`（7 个用例）。

效果：`packages/logger` 的 `npm run test:coverage` 从 **204 files / 70.9%** 变为 **12 files / 74.7%**（默认 include 即可按包生效，无需改 15 个 `unit.ts`）。`unit-console` **55 passing**。

**基线（15 个包全部记录，`scripts/coverage-baseline.json`）**

| 包 | Lines | Stmts | 包 | Lines | Stmts |
|---|---|---|---|---|---|
| ioc | 79.9% | 77.6% | core | 73.7% | 63.0% |
| aop | 82.1% | 75.4% | common | 71.1% | 40.6% |
| compiler | 64.9% | 68.6% | i18n | 82.0% | 81.3% |
| logger | 74.7% | 52.9% | repository | 69.6% | 33.9% |
| security | 83.9% | 92.7% | oidc-auth | 84.7% | 71.4% |
| unit | 63.1% | 52.4% | unit-console | 81.7% | 80.4% |
| unit-karma | 50.4% | 37.7% | platform-server | 43.6% | 38.5% |
| typeorm-adapter | 71.4% | 59.6% | | | |

顺带给 `i18n`、`unit-karma` 补上了缺失的 `test:coverage` 脚本（原来只有 `test`），保证 15 个包口径一致；`common` 的两个入口合并为一个（`unit.ts` 同时跑 `test/**` 与 `http/test/**`，实测 85 passing），避免覆盖率只统计其中一个入口。

**顺带补完的功能**：`unit-console` 的 `html` / `lcov` / `cobertura` 三个 reporter 以前只打印 “would be generated in …”，**从不写文件**（选项存在但功能是空的）。现在会真正生成：

- `lcov.info`：`SF:` / `DA:<line>,<hits>` / `LF:` / `LH:` / `end_of_record`；
- `cobertura.xml`：`<coverage line-rate>` + 每个文件的 `<class><lines>`；
- `index.html`：按行覆盖率排序的表格 + 颜色分级，文件名做 HTML 转义。

新增 `test/coverage-reporters.spec.ts`（7 个用例）。原有的 html/lcov/cobertura 用例改为写入临时目录并断言文件存在（此前只断言 `true === true`，且会在包内留下 `test-coverage/` 产物）。`unit-console` 测试 57 → **64 passing**，行覆盖率 33.3% → **81.9%**，基线已更新。

> 同样的空实现仍存在于 `unit-karma/src/coverage.ts`（与 unit-console 的重复实现，见 B2）；本次只修了 unit-console，unit-karma 待 B2 合并时一并处理。

**新增 ratchet 门禁**：`scripts/check-coverage.mjs` + `npm run coverage:check`，基线存 `scripts/coverage-baseline.json`。

- 逐包跑 `test:coverage`，解析 `Total` 行，任一指标低于基线超过 `COVERAGE_TOLERANCE`（默认 0.5 个百分点，容忍 V8/ts-node 漂移）即失败；
- `--only=logger,repository` 局部检查；`--write` 审核后刷新基线（合并写入，不会丢其他包），**降低任何指标都需要显式 `--force`**；
- 解析规则：取输出里**最后一个** `Total` 行 —— 有些包的测试会自己收集覆盖率（或 `test:coverage` 跑多个入口），中途会打印中间态汇总，取第一个会得到嵌套运行的片段数字；
- 已验证失败路径（把 logger 基线改成 99% → exit 1 且打印 `-24.3`）与 `--write` 路径（4 条基线完整保留）。

**顺手修掉的覆盖率污染**：`V8CoverageCollector.collect()` 以前会读取 `.nyc_output` 里**历次运行**的 dump，导致覆盖率不可复现；现在收集前先清理该目录（新增 2 个用例，包含“缺目录不报错”）。`unit-console` **57 passing**。

ratchet 阈值建议：以基线为下限、只允许上升；`repository` 继续补测试后再提高阈值。

### B6 platform-server 参数解析修复 —— 已完成

审计 `packages/platform-server/src/args.ts` 时发现两个真实缺陷：

1. **数值判定正则未转义点号**：`/^\d+(.\d+)?$/` 中的 `.` 匹配任意字符，`--x=1a2` 会被当成数字并截断成 `1`。
   修复：`/^\d+(\.\d+)?$/`；数值转换同时改用 `val.includes('.')` 判断（旧代码用 `indexOf('.')`，`.5` 这种会走错分支）。
2. **自定义信号列表被忽略**：`tryGetSignls()` 在传入数组时返回模块级默认列表 `signls`，调用方配置的 `['SIGINT']` 完全无效。
   修复：数组原样返回；字符串按逗号切分并 trim/去空。

新增 `packages/platform-server/test/args.spec.ts`（11 个用例）：flag/值解析、整数与小数、非数字保持字符串、mode 解析（NODE_ENV/APP_MODE/--mode）、debug 解析、env 与参数回退、信号列表三种来源、`reset` 重新解析、`mergeEnvironment` 覆盖。

结果：`packages/platform-server` 20 → **31 passing**。

### B7 OIDC JWKS 缓存 —— 已完成

`validateIDToken` 原先每次校验都 `fetch(jwksURI)`，一次登录多一次完整 RTT，并给 IdP 增加无谓负载。

实现：
- 按 `jwksURI` 缓存 JWKS 文档，默认 TTL 5 分钟（`OIDC_JWKS_CACHE_TTL_MS` 可覆盖）；
- 命中不到 `kid` 时**强制刷新一次**（应对提供方轮换密钥），仍找不到才抛 `Public key not found`；
- 导出 `clearJwksCache()` 供应用主动失效。

验证：新增 `packages/security/test/oidc-jwks-cache.spec.ts`（5 个用例：连续三次校验只 fetch 一次、密钥轮换后刷新一次、刷新后仍缺失则失败、TTL 到期重新拉取、缺 `jwksURI` 仍报错）。原 `oauth-flows.spec.ts` 里“空 keys”用例补了显式清缓存（它原本依赖“每次校验都 fetch”的旧假设）。

`packages/security` 40 → **45 passing**；`oidc-auth` 54 passing 未受影响。

### 待办（按价值排序）

1. **C2 阶段 2（跨进程 AOT 增量）**：`ts.createIncrementalProgram` + `.tsbuildinfo`，buildinfo 名需含 transformer 版本；阶段 1 已交付进程内复用（§3.6）。
2. **unit-karma 覆盖率实现**：与 unit-console 重复的一份实现（`B2`），其中 `html`/`lcov`/`cobertura` 仍是“只打印不写文件”的空实现；建议把 reporter 下沉共享，而不是复制 unit-console 的新实现。
3. **OIDC JWKS 缓存**：`validateIDToken` 每次都 fetch JWKS（§“审计发现”），需先确认测试对 fetch 次数的假设再改。
4. **repository 覆盖率**：语句覆盖 33.9%，仍是最低项；`model/connection.ts`、`model/repository.ts` 尚无直接用例。
5. **C1 之后可能的 logger 增量**：`LoggerManagers` 的 adapter 解析缓存（当前每次 `getLogger` 走 2 次 map 查找），需先建基准证明值得。

## 3.6 C2 AOT 增量编译（阶段 1 已完成，阶段 2 待实施）

**现状与基线**
- 新增基准：`packages/compiler/bench/aot.ts`（`npm run bench`），生成 N 个带装饰器的类并统计 `emitAotProject` 的最快耗时。
- 基线（40 个文件，best-of-3，机器当时有负载）：**≈6.2 s**（样本 6.7 / 6.2 / 14.4 s，负载下波动极大，正式对比必须在空闲时同会话进行）。
- 现状：`emitAotProject` 每次 `ts.createProgram` 全量类型检查 + 全量 emit，无任何缓存；`EsbuildBuildActivity` 已采集 `mtime` 但未参与缓存决策。

**已实施：阶段 1（进程内 Program 复用）**

- `AotCompiler` 增加 program 缓存：键 = `rootNames` + 影响 program 构造的选项（strict/target/module/moduleResolution/decorators/jsx/paths/baseUrl/types/lib），缓存项记录 program 内**所有源文件的最大 mtime**，任一文件更新即重建；上限 4 个，`NO_CACHE=1` 强制冷启动。
- 只影响 emit-only 选项（outDir/declaration/sourceMap）时复用同一 program，不会产物错位。
- 实测（40 文件 fixture，`packages/compiler/bench/aot.ts`）：

| 场景 | 耗时 |
|---|---|
| 冷启动（首次 emit） | 4 692 ms |
| 复用 program（第 2/3 次） | **118 / 77 ms（约 40–60×）** |

- 边界：只对**同进程内的重复构建**（dev watch、多次 `npm run build`）有效；一次性构建无变化。跨进程增量（`.tsbuildinfo`）仍是阶段 2。
- 验证：新增 `packages/compiler/test/aot-incremental.spec.ts`（3 个用例：冷/热产物逐字节一致、源文件变更后重建、`NO_CACHE=1`）；`packages/compiler` 109 → **112 passing**；`tsc` 通过。

**阶段 2 尝试与结论（已回退）**

尝试用 `ts.createIncrementalProgram` + `.tsbuildinfo` 做跨进程增量，实测（40 文件 fixture，独立进程）：

| 方式 | 第二次构建 |
|---|---|
| `.tsbuildinfo` 增量 | 3 968 ms |
| `NO_CACHE=1`（全新 program） | 3 990 ms |

差异在噪声内：AOT emit 路径仍需 `ts.getPreEmitDiagnostics(program)` 做完整诊断，无法跳过类型检查；要拿到收益就必须改动 `result.diagnostics` 的语义。按“无实测收益不保留”的纪律，**已回退该实现**，只保留阶段 1。

**剩余方案（分级）**
2. **跨进程增量（中风险）**：改用 `ts.createIncrementalProgram` + `.tsbuildinfo`：
   - `tsBuildInfoFile` 名称必须包含 **AOT transformer 版本常量**（否则升级 transformer 后旧 buildinfo 会让产物过期）；
   - `emit` 仍走现有 writeFile 回调与自定义 transformer；
   - 出口开关：`AOT_INCREMENTAL=1` 启用，`NO_CACHE=1` 强制全量。
3. **文件级短路（低风险，可独立落地）**：若某源文件内容哈希与输出文件 mtime 都未变，跳过该文件的写盘（仍需 program 完成类型检查）。

**验收标准**
- 冷/热两次构建产物**逐字节一致**（对同一 fixture 做 diff）；
- 修改 1 个文件后：仅该文件产物变化，其余时间戳不变；
- 40 文件 fixture 热构建耗时显著低于基线（同会话对比，给出 before/after 表）；
- `compiler` 现有 114 个用例保持全绿。

**风险**
- 自定义 transformer + buildinfo 的组合是 TypeScript 的非典型用法，必须由“产物逐字节一致”测试兜底；
- 增量缓存不得改变 `emitAll`/`rootNames` 的语义，`NO_CACHE=1` 必须能一键回退。

## 3.7 AnnotationCompileActivity 下线 + keepNames 替代（已完成，决策：a/b/c 中的 c）

**问题**：该活动只做 `parse → printer.printFile`，不注入任何 `ƿAnn` 元数据，只把文件重排（空行被压缩）；现有 `Workflow.run` 用例从未真正绑定 `@Attribute()`，属于空转测试。

**决策依据（实测）**：注解注入唯一不可替代的价值是“压缩后保留类名”，而这用 esbuild 原生选项即可达成：

```
keepNames=false  ->  NAME= n                    (101 bytes)
keepNames=true   ->  NAME= VeryLongServiceName  (217 bytes)
```

类名是运行时契约的一部分（`ClassRef.className`、`execution(...)` 切点匹配、诊断信息都读 `type.name`）。

**已执行**
- 删除 `packages/compiler/src/activities/AnnotationCompileActivity.ts` 及其导出；
- `CompilerActivity` 模板与 `CompilerTemplate`（default/production/development 三套）移除 `annotation-compile` 步骤与 `addAnnotationCompile` 构建方法；
- `EsbuildBuildActivity` 在 minify（含恒压缩的 FESM 打包）时设置 `keepNames`，并抽出可测试的 `shouldKeepNames()`；
- 测试调整：删除 7 个注解活动用例 + 2 个空转用例，新增 4 个（三套模板都不含该步骤 + `shouldKeepNames` 语义）；`sequence-execution` 用 `DeclarationGenerateActivity` 替代该阶段验证顺序。
- 结果：`packages/compiler` **109 passing**（原 114，净减 5 条无效用例），`tsc` 通过。

**未覆盖**：`ƿAnn` 还能提供 `abstract` 标记与构造函数参数表；若将来压缩产物需要判断抽象类，需要单独实现（与本次无关）。

## 3.8 改动清单（按包）

| 包 | 主要改动 | 验证 |
|---|---|---|
| `ioc` | `NonSingleton` 位值、`Optional`/父转发 flag、`clear()` 归属、`registerToParent()` 钩子、type provider 增删、无参调用跳过 RunContext、`onSettled` 工具 | 268 passing；`inject-flags.spec.ts`（14）、bench |
| `aop` | Advisor 扁平表 + 零分配解析 + `version`、代理属性匹配缓存、JoinPoint 不注册/不挂父销毁/调用后释放 | 58 passing；`joinpoint-lifecycle.spec.ts`（9）、advised 调用 26× |
| `core` | 仅测试修正（`serverlog.spec.ts` 目录清理时机） | 130 passing |
| `logger` | 写入路径去 async IIFE + 级别门控、configure 幂等、重复声明清理、rank 表 | 18 passing；`write-path.spec.ts`（10）、bench 7.2× |
| `unit` | `ensureSuitesFound` 零匹配守卫 + `allowEmpty`、竞态用例修复 | 17 passing；`ensure-suites.spec.ts`（8） |
| `unit-console` | 覆盖率 glob 语义、跨运行清理、html/lcov/cobertura 真正写文件、输出断言 | 64 passing；`coverage-glob.spec.ts`（9）、`coverage-reporters.spec.ts`（7）、`reporter-output.spec.ts`（5） |
| `unit-karma` | 补 `test:coverage` 脚本 | 81 passing |
| `common` | `trim$` 加 `g`、`HeaderMappings.get` 大小写、双入口合并、51 个新用例 | 85 passing；`utils/pattern/headers.spec.ts` |
| `i18n` | ICU 无空格识别、`$` 序列字面量化 | 57 passing；`message.spec.ts` +5 |
| `security` | 生产环境拒绝默认密钥、共享密钥只接受 HMAC | 40 passing；`jwt-hardening.spec.ts`（5） |
| `repository` | 首次引入测试入口 + 47 个用例（dbtype/管道/事务元数据） | 47 passing；覆盖率 33.9% stmts |
| `platform-server` | `isNum` 点号转义、信号列表修复 + 11 个用例外 | 31 passing；`args.spec.ts` |
| `compiler` | 删除无注入的 `annotation-compile` 步骤与类、esbuild `keepNames`、空转测试改写 | 109 passing |
| 删除 | `packages/annotations`、`platform-{server,browser}/activities` | 相关 tsc 由失败转通过 |
| 工程化 | `gate:framework`、`bench:core`/`bench:check:core`、`coverage:check`、`check-unit-entrypoints` | 全部可独立执行 |

## 4. 验收标准

1. 每项改动必须同时具备：**回归测试**（先证明旧实现失败或先锁定现有行为）+ **门禁命令** + 性能项的**同会话 before/after 数据**。
2. 阶段 A 完成标准：`logger` / `unit` / `typeorm-adapter` 三包可在本机稳定跑通（无 flaky、无环境噪音失败）。
3. 阶段 B 完成标准：`repository` 有测试脚本；覆盖率解析只有一份实现；`annotations` 有冒烟测试。
4. 阶段 C 完成标准：每项给出 bench 表；无提升的改动必须回退（延续上一轮 ioc/aop 的做法）。
5. 阶段 D 完成标准：一条命令覆盖全部在范围包的门禁。

## 5. 风险与回滚

| 改动 | 风险 | 回滚策略 |
|---|---|---|
| logger 写入路径 | 日志顺序/内容变化会影响排障与测试输出 | 先写“内容与顺序”快照测试，再改实现；失败即回滚 |
| logger configure 幂等 | 动态改配置的场景可能不再实时生效 | 提供显式 `configure()` 强制刷新；幂等只作用于“读取 logger”路径 |
| unit runner 0 匹配失败 | 某些包可能依赖空 glob 的旧行为 | 先扫全仓 `unit.ts` 确认都有匹配 |
| typeorm 测试 skip | 可能掩盖真实失败 | 只对连接错误 skip，断言失败不 skip，并在输出中打印原因 |
| compiler 增量缓存 | 陈旧产物 | 命中/未命中产物逐字节比对 + 一键 `NO_CACHE=1` 关闭 |
| repository 重构 | 无测试保护 | A4 先行；拆分只搬代码不改行为 |

## 6. 明确不做

- `components*` 全部包（用户明确排除）。
- 微服务、`workflow-admin`、`activities`、`agents/*`。
- `ClassRef.getDefines` 缓存：实测 152 ns 且非热路径。
- ioc/aop 大规模重构：上一轮已交付 26× 的 advised 调用提升，继续改需新证据。
- 任何“先加缓存/先加判断”的无数据优化（仓库既有纪律）。

## 附录：命令清单

```bash
# 全范围门禁（19 个 tsc 目标 + 15 个包测试）
npm run gate:framework
RUN_BENCH=1 RUN_COVERAGE=1 npm run gate:framework   # 附带性能预算与覆盖率 ratchet

# 单个门禁
npm run bench:core          # ioc/aop 基准，输出 JSON
npm run bench:check:core    # 性能预算
npm run coverage:check      # 覆盖率 ratchet
node scripts/check-unit-entrypoints.mjs   # unit.ts glob 校验
node scripts/check-source-size.mjs        # 源文件体量 ratchet

# 各包当前测试数
ioc 268 | aop 58 | core 130 | common 85 | compiler 109 | i18n 57
logger 18 | repository 47 | security 40 | oidc-auth 54 | unit 17
unit-console 57 | unit-karma 81 | platform-server 20
typeorm-adapter 80（真实库，REQUIRE_DB=1）+ 29（regression）
```
