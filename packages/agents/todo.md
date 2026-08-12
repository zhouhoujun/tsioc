# Agents 后续打磨清单

## 功能总纲

主干能力已齐（2026-08 对比 Codex / opencode 口径）：turn 循环（run/streaming）、多模型适配（Echo/Anthropic/OpenAI/Routed + profiles + complexity 路由 + worker-class 路由 + 命令级 profile + retry-after 分类退避）、prompt cache 支持（请求侧 cache_control + 系统提示静态段前置）、上下文压缩 + 重放（overflow 克隆最后用户消息 / 主动 continue 提示 + 媒体占位符）、turn diagnostics（store/aggregate/trend）、补偿/回滚（LIFO + 审计 + 文件快照 undo/redo）、Git step 快照 + 消息级 revert/unrevert + 会话 diff、审批流（自动评审 / granular 类别 + 网络目的地放行 / expiry/FIFO/防御清扫/审计落库）、sandbox 策略矩阵（capability 级 + OS 级 sandbox-exec + 会话级运行时切换）、40+ 工具组（files/git/terminal/browser 轻量 + playwright/web/http/memory/skills/mcp/scheduling/cron/kanban/knowledge/media/audio/capture/code-execution/process/security/communication/sessions/project/data/backup/pipeline/poll/approval/ai-cli/lsp/ssh/coding 等）、LSP 诊断反馈闭环（编辑后 didChange → 拉诊断 → 证据注入）、MCP stdio + Streamable HTTP client + OAuth + server tool、skills 系统（本地注册表/目录/turn interceptor/激活提示）、声明式 agent 原型（plan/build/review + 工具门控）、语义记忆检索（embedding + 三模式降级）、自动标题/摘要、会话 fork（branch 血缘继承）、编排（parallel_spawn/spawn_agent/llm_task/coding_task + delegation graph tree/lineage + worker 自动分类 + thread 状态 + thread 级工件聚合 + 子任务加密 + per-agent 权限）、可观测（audit/stats/compaction-history/summary-quality/turn-diagnostics/delegation/usage + evidence-ledger/verification-gate/weakness-miner/harness-profile 循证螺旋 + dashboard digests + AGENTS 规则草案生成）、hooks 系统（before/afterTurn、before/afterTool、onApproval，命令 + 进程内函数双形态）、gateway（JSON-RPC + HTTP + SSE + owner 鉴权 + InMemory/TypeOrm 持久化 + OpenAPI 3.1 文档）、console TUI（~15 面板 / ~30 命令 / vim mode / review hunk 折叠 + side-by-side / ssh 远程 shell / 实时双向语音 / 主题 / workspace mentions）、CLI（chat/run 一次性/rpc-stdio/tools list/doctor/completion/update + fast/strong 自适应配置）、多代理 v2（per-spawn profile/reasoning/concurrency + 子任务加密）、AGENTS.md 指令链（override/fallback/32KiB 上限/root→cwd 拼接 + FileAdapter 注入）、skills 远程市场（git/registry 源安装 + 版本追踪 + 冲突检测）、后台子代理 fire-and-collect（不阻塞当前 turn + 完成事件经 gateway/UI 回传）、LSP server 自动安装（语言→安装命令映射 + 缺失降级提示）。

## 已实现功能（P67–P89 落地明细，2026-08）

> P0–P66 打磨条目历史与回归记录见文末「已完成（历史）」。以下为 P67–P89 按方向归类的**已实现功能**清单（非计划）。

### 编码反馈闭环

- **P67 · 编辑 → LSP 诊断反馈**：`write_file` / `edit_file` / `apply_patch` 执行成功后触发 `textDocument/didChange` → 拉取缓存 diagnostics → 追加为工具结果 `lspDiagnostics`（有界截断、不阻塞写入）；注入 `VerificationGate` 为 `evidence.verification == 'lsp'` 新证据源（severity 1 过滤），与 declared-vs-actual 并行；支持 `lsp.diagnosticsOnEdit: boolean | 'auto'` 开关、无 LSP 配置静默降级。锚点：`agent-tools/lsp/lsp-client.ts`、`agent-tools/lsp/lsp-manager.ts`、`agent/src/harness/ToolExecutionCoordinator.ts`（`extractLspDiagnostics`）、`agent/src/harness/VerificationGate.ts`。
- **P79 · 编辑后验证命令证据**：工具轮编辑文件后，运行时对受影响包探测 package.json `test`/`build`/`typecheck`/`lint` 脚本 → 运行命令（有界超时 + 输出截断）→ 记录为 `evidence.verification == 'verify-command'` 新证据源；`VerificationGate` 新增检查 (d) 消费失败命令为伪造原因，与 lsp / declared-vs-actual 并行；支持 `verification.verifyCommands` 显式注入模板、`autoScripts`（默认 `['typecheck','lint']`，长耗时 test/build 需显式配置）、`timeoutMs`/`maxOutputChars`。锚点：`agent/src/harness/VerifyCommandRunner.ts`、`agent/src/harness/VerificationGate.ts`、`agent/src/runtime/DefaultAgentRuntime.ts`（`runVerificationCommands`/`trackEditedFile`）、`agent/src/options.ts`。
- **P71 · Git step 快照 + revert/unrevert**：每 step-start 以 `git stash create` + pinned refs 捕获整树（不污染历史），绑定会话消息 id；`revert(messageId)` / `unrevert()` 恢复工作树 + 会话双态；会话 diff 计算（`GET /api/sessions/:id/git-snapshots*` + `session.git_snapshot.*` RPC）；与 FileSnapshotStore 并存（git 整树恢复 + File 精确 undo）。锚点：`agent/src/harness/GitStepSnapshotStore.ts`、`agent/src/runtime/DefaultAgentRuntime.ts`、`agent-gateway/src/api/SessionHandler.ts`；agent-ui review 面板复用会话 diff。
- **P76 · 模型请求重试/退避分类**：rate-limit / server(5xx) / network / timeout 四类分类 + 指数退避 + jitter，尊重秒数/HTTP-date `Retry-After`（15 秒上限），OpenAI-compatible 与 Anthropic 共享策略。锚点：`agent/src/model/RetryPolicy.ts`。
- **P89 · LSP server 自动安装**：`LspInstallManager` 提供扩展 → server 命令 → 安装命令内置映射（typescript-language-server / pyright-langserver / gopls / rust-analyzer / vscode-langservers-extracted / markdown-language-server / bash-language-server，npm/go/rustup），`command -v`/`where` 可用性探测 + 有界超时安装；`LspServerOptions.install` 显式覆盖；`LspServerManager.clientFor` spawn 前探测，`autoInstall: true` 自动安装、其余返回安装提示（`installHintFor`），LSP 工具缺失时输出带安装命令的 hint。锚点：`agent-tools/lsp/lsp-install.ts`、`agent-tools/lsp/lsp-manager.ts`、`agent-tools/lsp/lsp.tools.ts`、`agent-tools/src/options.ts`。

### 上下文工程

- **P68 · Compaction replay + 媒体占位符**：硬性 overflow 克隆最后用户消息（媒体附件 → `[Attached <type>: <name>]` 文本占位符）`replayKind: 'last-user-message'`；主动压缩注入「Continue if you have next steps」`replayKind: 'continue-prompt'` 防重复注入；`CompactionHistoryRecord`（`replayed`/`replayKind`）与 `AgentTurnDiagnostics`（`replayCount`/`replayKind`）全链路传播。锚点：`agent/src/context/AgentContextManager.ts`、`agent/src/harness/CompactionHistoryStore.ts`。
- **P69 · Prompt cache 请求侧落地 + 系统提示分段**：`PromptSection.cacheable` 标记（DateTime/Memory 置 false），静态段（identity/project/tools）前置、动态段后置保证前缀稳定；openai provider 标注 `cache_control: {type: 'ephemeral'|'persistent'}`（supported 'full'）、deepseek 依赖自动 context caching（supported 'partial'）、其余 observe_only；静态前缀 hash 跨请求比较，tools/system 变更时 `PromptCacheRuntimeMetadata.prefixBroken` 置 true。锚点：`agent/src/model/OpenAICompatibleModelAdapter.ts`、`agent/src/model/PromptCachePolicy.ts`、`agent/src/prompt/SystemPromptBuilder.ts`。
- **P72 · AGENTS.md 指令链升级**：`findAgentsDoc` 返回 root→cwd 有序指令链（override → 主文件名 → fallback 去重，`AGENTS.override.md` 优先）；`projectDocFallbackFilenames` / `projectDocMaxBytes`（32KiB 字节截断不劈多字节字符）；walk 从 cwd 起、root 处 `stopAt` 收束；`initAgentsDoc`/`analyzeProjectStructure` 注入式 `FileAdapter` 驱动，移除 node `fs/os/path` 直接依赖。锚点：`agent/src/project/agents-doc.ts`、`agent/src/project/init-agents-doc.ts`、`agent/src/prompt/sections/ProjectContextSection.ts`。
- **P73 · 语义记忆检索**：`MemoryEmbedder`（DI token，无配置回退关键词）+ cosine 排序 + `SemanticMemoryRanker`（topK/minScore）；`MemorySearchService` 编排 keyword/semantic/hybrid 三模式（hybrid = semantic 前置 + keyword 独有去重附加）；`memory.search` 支持 `mode`/`minScore`。锚点：`agent/src/memory/AgentMemoryRetriever.ts`、`agent-tools/memory/*`。
- **P74 · 自动标题/摘要**：首条用户消息异步生成 title/focusSummary，LLM + deterministic 回退，接入 session/project 展示。锚点：`agent/src/memory/LLMAgentSummaryAgent.ts`、`agent/src/runtime/DefaultAgentRuntime.ts`。
- **P78 · 项目记忆闭环**：`buildAgentsRuleDraft(report)` 将 WeaknessMiner 高频失败渲染为带人工审核标记的 AGENTS.md 规则草案；`harness.audit` 经 `includeDraft: true` 返回，默认不写入项目文件。

### 配置迁移

- **P81 · Claude Code / Cursor 配置迁移**：新增 CLI `tsdi-agent import` 与 `import_config` 工具，支持 CLAUDE.md、`.cursor/rules/*.md`、`.cursor/mcp.json` / `.mcp.json` 的预览与显式 `--apply` 两阶段迁移；AGENTS.md 采用 marker 分区幂等更新，MCP servers 合并进 agent settings 并保留无关配置；workspace/symlink 守卫、source 校验及多来源同次应用防覆盖。锚点：`agent-tools/project/import-config.tool.ts`、`agent-cli/src/import-command.ts`。

### skills 生态

- **P87 · skills 远程市场**：`RemoteSkillManager` 安装/更新/列出/移除 git 与 registry 源——git 源 shallow clone + ref 固定 + `pull --ff-only`/fetch+reset 更新 + tag/short-hash 版本解析，registry 源 JSON manifest 拉取 → SKILL.md 物化 + manifest.version 追踪；与已注册技能做 id 冲突检测（`force` 可覆盖，冲突/失败自动回滚）；`provideSkills` 增加 `remoteCacheDir`（默认 `~/.tsdi-agent/skills`）provide 时同步加载为 `source: 'remote'` 技能；`skills_remote` 工具（install/update/list/remove/status）。锚点：`agent-tools/skills/remote-skill-manager.ts`、`agent-tools/skills/remote-skill.tool.ts`、`agent-tools/skills/provider.ts`。

### 后台子代理

- **P88 · 后台子代理 UX**：`spawn_agent background: true` 以 fire-and-collect 模式运行——`BackgroundTaskManager.start()` 立即返回 running 记录（不阻塞当前 turn），异步 runner 完成/失败回写状态与结果并 publish `AgentBackgroundTaskStarted/Completed/FailedEvent`；`get/list/cancel/wait` 收集结果；经 `BACKGROUND_TASK_RUNNER` DI token 注入 runner（避免与 nested-agent-runner 的加载顺序环）；gateway `EventHandler` 转 `background_task_started/completed/failed` SSE，agent-ui `AgentConsoleEventBridge` 绑定事件推送活动通知。锚点：`agent/src/runtime/AgentEvents.ts`、`agent-tools/src/background-task-manager.ts`、`agent-tools/agent/spawn-agent.tool.ts`、`agent-gateway/src/api/EventHandler.ts`、`agent-ui/src/AgentConsoleEventBridge.ts`。

### 远程传输层（G21 第一步）

- **P90 · Gateway 远程传输层**：gateway 新增 `POST /rpc/stream` 路由（`AppRpcHandler`，NDJSON 逐条 yield `AppRpcServer.streamPayload`——`run.turn_stream` chunk 通知 + 最终 result 可经 HTTP 流式消费，普通方法退化为单条 result；错误以 NDJSON error 行回传）；顺带修复 `describeStreamEvent` 缺 `turn_completed` / `background_task_started/completed/failed` 事件映射（流式 RPC 此前会静默丢弃这些事件）。agent-ui 新增 `HttpAgentConsoleAppRpc`（实现 `AgentConsoleAppRpc`：fetch POST `/rpc` JSON-RPC 2.0，Bearer token / 超时 AbortController / RPC error 与 HTTP 错误映射；`stream` 经 fetch + ReadableStream 解析 `/rpc/stream` NDJSON，输出形状与本地 `agent-app-server.module.ts` 桥一致——chunk 映射为 `{type, content, usage, eventType, label, status, toolName}`、result 映射为 `{type:'done', ...}`；无 node API、`globalThis.fetch` 守卫，浏览器/Node≥18 通用）与 `AgentConsoleRemoteEventBridge`（fetch + ReadableStream 增量解析 SSE（`parseSseFrames`/`decodeSseFrame` 纯函数）、`applyRemoteEvent` 将 `GatewayEventRecord`（turn/tool/approval/error/compensation/context/background-task 等 15+ 类）映射到 `AgentConsoleSessionState`、sessionId 过滤 + tool_completed 后经 RPC 刷新工具列表 + 断线自动重连可取消）。两者为 Web/桌面/IDE 客户端共用的远程连接基础，`AgentConsoleSessionService` 既有 `AGENT_CONSOLE_APP_RPC` 注入面无需改动即可切换。锚点：`agent-gateway/src/api/AppRpcHandler.ts`、`agent-gateway/src/app-rpc/AppRpcServer.ts`、`agent-ui/src/HttpAgentConsoleAppRpc.ts`、`agent-ui/src/AgentConsoleRemoteEventBridge.ts`。

### Web console 宿主（G21 第二步）

- **P91 · Web console 宿主**：gateway `GatewayServer` 实现 `staticDir` 静态托管（`GET /*` 从配置目录读文件，MIME 映射、`/` 默认 `index.html`、目录回退 index、路径穿越防护、未配置时 404 直通，`GatewayConfig.staticDir` 此前已预留未实现）；agent-ui 新增浏览器入口 `web-console.ts`（`mountAgentWebConsole`：读 `window.__TSDI_AGENT_WEB__`/参数配置（baseUrl/token/sessionId/workspace），boot `AgentConsoleComponent` + `HtmlTemplateModule` + `DOCUMENT` 注入 + `AGENT_CONSOLE_APP_RPC`(HttpAgentConsoleAppRpc) + `AGENT_OPTIONS`，挂载 `AgentConsoleRemoteEventBridge` SSE 桥订阅会话事件，组件根节点 append 到容器，返回 `{ctx, state, dispose}`；`runAgentWebConsole` 便捷入口；globalThis 挂载 `TsdiAgentWeb`）与 `web/index.html` 页面骨架 + `build-web.ts` esbuild 构建管线（两阶段：tsc 编译 monorepo 源码保留 `emitDecoratorMetadata`（esbuild 不支持装饰器元数据，TypeORM 实体需 design:type）→ esbuild bundle 已编译产物，`@tsdi/*` 别名到 tsc 输出、node 内置 stub（fs/stream/path 等 web 模式不触达）、typeorm 惰性化、jsdom/express external）；`npm run build:web` 产出 `web/dist/agent-console.js`。**顺带修复两个真实浏览器阻塞缺陷**：`core/src/pipes/parses/array.ts` 删除未使用的顶层 `import e = require('express')`（core 包依赖为空、`e` 从未使用——修复了 core 包隐式 express 依赖，浏览器 bundle 顶层加载即崩）；`components/console` 的 `ConsoleTemplateParser` 顶层 `import { JSDOM } from 'jsdom'` 改为注入 `DOCUMENT`（可空）+ 惰性 require jsdom fallback，并补 `@tsdi/common` 依赖（浏览器注入真实 document 后不再拉 jsdom）。锚点：`agent-gateway/src/gateway/GatewayServer.ts`、`agent-ui/src/web-console.ts`、`agent-ui/build-web.ts`、`agent-ui/web/index.html`、`core/src/pipes/parses/array.ts`、`components/console/src/console.ts`。

### agent 浏览器安全 module 边界（P92）

- **P92 · `@tsdi/agent` 浏览器安全 module 边界**：`Default*Store`（DefaultAuditSink/DefaultCompactionHistoryStore/DefaultTurnDiagnosticsStore/DefaultSummaryQualityStore/DefaultDelegationGraphStore/DefaultMemoryStore/DefaultSessionStore/DefaultGoalStore）的 TypeOrm 实现从顶层 import 改为**惰性 require**（新增 `src/lazy-typeorm.ts`：`requireLazy` 用动态路径绕过 esbuild 静态打包、`resolveTypeormAdapter`/`getTypeOrmAdapterToken` 惰性解析 DI token 并校验实例有效性（此前 `app.get(token, null)` 无 provider 时返回哨兵布尔导致误判））；`IntervalAgentScheduler` 的 `AgentScheduledTaskEntity` 同样惰性化；`AgentModule` 移除冗余的 TypeOrm* providers 注册与顶层 import（`Default*` 已惰性覆盖，node 测试经 `AgentOrmModule` 显式注册不受影响）；`DefaultAgentRuntime`/`agent.module.ts` 从 `./goal` index 改深度导入 `./goal/GoalStore`（避免 index 的 `export * from './TypeOrmGoalStore'` 触发）；新增 `src/web-entry.ts` 浏览器安全入口——只 re-export web 需要的符号（tokens/options/AgentModule/runtime/events/tools/memory 类型等 25+），不含 TypeOrm*/orm/entities；`build-web.ts` 的 `@tsdi/agent` 别名指向 web-entry + 临时 tsconfig 单独编译 web-entry（extends 根 + types:['node'] + typeRoots）。**效果**：web bundle 从 8.8MB（含 typeorm/browser 354 输入）降至 3.25MB、typeorm 完全清除，`typeorm-stub.ts` hack 删除，浏览器 boot 验证通过。锚点：`agent/src/lazy-typeorm.ts`、`agent/src/web-entry.ts`、`agent/src/agent.module.ts`、`agent/src/harness/Default*.ts`、`agent/src/memory/Default*.ts`、`agent/src/goal/DefaultGoalStore.ts`、`agent/src/scheduler/IntervalAgentScheduler.ts`、`agent/src/runtime/DefaultAgentRuntime.ts`、`agent-ui/build-web.ts`。

### 生命周期扩展

- **P82 · pre/post-compaction hooks**：`AgentLifecycleHookStage`、shell hooks 与 function hooks 新增 `beforeCompaction` / `afterCompaction`；`AgentContextManager` 仅在真实触发压缩时按序调用，after 载荷包含 summary、质量分、压缩报告与丢弃消息统计；runtime 桥接复用既有 hook 审计/转录管线，无 hook 时零额外执行。锚点：`agent/src/hooks/AgentHooks.ts`、`agent/src/context/AgentContextManager.ts`、`agent/src/runtime/DefaultAgentRuntime.ts`。

### 跨会话目标

- **P83 · Goal 系统**：新增 InMemory/TypeORM/Default GoalStore，Goal 含 objective、successCriteria、status 与时间戳；多个 session 可关联同一 goal，active goal 自动注入模型上下文，assistant 输出明确覆盖全部 criteria 时确定性完成，无 criteria 时只允许人工完成；gateway `goal.*` RPC 与 agent-ui `/goal` 命令支持创建、查看、列举、关联、完成和重开。锚点：`agent/src/goal/`、`agent/src/runtime/DefaultAgentRuntime.ts`、`agent-gateway/src/app-rpc/AppRpcServer.ts`、`agent-ui/src/AgentConsoleComponent.ts`。

### Provider 目录

- **P84 · Provider 注册表**：新增内置 provider/model 目录与可解析的 `provider.json` 自定义目录，统一提供 baseUrl、apiKeyEnv、模型清单及 chat/vision/tool-calling/prompt-cache/reasoning 能力位；CLI 配置与 gateway `/model` 消费目录，显式配置优先，未知 provider 保持降级。

### 评估与分享

- **P85 · Eval 基准 runner**：新增 `EvalTask` / `EvalRun` 契约与注入式 `EvalRunner`，支持单任务、批量、profile 选择、验证命令评分、异常降级与报告存储；gateway 暴露 `POST /api/eval/run` 和 `GET /api/eval`。锚点：`agent/src/eval/`、`agent-gateway/src/api/EvalHandler.ts`。
- **P86 · 会话分享**：owner 创建不可变脱敏快照，以 192-bit 高熵 token 提供公开只读访问并支持撤销；递归裁剪 workspace 绝对路径、密钥字段、Bearer / `sk-*` 值与媒体 URL。锚点：`agent-gateway/src/api/SessionShareHandler.ts`。

### 会话与工作树

- **P77 · 会话 fork**：`SessionStore.fork(sessionId, messageId?)` 完整或截断 transcript 生成 branch session，继承项目/workspace/thread 血缘并写入 `sessionRole: branch`；gateway `session.fork` RPC（owner 校验 + 显式/自动 id）。

### 声明式 agent 与交付面

- **P70 · 声明式 agent 原型**：`AgentArchetype`（name/description/mode/permissions 规则集/prompt/model/steps）对齐 opencode `Agent.Info`；内置 `plan`（只读 + 写 plans 目录）、`build`（全量）、`review`（只读 + 验证）三原型；`setPlanMode` 收敛为 plan 原型；工具门控优先级 deny > allow > readOnly（writePaths 命中放行，`prefix*` 通配）；agent-tools `ARCHETYPE_TOOL_GROUPS` + `resolveArchetypeToolGroups`；agent-ui `/archetype` + `/status`；gateway `session.archetype.set/get` RPC。锚点：`agent/src/archetype/AgentArchetype.ts`、`agent-tools/src/options.ts`。
- **P80 · /review 内联评审命令**：`review` 工具组（`agent-tools/review/review-diff.tool.ts`）对当前 git diff（`git diff HEAD` 或指定 range/文件集）发起只读评审——不改工作树，输出结构化 findings（correctness / risks / suggested-fixes，含文件 + 行锚点）；`review_diff` 只读约束 + sandbox 策略 + workspace 守卫 + `AgentToolMode.review` 门控；findings 经 `ReviewFindingsStore` 落审计（toolName `review_diff`、`inputSummary='review <base>: <n> files, <m> findings'`、run 存 `metadata.reviewRun`，无 AuditSink 时抛错）供 review 面板展示，可与 commit 绑定审计。agent-gateway：`review.diff/list/get/save` RPC + `GET /api/reviews` REST（sessionId 必填、owner 403、commit 过滤、`/api/reviews/:id`）；agent-ui `/review` 子命令（run/diff/findings/show/approve/reject/approve-all/clear/clear-all/export/risk/summary）→ git diff 评审流 + findings 面板 + review.save 落库。锚点：`agent-tools/review/`、`agent/src/harness/ReviewFindingsStore.ts`、`agent-gateway/src/api/ReviewHandler.ts`、`agent-gateway/src/app-rpc/AppRpcServer.ts`、`agent-gateway/src/gateway/GatewayBootstrap.ts`、`agent-ui/src/AgentConsoleComponent.ts`。
- **P75 · Gateway OpenAPI 规范**：从已注册 `GatewayRoute[]` 生成 OpenAPI 3.1 文档（路径参数、认证 scheme、`/rpc` 入口），`GET /openapi.json` 免认证暴露。锚点：`agent-gateway/src/gateway/OpenApiDocument.ts`。

## 差距分析 v2（vs Codex / opencode，2026-08）

### 结论

第一轮差距 G1–G10 已全部闭环（P67–P78，见上）；第二轮 G11/G12（验证闭环最后一公里 + 独立评审流）已随 P79/P80 闭环；第三轮 G13–G22 已全部闭环（P81–P89，见上）。继续对照 2026-08 的 codex（openai/codex，Rust app-server，v0.144–0.146：hooks GA 含 pre/post-compaction、`/review` 内联评审、`/import` 配置迁移、`/goal` 持久化多日工作流、permission profiles、plugin marketplace、Chrome 扩展 + 移动 remote）与 opencode（anomalyco/opencode，TypeScript + Effect，v1.14–1.18：Scout agent、background subagents、pinned sessions、Tauri desktop + IDE 扩展、models.dev provider 目录、30+ auto-install LSP、`/share` 会话分享、snapshot warp）源码/文档逐项比对后，剩余差距收窄到多端交付面：

1. **跨会话工作流**：fork/thread/scheduler/goal 已齐，后续重点是更强的无人值守推进策略与完成证据。
2. **配置与生态扩展**：CLAUDE.md / Cursor 导入（P81）、provider 目录（P84）、skills 远程市场（P87）、LSP 自动安装（P89）均已闭环。
3. **多端交付面**：TUI/CLI/gateway 已齐，远程传输层已落地（P90：`POST /rpc/stream` NDJSON 流式 RPC + `HttpAgentConsoleAppRpc` + `AgentConsoleRemoteEventBridge`）；桌面/IDE/Web/移动的具体宿主界面未落地（G21 其余部分，远期）。

全部为增量可做、无需推翻现有架构；功能差距已清零。

### 本项目优势（相对 codex/opencode，保持并强化）

1. **循证验证螺旋**（evidence-ledger / verification-gate / weakness-miner / harness-profile + falsify-rate 路由）：codex/opencode 均无系统化的「工具证据 → 声明 vs 实际 → 伪造率 → 修复提示」闭环，这是本项目最独到的差异化主线；LSP 诊断证据（P67）与 AGENTS 规则草案（P78）进一步加固。
2. **多代理编排深度**：delegation graph tree/lineage 持久化、worker 自动分类（sessionRole/originThreadId）、thread 终态回写、thread 级 todo/review 聚合、coding_task 结构化任务编排、worker-class 模型路由 —— 比 opencode 的 task tool 与 codex 的 subagent 更结构化、可审计。
3. **上下文压缩的严谨性**：anchor 保留 + 五字段 summary schema + 质量评分 + 压缩历史观测 + overflow replay/媒体占位（P68）—— 比 opencode 的摘要压缩更可度量、可回归。
4. **审批流 + 补偿/回滚完备性**：granular 类别 + expiry/FIFO/防御清扫 + 审计落库 + LIFO 补偿 + 文件快照 undo/redo + Git step 快照 revert/unrevert（P71）。
5. **可观测性覆盖**：turn diagnostics / summary quality / compaction history / delegation / audit 全部持久化并暴露 HTTP + RPC + UI 三层，opencode/codex 均无此厚度。
6. **覆盖面**：40+ 工具组、11 个 IM 渠道、MCP stdio + Streamable HTTP + OAuth + server、skills 本地注册表、hooks 双形态（命令 + 进程内函数）、gateway 多协议 + OpenAPI —— 工具广度超过 opencode 内置集。
7. **跨平台响应式 UI 架构**：TUI/浏览器共用响应式渲染层（数据变化驱动、无定时器刷新、时间派生动画），跨平台约束已沉淀至根 AGENTS.md。

### 新差距（按优先级排序，P82 起逐项消化）

| # | 差距 | 对照对象 | 现状证据 | 影响 |
|---|---|---|---|---|
| G11 | ~~build/test 结果未接入验证闭环~~（✅ 2026-08 P79） | opencode 编辑后 LSP+测试结果喂回；codex 内置验证习惯 | `VerifyCommandRunner` 编辑后运行受影响包 typecheck/lint 等脚本 → `verify-command` 证据 → gate 检查 (d) 伪造 | 高：编码反馈闭环的最后一块，模型改错后无「跑测试/编译」自感知 |
| G12 | ~~无 /review 内联评审命令~~（✅ 2026-08 P80） | codex `/review`（0.144+）：不改工作树评审当前 diff，结构化 findings | review archetype 为手动只读会话；agent-ui review 面板（`reviewTaskChoices`）评审的是子代理任务产物，非 git diff inline 评审；无 findings 落库与 commit 绑定 | 高：独立评审流缺失，交付前自查能力弱 |
| G13 | ~~无 pre/post-compaction hooks~~（✅ 2026-08 P82） | codex hooks GA（0.130+）pre/post-compaction | lifecycle hooks 已扩展 before/afterCompaction，after 透出 summary、质量分、report 与 drop 统计 | 中：压缩时可观测/定制不足（审计、外部同步、通知） |
| G14 | ~~无配置迁移（/import）~~（✅ 2026-08 P81） | codex `/import` 导入 Cursor/Claude Code settings、MCP、plugins、commands | `tsdi-agent import` + `import_config` 支持 CLAUDE.md、Cursor rules/MCP 的 preview/apply 幂等迁移 | 中：从 Claude Code/Cursor 迁移门槛高 |
| G15 | ~~无 Goal 系统（跨会话持久目标）~~（✅ 2026-08 P83） | codex `/goal`（0.128+）持久化多日工作流 | GoalStore 持久化目标与 session 关联，runtime 注入 active goal 并按明确 criteria 完成判定 | 中：长期任务无法无人值守持续推进 |
| G16 | ~~无 provider 注册表~~（✅ 2026-08 P84） | opencode models.dev（75+ providers / 1000+ 模型）目录 | 内置/自定义 provider registry 提供 baseUrl、key env、model catalog 与 capabilities，CLI/gateway 共用 | 中：接入新模型/网关成本高 |
| G17 | ~~无 eval 基准 runner~~（✅ 2026-08 P85） | 生态 SWE-bench 式任务级评估 | `EvalRunner` 单/批量任务 + profile 选择 + 验证命令评分 + 报告存储，gateway `POST /api/eval/run` / `GET /api/eval` | 中：模型/提示改动无量化回归手段 |
| G18 | ~~无会话分享~~（✅ 2026-08 P86） | opencode `/share` 只读分享会话 | owner 创建不可变脱敏快照，高熵 token 只读访问并支持撤销 | 低中：协作/交付场景缺失 |
| G19 | ~~skills 无远程分发~~（✅ 2026-08 P87） | codex plugin marketplace；opencode skills 目录共享 | `RemoteSkillManager` 安装 git/registry 源（版本追踪 + 冲突检测 + 更新/移除），`skills_remote` 工具 + provider 缓存目录加载 | 低中：生态扩展受限 |
| G20 | ~~后台子代理 UX~~（✅ 2026-08 P88） | opencode background subagents（v1.14.51+）用户继续打字时子代理持续工作 | `spawn_agent background: true` fire-and-collect（不阻塞 turn），`BackgroundTaskManager` 追踪状态/结果，`AgentBackgroundTask*Event` 经 gateway SSE + agent-ui 通知回传 | 低中：并行体验差距 |
| G21 | **多端交付面未闭环** | opencode Tauri desktop + IDE 扩展 + web console；codex macOS app + Chrome 扩展 + 移动 remote | TUI/CLI/gateway 已齐；远程传输层（P90）、Web console 宿主（P91）、agent 浏览器安全 module 边界（P92）已落地；桌面壳/IDE 扩展/移动 remote 宿主界面未落地 | 中：远期工程 |
| G22 | ~~LSP 无自动安装/版本管理~~（✅ 2026-08 P89） | opencode 30+ auto-install LSP configs | `LspInstallManager` 语言→安装命令映射（npm/brew/go/rustup），`autoInstall` 开启时自动安装、否则返回安装提示；工具结果带 hint | 低：新环境上手成本 |

## 打磨计划（P87+）

> 约定：`Pnn-前缀` 对应上表差距编号（G11–G22）。每项完成后把内容移到「已实现功能」并更新「已完成（历史）」。
>
> P87–P89（G19/G20/G22）已全部落地；P90（G21 远程传输层）、P91（G21 Web console 宿主）、P92（agent 浏览器安全 module 边界）已落地，见「已实现功能」；打磨计划已清空。

## 剩余（远期，未排期）

- **桌面/IDE/移动多面宿主（G21 余量）**：opencode Tauri desktop + IDE 扩展；codex macOS app + Chrome 扩展 + 移动 remote —— 远程传输层（P90）、Web console 宿主（P91）与 agent 浏览器安全 module 边界（P92，`web-entry.ts` + `lazy-typeorm` 惰性化 + bundle 3.25MB）已就绪，剩余为桌面壳、IDE 扩展与移动端宿主工程，暂不排期。
- **GitHub/GitLab 应用集成**（Codex GitHub Action、GitHub 集成、隐藏自动化 agent）—— 依赖平台 OAuth。

## 已完成（历史）

P0–P61 全部打磨条目（含 P34/P35 Tier1/Tier2 与 A/B 面、P42–P45 规划项）均已落地并有测试覆盖；截至 P61 全量回归：agent 554 / agent-cli 52 passing，各子包 `tsc --noEmit` clean。逐条打磨记录见 git history 中各 P 段。

P62–P66（agent-ui 渲染性能优化）已收口：P62 点动画改时间派生（移除 setInterval）、P64 `elapsedLabel` 秒级稳定化、P65 SessionState Proxy 驱动（去 ~130 处 notify/batch）已随 f6339d205 落地；P63 布局层缓存验证失败已回退（教训见根 AGENT.md）；P66 动画帧基准随后续"`• Working` 静态标签 + dashboard 并入工作行"的新设计取消（无动画即无需动画帧基准）。架构约束（响应式驱动、禁定时器、时间派生、跨平台无 node API、响应式代理机制）已沉淀至根 AGENT.md。

P67（编辑 → LSP 诊断反馈闭环，G1）已随 b217b080c 落地：编辑工具（write/edit/apply_patch）执行后触发 `textDocument/didChange` → 拉取缓存 diagnostics → 追加为工具结果 `lspDiagnostics`（有界截断、不阻塞写入）；注入 `VerificationGate` 为 `evidence.verification == 'lsp'` 新证据源；支持 `lsp.diagnosticsOnEdit: boolean | 'auto'` 开关、无 LSP 配置静默降级。

P68（Compaction replay + 媒体占位符，G3）已落地：`AgentContextManager` preparation 流水线在压缩后重放——硬性 overflow 克隆最后用户消息（媒体附件 → `[Attached <type>: <name>]` 文本占位符）`replayKind: 'last-user-message'`；主动压缩注入「Continue if you have next steps」`replayKind: 'continue-prompt'`，并防重复注入；`CompactionHistoryRecord`（必填 `replayed` + `replayKind`）/ `AgentTurnDiagnostics`（`replayCount`/`replayKind`）/ `ContextPreparationReport` 全链路传播，TypeOrm 实体加列、gateway DTO 透出。回归：agent 572 / agent-gateway 187 / agent-ui 334 passing，三包构建 clean，测试覆盖 overflow 重放、媒体占位、主动继续、防重复四场景。

P69（Prompt cache 请求侧落地 + 系统提示分段，G4）已落地：`PromptSection` 新增 `cacheable` 标记（DateTime/Memory 段置 false），`SystemPromptBuilder` 静态段（identity/project/tools）前置、动态段（date-time/memory）后置，保证 prompt 前缀稳定；`OpenAICompatibleModelAdapter` 从 observe-only 升级为请求侧控制——openai provider 对 system 消息标注 `cache_control: {type: 'ephemeral'|'persistent'}`（supported 'full'），deepseek 依赖自动 context caching（supported 'partial'、不注解），其余 openai-compatible 保持 observe_only；修复前缀破坏 bug（动态 summary/memory 从 system prompt 之前移到之后）；新增静态前缀 hash 跨请求比较，tools/system 变更时 `PromptCacheRuntimeMetadata.prefixBroken` 置 true。回归：agent 579 / agent-gateway 187 / agent-ui 334 passing，三包构建 clean；新增测试覆盖 cache_control 注解、summary/memory 后置、deepseek partial、前缀破坏检测、分段渲染顺序。

P70（声明式 agent 原型，G6）已落地：`AgentArchetype` 配置（name/description/mode/permissions 规则集/prompt/model/steps）对齐 opencode `Agent.Info`；内置 `plan`（只读 + 允许写 plans 目录）、`build`（默认全量）、`review`（只读 + git/lsp 验证）三原型；`setPlanMode` 收敛为 plan 原型会话实例，`isPlanMode` 由 `resolveArchetypeConfig().readOnly` 派生；`buildArchetypeModeHint` 对纯 build 原型返回空串保证默认系统提示逐字节不变；原型切换向非空会话注入 build-switch 风格系统消息；工具门控优先级 deny > allow > readOnly（writePaths 命中放行，`prefix*` 通配）；agent-tools 新增 `ARCHETYPE_TOOL_GROUPS` + `resolveArchetypeToolGroups`（build 全量 / plan 只读查询 / review 查询+验证）；agent-ui 新增 `/archetype [name]` 命令 + `/status` 展示 archetype；gateway 新增 `session.archetype.set/get` RPC。回归：agent 587 / agent-gateway 187 / agent-ui 334 / agent-tools 193 passing，四包构建 clean；新增测试覆盖默认解析、plan/review/build 门控、writePaths 放行、deny 规则、切换消息注入、模式提示、工具组映射。

P71（Git step 快照 + 消息级 revert/unrevert + 会话 diff，G2）已落地：`GitStepSnapshotStore`（`git stash create` + pinned refs 捕获整树，不污染历史；`capture/diff/revert/unrevert/list/clear` + `listReverts` 审计）注册为 DI 工厂；运行时、gateway REST/RPC 及 agent-ui review 面板均已接入。回归：agent-ui 覆盖 list/diff/revert/unrevert 与 review 面板消费。

P72（AGENTS.md 指令链升级，G5）已落地：`findAgentsDoc` 返回 root→cwd 有序指令链（每目录候选按 override → 主文件名 → fallback 去重、先存在者胜，`AGENTS.override.md` 优先于 `AGENTS.md`）；`projectDocFallbackFilenames`/`projectDocMaxBytes`（默认 32KiB，Buffer 按字节截断且不劈开多字节字符）接入 `ProjectContextSection`（带 mtime 缓存失效）；walk 起点改为工作目录——cwd 在 pinned root 内时从 cwd 起、root 处 `stopAt` 收束，否则回退 pinned root；`initAgentsDoc`/`analyzeProjectStructure`/`collectExtensions` 重构为注入式 `FileAdapter` 驱动（`list/readTextSync/join/extname`），彻底移除 agent 源码对 node `fs/os/path` 的直接依赖（`Buffer` 改自 `buffer` 包，兼容浏览器/Node），`initAgentsDoc` 要求显式 `fileAdapter`、缺失时优雅失败；agent-ui `/init` 将 ApplicationContext 解析的 `FileAdapter` 传入。回归：agent 603 / agent-ui 353 passing，两包 `tsc --noEmit` clean；新增测试覆盖链式发现、override 优先、fallback、字节截断、链式 section 渲染、结构分析语言检测。

P73（语义记忆检索，G7）已落地：新增 `MemoryEmbedder`（abstract + `MEMORY_EMBEDDER` DI token）与 `cosineSimilarity`、`SemanticMemoryRanker`（embed key+value → cosine 排序，`topK`/`minScore` 过滤）；`MemorySearchService` 编排 `keyword`（store 子串匹配）/`semantic`（embed query → 全量可见记录排序）/`hybrid`（semantic 排序在前 + keyword 独有记录按 id 去重附加）三模式，无 embedder 时 semantic/hybrid 静默降级 keyword；`AgentMemoryRetriever` 输入扩展 `mode`/`limit`/`minScore`，直接构造时以 ad-hoc service 保持语义路径可用；agent 内置与 agent-tools 的 `memory.search` 工具均支持 `mode`/`minScore`，注入可选 `AgentMemoryRetriever`（无注入回退 `context.memory`）；新 API 从 agent index 导出。回归：agent 617 / agent-tools 270 passing（agent-tools 另有 1 个既有 apply-patch 临时目录失败，基线即存在），两包 `tsc --noEmit` clean；新增测试覆盖 cosine 纯函数、ranker 排序/过滤/cap、service 三模式 + 降级 + limit、retriever 语义/降级/参数透传、tools mode 校验与回退。

P74（自动标题/摘要 agent，G8）已落地：首条用户消息异步生成 title/focusSummary，支持 LLM 与 deterministic fallback，并接入 session/project 展示；agent 回归包含 summary agent 与 runtime 链路测试。

P75（Gateway OpenAPI 规范，G9）已落地：gateway 从已注册 `GatewayRoute[]` 生成 OpenAPI 3.1 文档，支持路径参数、认证 scheme 与 `/rpc` 入口，并通过无需认证的 `GET /openapi.json` 暴露；新增生成器测试。回归：agent-gateway 192 passing，构建 clean。

P76（模型请求重试/退避分类，G10）已落地：OpenAI-compatible 与 Anthropic 共享错误分类和退避策略，支持 rate-limit/server/network/timeout 分类、指数退避+jitter，以及秒数/HTTP-date `Retry-After`（带 15 秒上限）；保留现有最多 3 次重试行为。新增策略单测，agent 回归 638 passing，类型检查 clean。

P77（会话 fork，G2 延伸）已落地：`SessionStore.fork` 支持完整或按 `messageId` 截断 transcript，生成 branch session，继承项目/workspace/thread 血缘并写入 `sessionRole: branch`；gateway 暴露 `session.fork` RPC，带 owner 校验和显式/自动 session id。新增存储层测试。

P78（项目记忆闭环，验证失败回写 AGENTS.md）已落地：新增 `buildAgentsRuleDraft(report)`，将 WeaknessMiner 的高频失败建议渲染为带人工审核标记的 AGENTS.md 规则片段；`harness.audit` 通过 `includeDraft: true` 返回草案，默认不写入或覆盖项目文件。新增草案生成测试。

P79（build/test 验证反馈闭环，G11）已随 d1a5bec5a 落地：新增 `VerifyCommandRunner`（包内 package.json 脚本探测 + 命令运行 + 有界超时/输出截断 + exit code 捕获）；运行时 `runVerificationCommands` 在工具轮编辑后对受影响包执行验证（`verificationWriteTools` 判定写入工具，`trackEditedFile` 收集文件路径）；`EvidenceLedger` 新增 `verification` 标记字段，`VerificationGate` 新增检查 (d) 消费 `verify-command` 证据（非零退出/超时/spawn 错误 → falsified + 修复提示）；`AgentOptions.verification`（enabled/verifyCommands/autoScripts/timeoutMs/maxOutputChars，默认 autoScripts `['typecheck','lint']`、长耗时 test/build 需显式配置）。回归：agent 660 passing，`tsc --noEmit` clean；新增测试覆盖 verify-command 证据合并、失败伪造、成功通过、无脚本降级。

P80（/review 内联评审命令，G12）已落地：`review` 工具组新增 `review_diff`（`git diff HEAD` 或指定 base/range/paths，只读约束 + sandbox 策略 + workspace 守卫 + `AgentToolMode.review` 门控，输出结构化 findings + diff + stats，read-only 工具不注册写方法）；`ReviewFindingsStore` 将 findings 落审计（`toolName 'review_diff'`、`id=run.id`、`toolCallId 'review:<id>'`、`inputSummary 'review <base>: <n> files, <m> findings'`、run 存 `metadata.reviewRun`、深拷贝、无 AuditSink 抛错）；agent-gateway 新增 `review.diff/list/get/save` RPC + `ReviewHandler` REST（`GET /api/reviews` 带 sessionId 必填/owner 403/commit 过滤 + `GET /api/reviews/:id`）并接入 `GatewayBootstrap` 路由；agent-ui `/review` 子命令（run/diff/findings/show/approve/reject/approve-all/clear/clear-all/export/risk/summary）走 git-diff 评审流并 `review.save` 落库。回归：agent 660 / agent-gateway 197 / agent-ui 358 / agent-tools 275 passing，四包 `tsc --noEmit` clean；新增测试：agent-tools review diff 只读/路径/base/沙箱 4 例、agent ReviewFindingsStore 5 例、gateway review RPC 2 例 + REST 3 例、agent-ui 5 例。注：同期修复 agent-tools apply-patch 多文件快照回归（`b9697ea45` 在 `fileSnapshotStore` 与 `appArgs` 间插入 `gitStepSnapshotStore` 导致 `fileAdapter` 参数位移、测试未同步 → ENOENT，非 flake；e462ddfa5 补齐 `undefined` 槽位后 275 passing）。

P81（配置迁移 `/import`，G14）已落地：新增 `import_config` 工具与 `tsdi-agent import` CLI，支持 CLAUDE.md、Cursor rules、Cursor/Claude MCP JSON 的 preview/apply 两阶段迁移；marker 分区确保 AGENTS.md 幂等更新，同次多来源应用基于最新目标内容合并避免覆盖；MCP server 按 id 合并并保留 settings 无关字段；无效 source 明确报错，workspace 与 symlink 受统一文件策略保护。全量回归：agent 660 / agent-channels 59 / agent-gateway 197 / agent-ui 358 / agent-providers 13 / agent-tools 282 / agent-cli 57 / agent-ssh 8，共 1634 passing；八包 build clean。同期收紧 `VerifyCommandRunner` 真实进程测试，仅断言跨 npm 版本稳定的 exit code / failure contract，输出截断由独立单测覆盖。

P82（pre/post-compaction hooks，G13）已落地：生命周期阶段扩展 `beforeCompaction` / `afterCompaction`，shell/function 双形态均可配置；context manager 在真实压缩前后按序触发，after 载荷包含 summary、`scoreSummaryQuality` 总分、完整 report 与 dropped message count；runtime 复用现有 hook manager 和 transcript 持久化，未触发压缩或未配置 hook 时静默跳过。新增 context compaction 测试覆盖顺序、载荷与未触发降级。全量回归：agent 662 / agent-channels 59 / agent-gateway 197 / agent-ui 358 / agent-providers 13 / agent-tools 282 / agent-cli 57 / agent-ssh 8，共 1636 passing；八包 build clean。

P83（Goal 系统，G15）已落地：GoalStore 提供内存与 TypeORM 持久化及自动后端选择，支持跨 session 关联、状态转换和 completedAt；runtime 在每次模型请求中注入 active goal 上下文，turn 完成后仅当 assistant 文本覆盖全部显式 successCriteria 时自动完成，无 criteria 目标保留人工判定；gateway 增加 `goal.create/get/list/link/complete/reopen` RPC，agent-ui 增加 `/goal` 全命令面。测试覆盖 create/link、跨会话恢复、complete/reopen、全部 criteria 判定、上下文渲染、TypeORM round-trip 与本地/RPC UI 路径。全量回归：agent 667 / agent-channels 59 / agent-gateway 197 / agent-ui 360 / agent-providers 13 / agent-tools 282 / agent-cli 57 / agent-ssh 8，共 1643 passing；八包 build clean。

P84（Provider 注册表，G16）已落地：`AgentProviderRegistry` 提供内置 DeepSeek/OpenAI/Anthropic/Gemini/OpenAI-compatible 目录、自定义 `provider.json`（array/map）解析、模型能力合并与 config 补全；CLI provider URL/key-env 解析统一委托 registry，gateway `model.list/activate` 在无显式 profiles 时提供并激活 catalog 模型，UI 展示能力位。新增 registry、CLI 自定义目录测试。回归：agent 667 / agent-cli 58 / agent-gateway 197 / agent-ui 360 / agent-channels 59 / agent-providers 13 / agent-tools 282 / agent-ssh 8，共 1644 passing；八包 build clean。

P85（Eval 基准 runner，G17）已落地：新增 `EvalTask` / `EvalRun` 契约与注入式 `EvalRunner`，支持单任务、批量运行、profile 选择、验证命令结果评分、运行异常降级和报告存储；`InMemoryEvalReportStore` 提供默认落库 seam，gateway 新增 `POST /api/eval/run` 与 `GET /api/eval` 暴露运行及报告列表。测试覆盖成功/失败批量、验证失败评分、异常记录与持久化。

P86（会话分享，G18）已落地：gateway 新增 owner-only `POST /api/sessions/:id/share` 创建不可变分享快照、无需主鉴权的 `GET /api/share/:token` 只读访问及 owner-only `DELETE` 撤销；快照递归裁剪 workspace 绝对路径、密钥字段/Bearer/sk-* 值与媒体 URL，访问 token 使用 192-bit 随机值且不进入公开响应。新增测试覆盖脱敏、owner 边界、公开读取、token 唯一性与撤销。最终全量回归：agent 672 / agent-channels 59 / agent-cli 58 / agent-gateway 201 / agent-providers 13 / agent-ssh 8 / agent-tools 282 / agent-ui 360，共 1653 passing；八包 build clean。

P87（skills 远程市场，G19）已落地：新增 `RemoteSkillManager`（`agent-tools/skills/remote-skill-manager.ts`）支持 git 源（shallow clone、ref 固定、`pull --ff-only`/fetch+reset 更新、tag 或 short-hash 版本解析）与 registry 源（JSON manifest 拉取 → SKILL.md 物化、manifest.version 追踪），安装/更新/列出/移除 + 与已注册技能的 id 冲突检测（可 `force` 覆盖，冲突或失败自动回滚）；`provideSkills` 新增 `remoteCacheDir`（默认 `~/.tsdi-agent/skills`），provide 时将缓存目录同步加载为 `source: 'remote'` 技能并注册 manager；新增 `skills_remote` 工具（install/update/list/remove/status，`AgentToolsOptions.skillsRemoteCacheDir` 覆盖默认缓存目录）；新增 `agent-tools/test/skills.spec.ts`（git 源拉取 + 版本解析 + 冲突检测 + registry 物化 + 移除）。回归：agent-tools 299 passing，八包 build clean。

P88（后台子代理 UX，G20）已落地：`agent` 新增 `AgentBackgroundTaskStartedEvent` / `AgentBackgroundTaskCompletedEvent` / `AgentBackgroundTaskFailedEvent`；`agent-tools` 新增 `BackgroundTaskManager`（`src/background-task-manager.ts`，fire-and-collect：`start()` 立即返回 running 记录、异步 runner 完成/失败回写状态并 publish 生命周期事件、`get/list/cancel/wait` 收集结果；经 `BACKGROUND_TASK_RUNNER` DI token 注入 runner 避免与 `nested-agent-runner.ts` 的加载顺序环）；`spawn_agent` 新增 `background: true`（`SpawnAgentInput`/schema/结果带 `taskId/background/status`，`DelegatingSpawnAgentAdapter` 分支到后台执行）；gateway `EventHandler` 将三事件转 `background_task_started/completed/failed` SSE；agent-ui `AgentConsoleEventBridge` 绑定三事件推送活动通知（goal/summary 截断）；新增 `agent-tools/test/background-task.spec.ts`（fire-and-collect、失败传播、按 session 列表、取消、wait 超时）。回归：agent 672 / agent-gateway 201 / agent-ui 360 / agent-tools 299 passing，四包 tsc clean。

P89（LSP server 自动安装，G22）已落地：`agent-tools/lsp` 新增 `lsp-install.ts`（`LspInstallManager`：扩展→server 命令→安装命令内置映射 typescript-language-server/pyright-langserver/gopls/rust-analyzer/vscode-langservers-extracted/markdown/bash-language-server，`command -v`/`where` 可用性探测、安装命令有界超时运行；`LspServerOptions.install` 显式覆盖内置映射）；`LspServerManager.clientFor` 在 spawn 前探测 server 二进制，缺失时按 `autoInstall`（true 自动安装 / 其余记录安装提示）处理，`installHintFor()` 暴露缺失原因；`AgentToolsLspOptions.autoInstall`（默认 `'prompt'`）；LSP 工具结果在 server 缺失时返回带安装命令的 hint 而非仅「未配置」；新增 8 例测试（映射解析、可用直通、缺失 hint、autoInstall 执行 + 复检、显式 install 覆盖、安装失败报错、manager 集成）。回归：agent-tools 299 passing，八包 build clean；最终全量回归：agent 672 / agent-channels 59 / agent-cli 58 / agent-gateway 201 / agent-providers 13 / agent-ssh 8 / agent-tools 299 / agent-ui 360，共 1670 passing；八包 `tsc --noEmit` clean。

P90（Gateway 远程传输层，G21 第一步）已落地：agent-gateway `AppRpcHandler` 新增 `POST /rpc/stream` 路由——NDJSON 逐条 yield `AppRpcServer.streamPayload`（`run.turn_stream` chunk 通知 + 最终 result 流式消费，普通方法退化为单条 result，错误回传 NDJSON error 行），`GatewayBootstrap` 自动聚合注册；顺带修复 `describeStreamEvent` 缺 `turn_completed` / `background_task_started/completed/failed` 映射（此前流式 RPC 静默丢弃这些事件）。agent-ui 新增 `HttpAgentConsoleAppRpc`（实现 `AgentConsoleAppRpc`：fetch POST `/rpc` JSON-RPC 2.0 + Bearer token + AbortController 超时 + RPC/HTTP 错误映射；`stream` 经 fetch+ReadableStream 解析 `/rpc/stream` NDJSON，输出形状与本地桥一致，无 node API、`globalThis.fetch` 守卫跨环境可用）与 `AgentConsoleRemoteEventBridge`（增量 SSE 解析纯函数 `parseSseFrames`/`decodeSseFrame` + `applyRemoteEvent` 把 15+ 类 `GatewayEventRecord` 映射到 `AgentConsoleSessionState`，sessionId 过滤、tool_completed 后经 RPC 刷新工具、断线自动重连可取消）。`AgentConsoleSessionService` 既有 `AGENT_CONSOLE_APP_RPC` 注入面零改动切换远程。回归：agent-gateway 206 / agent-ui 387 passing，两包 `tsc --noEmit` clean；新增测试：gateway rpc-stream 5 例（路由注册、普通方法 NDJSON、turn_stream chunk+result、未知方法 error 行、流式 tool 事件冲刷）、agent-ui http-rpc-client 8 例（result/鉴权头/RPC 错误/HTTP 错误/超时/stream 映射/stream error 行/工厂）、agent-ui remote-event-bridge 19 例（SSE 解析、分帧、15 类事件映射、连接、session 过滤、dispose）。

P91（Web console 宿主，G21 第二步）已落地：gateway `GatewayServer` 实现 `staticDir` 静态托管（`GET /*` MIME 映射、`/`→`index.html`、目录回退 index、路径穿越 403/404、未配置直通 404）；agent-ui 新增浏览器入口 `web-console.ts`（`mountAgentWebConsole`：读 `window.__TSDI_AGENT_WEB__`/参数（baseUrl/token/sessionId/workspace）→ boot `AgentConsoleComponent` + `HtmlTemplateModule` + `DOCUMENT` + `AGENT_CONSOLE_APP_RPC`(HttpAgentConsoleAppRpc) + `AGENT_OPTIONS` → 挂 `AgentConsoleRemoteEventBridge` SSE 桥 → 组件根节点 append 容器 → 返回 `{ctx, state, dispose}`；`runAgentWebConsole` 便捷入口；`globalThis.TsdiAgentWeb` 挂载）与 `web/index.html` + `build-web.ts` 构建管线（两阶段：tsc 编译保留 `emitDecoratorMetadata` → esbuild bundle，`@tsdi/*` 别名 tsc 输出、node 内置 stub、jsdom/express external；`npm run build:web` → `web/dist/agent-console.js`）。顺带修复两个真实浏览器阻塞缺陷：`core/src/pipes/parses/array.ts` 删除未使用顶层 `import e = require('express')`（core 依赖为空、浏览器 bundle 顶层即崩）；`components/console` `ConsoleTemplateParser` 顶层 `import { JSDOM }` 改注入 `DOCUMENT`（可空）+ 惰性 require jsdom，补 `@tsdi/common` 依赖。回归：agent-gateway 212 / agent-ui 391 / core 130 / components 126 / components/console 72 passing，各包 tsc clean；新增测试：gateway static-serving 6 例、agent-ui web-console 5 例 + jsdom 完整 boot 验证 + gateway 端到端。

P92（`@tsdi/agent` 浏览器安全 module 边界）已落地：8 个 `Default*Store` 的 TypeOrm 实现顶层 import 改惰性 require（新增 `src/lazy-typeorm.ts`：`requireLazy` 动态路径绕过 esbuild 静态打包、`resolveTypeormAdapter` 惰性解析 TypeormAdapter token 并校验实例有效性——`app.get(token, null)` 无 provider 返回哨兵布尔导致误判已修）；`IntervalAgentScheduler` 的 `AgentScheduledTaskEntity` 惰性化；`AgentModule` 移除冗余 TypeOrm* providers/import（`Default*` 惰性覆盖，node 测试经 `AgentOrmModule` 显式注册不受影响）；`DefaultAgentRuntime`/`agent.module.ts` 深度导入 `./goal/GoalStore`（避开 index 的 TypeOrmGoalStore re-export）；新增 `src/web-entry.ts` 浏览器安全入口（只 re-export web 需要的 tokens/runtime/events/tools 等，不含 TypeOrm*/orm/entities）；`build-web.ts` `@tsdi/agent` 别名指向 web-entry + 临时 tsconfig 单独编译 web-entry。效果：web bundle 8.8MB→3.25MB（typeorm/browser 354 输入清零），`typeorm-stub.ts` hack 删除，浏览器 boot 验证通过。回归：agent 672 / agent-ui 391 / agent-gateway 212 / agent-cli passing，各包 tsc clean。
