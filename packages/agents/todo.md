# Agents 后续打磨清单

## 功能总纲

主干能力已齐（2026-08 对比 Codex / opencode 口径）：turn 循环（run/streaming）、多模型适配（Echo/Anthropic/OpenAI/Routed + profiles + complexity 路由 + worker-class 路由 + 命令级 profile + retry-after 分类退避）、prompt cache 支持（请求侧 cache_control + 系统提示静态段前置）、上下文压缩 + 重放（overflow 克隆最后用户消息 / 主动 continue 提示 + 媒体占位符）、turn diagnostics（store/aggregate/trend）、补偿/回滚（LIFO + 审计 + 文件快照 undo/redo）、Git step 快照 + 消息级 revert/unrevert + 会话 diff、审批流（自动评审 / granular 类别 + 网络目的地放行 / expiry/FIFO/防御清扫/审计落库）、sandbox 策略矩阵（capability 级 + OS 级 sandbox-exec + 会话级运行时切换 + Windows 原生宿主）、40+ 工具组（files/git/terminal/browser 轻量 + playwright/web/http/memory/skills/mcp/scheduling/cron/kanban/knowledge/media/audio/capture/code-execution/process/security/communication/sessions/project/data/backup/pipeline/poll/approval/ai-cli/lsp/ssh/coding 等）、LSP 诊断反馈闭环（编辑后 didChange → 拉诊断 → 证据注入）、MCP stdio + Streamable HTTP client + OAuth + server tool + 断线重连、skills 系统（本地注册表/目录/turn interceptor/激活提示 + 远程市场）、Agent Plugins（manifest/skills/MCP/hooks 捆绑 + 市场目录）、声明式 agent 原型（plan/build/review + 工具门控）、语义记忆检索（embedding + 三模式降级）、自动标题/摘要、会话 fork（branch 血缘继承）+ pin/unpin + title + delete、编排（parallel_spawn/spawn_agent/llm_task/coding_task + delegation graph tree/lineage + worker 自动分类 + thread 状态 + thread 级工件聚合 + 子任务加密 + per-agent 权限 + 每-turn 委派模式）、可观测（audit/stats/compaction-history/summary-quality/turn-diagnostics/delegation/usage + evidence-ledger/verification-gate/weakness-miner/harness-profile 循证螺旋 + dashboard digests + AGENTS 规则草案生成）、hooks 系统（before/afterTurn、before/afterTool、onApproval、pre/post-compaction，命令 + 进程内函数双形态）、gateway（JSON-RPC + HTTP + SSE + NDJSON 流 + WS + owner 鉴权 + InMemory/TypeOrm 持久化 + OpenAPI 3.1 文档 + 会话分享）、console TUI（~20 面板 / ~60 命令 / vim mode / review hunk 折叠 + side-by-side / ssh 远程 shell / 实时双向语音 / 主题 / workspace mentions）、CLI（chat/run 一次性/rpc-stdio/tools list/doctor/completion/update/import/trust + fast/strong 自适应配置）、多代理 v2（per-spawn profile/reasoning/concurrency + 子任务加密）、AGENTS.md 指令链（override/fallback/32KiB 上限/root→cwd 拼接 + FileAdapter 注入 + 插件级作用域）、后台子代理 fire-and-collect（不阻塞当前 turn + 完成事件经 gateway/UI 回传）、LSP server 自动安装（语言→安装命令映射 + 缺失降级提示）、多端交付面（远程传输 P90 + Web console P91 + 浏览器安全边界 P92 + VS Code 扩展 P93 + Electron 桌面壳 P110，四端共用 `AgentConsoleComponent` 渲染层）。

## 已实现功能（P67–P110 落地明细，2026-08）

> P0–P66 打磨条目历史与回归记录见文末「已完成（历史）」。以下为 P67–P110 按方向归类的**已实现功能**清单（非计划）。

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
- **P113 · `/import` 迁移范围扩展（G36）**：新增 `claude-user`（`~/.claude.json` commands/history 元数据）、`cursor-user`（`~/.cursor` sessions/recent chats 索引元数据）与 `ecosystem`（Claude/Cursor plugins/skills 安装清单）三来源；统一 preview/apply action 模型，apply 写入 agent root `imports/*.json`，按 source+data 幂等；列表最多 200 项、递归深度/字段数/长文本有界，过滤 content/messages/transcript/prompt/response/token/apiKey/secret，不复制聊天正文或插件/skill 二进制；CLI 增加扩展 `--sources` 与 `--home`。锚点：`agent-tools/project/import-config.tool.ts`、`agent-cli/src/import-command.ts`、`agent-cli/src/cli.ts`。

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

### IDE 宿主（G21 第三步）

- **P93 · VS Code 远程控制台扩展**：新增 `@tsdi/agent-vscode` 包——VS Code webview 宿主复用 P91 的 web bundle（`media/agent-console.js`，`build.ts` 先跑 agent-ui `build-web.ts` 再 esbuild bundle `extension.ts`，`vscode` external 保持扩展宿主依赖）；`AgentConsolePanel`（`tsdiAgent.openConsole` / `tsdiAgent.refreshConsole` 命令 + 配置变更自动 refresh，webview `retainContextWhenHidden` + `localResourceRoots` + 注入式 `VsCodeHost`/`UriLike`/`WebviewPanelLike` 抽象便于单测）；`webview-html.ts` 生成带 CSP（nonce + `__TSDI_AGENT_WEB__` 注入，JSON 内联转义防 XSS）+ 主题变量（`--vscode-editor-*`）的宿主 HTML；`package.json` contributes 两命令 + `tsdiAgent.gatewayUrl`/`token`/`sessionId` 三配置项；`activate`/`deactivate` 生命周期 + `activateWithHost` 可测入口。**效果**：G21（多端交付面）的 IDE 宿主落地，Web 控制台（P91）+ 远程传输层（P90）被 VS Code 原生复用，TUI/Web/IDE 三端共用同一 `AgentConsoleComponent` 渲染层。锚点：`agent-vscode/src/`（extension/AgentConsolePanel/webview-html/host）、`agent-vscode/build.ts`、`agent-vscode/package.json`、`agent-vscode/test/`（6 passing：panel 复用/重建、activation 注册、URL 归一化、CSP 渲染、注入转义）。

### 成本控制与安全加固（G25/G26/G31）

- **P98 · Rollout token 预算（G25）**：`AgentOptions.tokenBudget`（perSession/perThread/reminders/trackInMemory）+ `TokenBudgetTracker`（记录/评估/重置，token key 归一化 prompt/completion/total 三形态）；runtime 每轮模型完成 `recordTokenUsage` 并 `enforceTokenBudget`——剩余 20%/10% 发布 `AgentTokenBudgetReminderEvent`、耗尽发布 `AgentTokenBudgetExceededEvent` 并中止 turn（非流式返回预算耗尽消息、流式 yield 终止文本）；`AgentRuntime.getTokenBudgetState` 透出 per-session/per-thread 预算状态；gateway `usage.stats` 返回 `budgets`（sessionId → state[]），`app.capabilities` 不含新增方法（走既有 usage 面）。锚点：`agent/src/harness/TokenBudgetTracker.ts`、`agent/src/options.ts`、`agent/src/runtime/DefaultAgentRuntime.ts`、`agent/src/runtime/AgentEvents.ts`、`agent-gateway/src/app-rpc/AppRpcServer.ts`。
- **P99 · secrets/bearer 重放脱敏（G26）**：新增 `RedactionFilter`（与 P86 会话分享共享 SECRET_KEY/SECRET_VALUE 正则集：api-key/token/secret/password/authorization/cookie 字段整值脱敏 + `Bearer <token>` 与 `sk-*` 值内联脱敏）；`redactMessage` 对 compaction replay 注入的最后用户消息（`buildUserMessageReplay`）先脱敏再入上下文——重放路径不再泄露凭据；identity 保持（无变更时返回原对象/原 metadata 引用）。锚点：`agent/src/harness/RedactionFilter.ts`、`agent/src/context/AgentContextManager.ts`（`applyCompactionReplay`）。
- **P102 · 项目信任门（G31）**：新增 `TrustedProjectStore`（FileAdapter 驱动、`~/.tsdi-agent/trusted-projects.json`，trust/untrust/isTrusted/list + 路径归一化去重 + 损坏文件降级）；CLI `tsdi-agent trust [dir]` / `--untrust` 命令；`doctor` 报告 `workspaceTrusted` + `workspace_untrusted` issue（提示运行 trust 命令）；gateway `project.trust_status` / `project.trust` RPC（`AgentOptions.trustedProjectsRoot` 配置，未配置时返回 unavailable）。锚点：`agent/src/project/trusted-projects.ts`、`agent-cli/src/trust-command.ts`、`agent-cli/src/doctor.ts`、`agent-cli/src/cli.ts`、`agent-gateway/src/app-rpc/AppRpcServer.ts`。
- **P114 · usage 时间维度聚合视图（G37）**：复用既有 daily/weekly/cumulative token + turn 汇总，gateway RPC `usage.stats` 与 HTTP `/api/usage` 新增 `range`（daily/weekly/cumulative）和 epoch/ISO `since` 校验、筛选及 `selected` 回传，owner scope 与 budgets 保持不变；agent-ui `/usage [range] [sessionId] [since]` 支持单周期展示，默认命令及 dashboard 继续显示三窗口。锚点：`agent-gateway/src/usage/UsageStats.ts`、`agent-gateway/src/app-rpc/AppRpcServer.ts`、`agent-gateway/src/api/UsageHandler.ts`、`agent-ui/src/AgentConsoleComponent.ts`。

### 模型与生态协议（G32/G30/G28）

- **P103 · 自适应 thinking / reasoning effort 透传（G32）**：`ModelRequest.reasoningEffort`（'low'|'medium'|'high'）+ `AgentModelConfig.reasoningEffort` 配置；OpenAI-compatible adapter 将 `reasoning_effort` 映射到请求档位（缺省高沿用原行为）；Anthropic adapter 按档位推导 thinking budget（low 1024 / medium 2048 / high 4096，显式 `thinkingBudget` 优先）；`RoutedModelAdapter.pickConfig` 透传 reasoningEffort。锚点：`agent/src/model/ModelRequest.ts`、`agent/src/model/ModelProviderOptions.ts`、`agent/src/model/OpenAICompatibleModelAdapter.ts`、`agent/src/model/AnthropicModelAdapter.ts`、`agent/src/model/RoutedModelAdapter.ts`。
- **P101 · 索引化 web search（G30）**：`AgentToolsWebOptions.indexed` + `allowedDomains`；`domain-policy.ts`（`domainAllowed` 子串匹配 + `resolveIndexedEnabled`）；`web_search` 在 indexed 模式仅返回白名单 URL 结果、`web_extract` 白名单外 URL 拒绝提取；search 与 extract 分离授权。锚点：`agent-tools/web/domain-policy.ts`、`agent-tools/web/web-search.tool.ts`、`agent-tools/web/web-extract.tool.ts`、`agent-tools/src/options.ts`。
- **P95 · MCP 2026-07-28 协议升级（G28）**：默认 `protocolVersion` 升至 `2026-07-28`（`SUPPORTED_MCP_PROTOCOL_VERSIONS` 含 2025-03-26/2025-06-18/2026-07-28，`resolveNegotiatedProtocolVersion` 协商降级）；`McpClient` 新增可选 `listResources` / `listPrompts`（cursor 分页，server 不支持时 `.catch` 降级空数组）与 `negotiatedVersion()`；`StdioMcpClient` / `StreamableHttpMcpClient` 从 initialize 结果捕获协商版本。锚点：`agent-tools/mcp/types.ts`、`agent-tools/mcp/StdioMcpClient.ts`、`agent-tools/mcp/StreamableHttpMcpClient.ts`。

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
- **P115 · CLI→Desktop 会话移交（G38）**：新增 `tsdi-agent desktop`（`app` alias）与可测试 launch plan；CLI 解析当前 session/workspace 与 gateway/token，token 只通过子进程环境传递，不暴露在 argv；支持 Electron/desktop entry 覆盖和 detached `unref` 启动。desktop 单实例通过 Electron `requestSingleInstanceLock(additionalData)` 传递 handoff，主实例监听 `second-instance`，更新 gateway/token/session/workspace、重写宿主 HTML、重载窗口并显示；首次启动与已运行实例共用同一配置路径。锚点：`agent-cli/src/desktop-command.ts`、`agent-cli/src/cli.ts`、`agent-desktop/src/DesktopApp.ts`、`agent-desktop/src/host.ts`。
- **P116 · 统一 @ 提及菜单（G39）**：workspace mention resolver 扩展为 files/skills/plugins 统一候选；组件初始化并行读取 `skill_list` 与 `plugins list`，以分类描述展示并插入 `@skill:<id>` / `@plugin:<id>`；提交前将引用解析为 skill 激活提示与 plugin scope，同时保留文件/目录上下文。锚点：`agent-ui/src/AgentConsoleWorkspaceMentions.ts`、`agent-ui/src/AgentConsoleSessionState.ts`、`agent-ui/src/AgentConsoleComponent.ts`。
- **P117 · 并发发现与远程压缩效率（G40）**：新增有界并发映射器与 `provideSkillsAsync`，应用启动前并行发现 workspace skills、remote cache 和 plugin roots，异步 plugin contributions 保持原覆盖优先级；system prompt sections 与 AGENTS/plugin docs 并行读取但按原顺序输出；runtime 将 compaction report 传入 prompt context，压缩轮次的 remote/plugin active skill 只注入摘要与 `read_skill` 指引，本地 skill 保持全文。锚点：`agent-tools/skills/bounded-map.ts`、`agent-tools/skills/provider.ts`、`agent-tools/skills/plugin-manager.ts`、`agent/src/prompt/SystemPromptBuilder.ts`、`agent-tools/skills/ActiveSkillsSection.ts`。
- **P80 · /review 内联评审命令**：`review` 工具组（`agent-tools/review/review-diff.tool.ts`）对当前 git diff（`git diff HEAD` 或指定 range/文件集）发起只读评审——不改工作树，输出结构化 findings（correctness / risks / suggested-fixes，含文件 + 行锚点）；`review_diff` 只读约束 + sandbox 策略 + workspace 守卫 + `AgentToolMode.review` 门控；findings 经 `ReviewFindingsStore` 落审计（toolName `review_diff`、`inputSummary='review <base>: <n> files, <m> findings'`、run 存 `metadata.reviewRun`，无 AuditSink 时抛错）供 review 面板展示，可与 commit 绑定审计。agent-gateway：`review.diff/list/get/save` RPC + `GET /api/reviews` REST（sessionId 必填、owner 403、commit 过滤、`/api/reviews/:id`）；agent-ui `/review` 子命令（run/diff/findings/show/approve/reject/approve-all/clear/clear-all/export/risk/summary）→ git diff 评审流 + findings 面板 + review.save 落库。锚点：`agent-tools/review/`、`agent/src/harness/ReviewFindingsStore.ts`、`agent-gateway/src/api/ReviewHandler.ts`、`agent-gateway/src/app-rpc/AppRpcServer.ts`、`agent-gateway/src/gateway/GatewayBootstrap.ts`、`agent-ui/src/AgentConsoleComponent.ts`。
- **P75 · Gateway OpenAPI 规范**：从已注册 `GatewayRoute[]` 生成 OpenAPI 3.1 文档（路径参数、认证 scheme、`/rpc` 入口），`GET /openapi.json` 免认证暴露。锚点：`agent-gateway/src/gateway/OpenApiDocument.ts`。

### 平台与沙箱（G23 批次）

- **P105 · Windows 原生沙箱宿主 + 网络代理强制**：`sandbox-exec` 两级探测 `windows-native`（`tsdi-agent-sandbox.exe` restricted-token / Job Object / firewall 宿主）→ `wsl-bwrap` 回退；filesystem-write / network / read-denied 能力矩阵 + 按能力降级原因（进程级 fallback 不误报原生隔离）；`sandbox.proxy` HTTP/HTTPS/NO_PROXY 注入 + `required` fail-closed，完整进入 harness profile snapshot/apply；agent-ui `/permissions [status]` 展示平台/实际工具/能力矩阵。锚点：`agent-tools/sandbox-exec`、`agent-ui/src/AgentConsoleComponent.ts`。
- **P112 · 凭据加密存储（G35）**：新增 `CredentialEncryptionBackend` / `CREDENTIAL_ENCRYPTION_BACKEND`，提供 Electron `safeStorage` 适配器与纯 Node AES-256-GCM fallback；fallback 密钥和密文文件强制 0600，状态明确标记降级警告。MCP OAuth store 升级 v2 密文 envelope，兼容读取 v1 明文并在下次写入迁移；CLI `settings.json` / `provider.json` 的嵌套 `apiKey` 改存同一加密 store，读取透明回填；doctor 报告 backend/encrypted/fallback/warning。锚点：`agent-tools/mcp/mcp-credentials.ts`、`agent-tools/mcp/mcp-oauth.ts`、`agent-cli/src/config.ts`、`agent-cli/src/doctor.ts`。

### 插件生态（G27 批次）

- **P106 · Agent Plugins 便携插件 + 市场目录**：在 P87 `RemoteSkillManager` 之上新增 `AgentPluginManager`/`plugins` 工具——`plugin.json` manifest（name/description/skills/connectors/mcpServers/version/hooks）解析 + local/personal/workspace/remote 四层市场目录优先级，安装时 skills + MCP servers + hooks 一并注册；版本追踪/冲突检测复用 P87 语义；AGENTS.md 插件级作用域（目录级自动激活）；安装/激活/调用 analytics 入 audit。锚点：`agent-tools/plugins/`。注：当前为**自研 manifest 格式**，与 2026-08-06 发布的 **Agent Plugins 1.0.0 跨厂商标准**（agentplugins.codes，VS Code/Cursor/Copilot/ChatGPT & Codex/Kiro 联盟）存在兼容差距，见 G34。
- **P111 · Agent Plugins 1.0.0 标准兼容（G34）**：`AgentPluginManager` 新增标准 manifest 归一化层，保留旧格式兼容；标准插件默认扫描 `skills/`，读取独立 `mcp.json` 并将 stdio / Streamable HTTP / legacy HTTP+SSE 声明转换为现有 MCP server options；保留 reverse-domain 客户端命名空间及 manifestVersion 等标准元数据；registry 安装会按 manifest 相对 URL 同步下载 MCP 配置并校验路径边界；`plugins info` 与 `inspect` 均输出标准信息。锚点：`agent-tools/skills/plugin-manager.ts`、`agent-tools/skills/plugin.tool.ts`。

### 协议与长会话 UX（G28/G33/G24 批次）

- **P95 · MCP 2026-07-28 协议升级（G28）**：默认 `protocolVersion` 升至 `2026-07-28`（`SUPPORTED_MCP_PROTOCOL_VERSIONS` 含 2025-03-26/2025-06-18/2026-07-28，`resolveNegotiatedProtocolVersion` 协商降级）；`McpClient` 新增可选 `listResources` / `listPrompts`（cursor 分页，server 不支持时 `.catch` 降级空数组）与 `negotiatedVersion()`；`StdioMcpClient` / `StreamableHttpMcpClient` 从 initialize 结果捕获协商版本。锚点：`agent-tools/mcp/types.ts`、`agent-tools/mcp/StdioMcpClient.ts`、`agent-tools/mcp/StreamableHttpMcpClient.ts`。
- **P109 · MCP 断线重连 + OAuth 回调端口（G33）**：`StdioMcpClient`/`StreamableHttpMcpClient` 指数退避自动重连——进程存活探测 + 会话续期（`server/initialized` 重放），重连窗口内并发请求排队而非失败；`mcp-oauth.ts` 读取配置回调端口（`mcp.oauthCallbackPort`）并 honor。锚点：`agent-tools/mcp/StdioMcpClient.ts`、`agent-tools/mcp/StreamableHttpMcpClient.ts`、`agent-tools/mcp/mcp-oauth.ts`。
- **P107 · Thread sections + 分页历史（G24）**：`SessionStore` section 模型（`AgentSessionSection { id, label }` + add/rename/move/delete/list，持久化 `AgentState.sections`，fork 时随 transcript 复制）；gateway `session.messages` 分页返回（`{ sessionId, messages, sections, nextCursor, hasMore }`，cursor/before/limit 增量浏览长转录）+ `session.section.*` 5 RPC（owner 校验 + createIfMissing）；agent-ui `/sections` 命令 + `/threads` sections 分组 + `loadSessionPage` 增量拉取 + `mergeMessagesPage` append/prepend 渲染。锚点：`agent/src/session/SessionStore.ts`、`agent-gateway/src/app-rpc/AppRpcServer.ts`、`agent-ui/src/AgentConsoleComponent.ts`。

### 多代理委派（G29 批次）

- **P108 · 每-turn 多代理委派模式**：`AgentDelegationMode`（'disabled' | 'explicit' | 'proactive'）+ `normalizeDelegationMode` + `buildDelegationModeHint`（proactive 注入 spawn 指导 / disabled 声明禁用 / explicit 空串保证默认系统提示逐字节不变）+ `extractCodingTaskDeliverySignal`/`buildDelegationQualityNote`（仅对 `ran: true` 执行结果做 gate：failedActionId / deliveryIncomplete 触发）；优先级 turn → session → option；`coding_task` 原始输出捕获 + `maybeApplyDelegationQualityGate` 挂载 invokeSingleTool/executeToolsParallel；gateway `session.delegation_mode.set/get` RPC（镜像 sandbox_mode）+ agent-ui `/delegation mode` + `/status` 展示。锚点：`agent/src/runtime/DelegationMode.ts`、`agent/src/runtime/DefaultAgentRuntime.ts`、`agent-gateway/src/app-rpc/AppRpcServer.ts`。

### 桌面交付面（G21 余量）

- **P110 · Electron 桌面壳**：新增 `@tsdi/agent-desktop` 包——Electron 宿主复用 P91 web bundle（`build.ts` 先跑 agent-ui `build-web.ts` 再 esbuild bundle `src/main.ts`，`electron` external），原生 `BrowserWindow`（`contextIsolation`/`sandbox`/无 `nodeIntegration`）+ 系统托盘（Show/Hide/Refresh/Quit + 单击 toggle）+ close-to-tray + 单实例锁；宿主 HTML（`buildDesktopHtml`）带 nonce CSP + JSON 转义 `__TSDI_AGENT_WEB__` 注入（与 P93 webview 同源策略）；`resolveDesktopConfig`（CLI argv > env > 默认，`--gateway-url/--token/--session-id/--workspace/--width/--height/--tray/--close-to-tray/--start-hidden/--no-single-instance` + `TSDI_AGENT_*` 环境变量）；`ElectronHost`/`FileSystemLike` 注入式抽象可无 Electron 单测（`toFileUrl` 对齐 `pathToFileURL` Windows 安全 URI）。效果：TUI/Web/IDE/Desktop 四端共用 `AgentConsoleComponent`。锚点：`agent-desktop/src/`、`agent-desktop/build.ts`、`agent-desktop/test/`。

### TUI 交互专项（G41/G42 批次，2026-08-13）

- **P118 · 手动压缩 `/compact`（G41）**：runtime 新增 `compactNow(reason)` 强制压缩入口——`DefaultAgentRuntime.compactNow` 复用 `AgentContextManager` 压缩流水线（强制阈值越过、同 overflow 路径产出 `CompactionHistoryRecord` 并 publish `session.compacted` 事件），turn 进行中拒绝、session 不存在报错；gateway 新增 `session.compact` RPC（owner 校验，`AppRpcServer.compactSession` 私有方法）；agent-ui `/compact [reason]` 命令（`AgentConsoleSessionService.compactSession`：appRpc `session.compact` → 失败回退 `runtime.compactNow`，同 `/compactions` 记录面，压缩后 notify 摘要）+ commandHints 提示。回归：agent 新增 `compaction-history.spec.ts` compactNow 3 例（732 passing）、agent-gateway 1 例（226 passing）、agent-ui 3 例（418 passing），三包 tsc clean。锚点：`agent/src/runtime/DefaultAgentRuntime.ts`、`agent-gateway/src/app-rpc/AppRpcServer.ts`、`agent-ui/src/AgentConsoleComponent.ts`、`agent-ui/src/AgentConsoleSessionService.ts`。
- **P119 · `!` 前缀本地 shell 执行（G42）**：`AgentConsoleComponent` `submit()` 输入解析层识别 `!` 前缀（非 `/` 非 `@`）——`handleShellBang`（`!cmd` 执行 / 裸 `!` 草稿模式提交或用法提示 / `!!` 切换多行草稿累积）；`runShellCommand` 优先走 appRpc `tools.invoke`，失败回退本地工具注册表 `isToolActive/activate + invoke('terminal')`（sandbox/approval 策略），执行状态经 shell 消息（`type:'shell'`、role:'tool'、`metadata.type:'shell'`）渲染到 messages 面板且**不进模型上下文**，失败展示 exit code/错误；渲染器 `resolveMessageDisplayContent` shell 分支绕过 200 字符截断展示完整输出、`resolveMessageTemplateKind` 对 shell 消息保持 tool 模板（`metadata.error` 不误判 error 模板）。回归：agent-ui 新增 `shell-command.spec.ts` 11 例（418 passing），tsc clean。锚点：`agent-ui/src/AgentConsoleComponent.ts`（`handleShellBang`/`runShellCommand`/`submit()`）、`agent-ui/src/AgentConsoleMessageRenderers.ts`、`agent-ui/test/shell-command.spec.ts`。

## 差距分析 v4（vs Codex / opencode，2026-08-13 深挖）

### 结论

G1–G40 全部闭环（P67–P117，明细见「已实现功能」与「已完成（历史）」）；G21 四端落地（P90 远程传输 / P91 Web console / P92 浏览器安全边界 / P93 VS Code 扩展 / P110 Electron 桌面壳）；协议/安全/迁移批次已收口。TUI 专项 G41/G42 已闭环（P118 手动压缩 `/compact` / P119 `!` shell 执行），后续从 G43/P120 继续。

### 结论 2：TUI 专项差距（G41–G50，2026-08-13 补充）

此前 v1–v4 差距分析只对**协议/安全/迁移/编排**维度，**漏掉了 TUI 本身**。对照 codex v0.135–0.147（composer 输入修饰符 `@`/`!`、`/compact`、`/diff`、`/resume`、`/archive`、`/fork`、`/side`、`/theme`、`/statusline`、`/hooks`、`/memories`、`/fast`、`/personality`、`/keymap` 全局键位 remap + 持久化、Esc 中断、Enter 队列模式、`/raw` 滚动模式、`/ide`、`/mention`、`/ps`、`/agent`、`/debug-config`、`/experimental`）与 opencode v1.18（leader key `Ctrl+X` 体系（new/compact/export/undo/redo/sessions/themes/models/editor/exit/agent-list/status/copy）、`Ctrl+P` 命令面板、`/compact`、`/themes`、`/thinking`、`/details`、`/editor`、`tui.json` 独立配置（theme/keybinds/scroll_speed/mouse/attention sound）、会话 tabs、Tab 切换 agent）逐项核对本 TUI（55 命令，见「命令面」），确认以下真实差距——**本 TUI 是功能丰富的"状态面板型"界面（20+ 面板、55 命令），但在"高效输入 + 会话生命周期 + 键位体系"三个交互维度明显落后**：

1. **无手动压缩**：只有自动压缩（overflow/阈值）+ `/compactions` 历史查询；gateway 无 `session.compact` RPC、runtime 无 `compactNow` 入口——codex/opencode 均支持 `/compact`（opencode `Ctrl+X C`）主动释放上下文。
2. **无 `!` 前缀本地 shell 执行**：codex/opencode 输入行 `!command` 执行本地命令、输出仅展示不进模型；本 TUI 输入层不支持。
3. **无全局键位体系**：仅 vim 模式键位（`/vim` `/keymap` 只管 vim 绑定）；无 opencode `Ctrl+X` leader 快捷键（new/compact/export/undo/redo/sessions/themes/models/editor/exit/agent-list/status/copy）、无 `Ctrl+P` 命令面板、无 codex `/keymap` 全局 remap + `config.toml` 持久化。
4. **无 Esc 中断 / 队列模式**：中断 turn 只能 `/cancel`；无 Esc 全局中断（codex 可配置 interrupt-turn 绑定）、无 Enter 排队（当前 turn 完成后再发送）。
5. **无工作树 diff 视图**：有 `/review`（评审流）与 `/git-snapshots`（会话快照 diff），无 `/diff` 直接查看 staged/unstaged/untracked 工作树 diff。
6. **无主题切换命令**：主题仅能经配置注入（`options.ui?.theme`）；无 `/theme`（codex 预览+保存）或 `/themes`（opencode `Ctrl+X T`）。
7. **无会话生命周期命令**：有 `/new` `/sessions` `/pin` `/title` `/delete`，但无 `/resume` 恢复选择器、无 `/archive`（离开活动列表、转录保留本地）、无 `/fork`/`/side` UI 命令（P77 `session.fork` RPC 已存在但无命令面；`/side` 临时 fork 父线程状态保持可见）。
8. **无可配置状态栏**：status panel 字段固定；无 `/statusline` 配置 footer 项（model/context/git/tokens/session 等）。
9. **无命令簇**：`/hooks`（hooks 系统已实现但无查看命令）、`/memories`（有记忆检索无注入开关）、`/fast`（有 fast/strong profile 概念无切换命令）、`/personality`、`/debug-config`、`/experimental`、`/feedback`、`/ide`（有 agent-vscode 扩展但无命令把 IDE 打开文件/选区拉入 prompt）、`/mention`（有 `@` 路径补全但无选择器）、`/ps`（有 `/jobs` `/toolruns` 但无后台终端状态/停止语义）。
10. **无 TUI 独立配置层**：无 opencode `tui.json` 等价物（theme/keybinds/scroll_speed/mouse/attention sound/leader_timeout），TUI 行为散落 `options.ui`。

> 注：`@` workspace mentions（fuzzy 路径补全 + `@workspace/@model/@tools/@session` 候选）已有，不列为差距；`/undo` `/redo` `/copy` `/export` `/search` `/sections` `/threads` `/usage` 等已覆盖 codex/opencode 对应面。

### 本项目优势（相对 codex/opencode，保持并强化）

1. **循证验证螺旋**（evidence-ledger / verification-gate / weakness-miner / harness-profile + falsify-rate 路由）：codex/opencode 均无系统化的「工具证据 → 声明 vs 实际 → 伪造率 → 修复提示」闭环，这是本项目最独到的差异化主线；LSP 诊断证据（P67）与 AGENTS 规则草案（P78）进一步加固。
2. **多代理编排深度**：delegation graph tree/lineage 持久化、worker 自动分类（sessionRole/originThreadId）、thread 终态回写、thread 级 todo/review 聚合、coding_task 结构化任务编排、worker-class 模型路由、每-turn 委派三态（P108）—— 比 opencode 的 task tool 与 codex 的 subagent 更结构化、可审计。
3. **上下文压缩的严谨性**：anchor 保留 + 五字段 summary schema + 质量评分 + 压缩历史观测 + overflow replay/媒体占位（P68）—— 比 opencode 的摘要压缩更可度量、可回归。
4. **审批流 + 补偿/回滚完备性**：granular 类别 + expiry/FIFO/防御清扫 + 审计落库 + LIFO 补偿 + 文件快照 undo/redo + Git step 快照 revert/unrevert（P71）。
5. **可观测性覆盖**：turn diagnostics / summary quality / compaction history / delegation / audit 全部持久化并暴露 HTTP + RPC + UI 三层，opencode/codex 均无此厚度。
6. **覆盖面**：40+ 工具组、11 个 IM 渠道、MCP stdio + Streamable HTTP + OAuth + server、skills 本地注册表 + 远程市场 + 插件、hooks 双形态（命令 + 进程内函数）、gateway 多协议 + OpenAPI —— 工具广度超过 opencode 内置集。
7. **跨平台响应式 UI 架构**：TUI/浏览器/VS Code webview/Electron 四端共用响应式渲染层（数据变化驱动、无定时器刷新、时间派生动画），共用 `AgentConsoleComponent`，跨平台约束已沉淀至根 AGENTS.md。

### 差距明细表（v4 新增项 G34–G50，v1–v3 全部闭环见「已实现功能」）

| # | 差距 | 对照对象 | 现状证据 | 影响 |
|---|---|---|---|---|
| G34 | ~~Agent Plugins 1.0.0 标准兼容~~ ✅ 已落地（P111） | agentplugins.codes 1.0.0（2026-08-06 发布，跨厂商联盟）；codex v0.147 便携插件 | 标准 manifest、`skills/`、独立 `mcp.json` 三种 transport、reverse-domain 命名空间与 registry 伴随下载均已兼容，旧格式保留 | 已闭环 |
| G35 | ~~凭据无加密存储~~ ✅ 已落地（P112） | codex v0.140：CLI + MCP OAuth 凭据加密本地存储 | safeStorage 适配 + AES-256-GCM fallback；OAuth 与 CLI API key 均加密落盘，doctor 报告后端状态 | 已闭环 |
| G36 | ~~/import 迁移范围窄~~ ✅ 已落地（P113） | codex v0.145：settings/MCP/plugins/sessions/commands/memories | Claude/Cursor 用户元数据与 plugins/skills 清单已纳入 preview/apply 脱敏报告；不复制正文/二进制 | 已闭环 |
| G37 | ~~usage 无时间维度聚合~~ ✅ 已落地（P114） | codex v0.140 `/usage`：daily/weekly/cumulative | 三窗口聚合 + RPC/HTTP range/since + UI 周期切换，保留 session/owner/budget 作用域 | 已闭环 |
| G38 | ~~CLI↔Desktop 无会话移交~~ ✅ 已落地（P115） | codex v0.138 `/app`：CLI thread → Desktop 移交 | `desktop`/`app` CLI 命令 + 环境 handoff + Electron second-instance 重载同一会话 | 已闭环 |
| G39 | ~~@ 提及仅文件~~ ✅ 已落地（P116） | codex v0.140：统一 @ 菜单（files/plugins/skills） | files/skills/plugins 分类候选 + 激活与作用域上下文 | 已闭环 |
| G40 | ~~skill/plugin 顺序发现~~ ✅ 已落地（P117） | codex v0.146：并发发现 + 高效远程压缩 | 有界并发发现 + prompt/docs 并行准备 + remote skill 摘要压缩 | 已闭环 |
| G41 | ~~无手动压缩命令~~ ✅ 已落地（P118） | codex `/compact`；opencode `/compact`（Ctrl+X C） | 仅自动压缩 + `/compactions` 历史；gateway 无 `session.compact` RPC、runtime 无 `compactNow` | 高：长会话主动释放上下文 |
| G42 | ~~无 `!` 前缀本地 shell~~ ✅ 已落地（P119） | codex/opencode 输入 `!cmd` 执行并展示不进模型 | 输入层仅 `/` 命令与 `@` mention，无 `!` 修饰符 | 高：编码效率 |
| G43 | 无全局键位体系 | opencode `Ctrl+X` leader（new/compact/export/undo/redo/sessions/themes/models/editor/exit/agent/status/copy）+ `Ctrl+P` 面板；codex `/keymap` 全局 remap 持久化 | 仅 vim 键位（`/vim` `/keymap` 管 vim 绑定） | 高：键盘流工作 |
| G44 | 无 Esc 中断 / 队列模式 | codex Esc 中断 turn（可配置绑定）+ Enter 排队 | 中断仅 `/cancel` | 中高：交互 |
| G45 | 无工作树 diff 视图 | codex `/diff`（staged/unstaged/untracked） | 有 `/review` `/git-snapshots`，无纯 diff 命令 | 中高：交付前检查 |
| G46 | 无主题切换命令 | codex `/theme` 预览+保存；opencode `/themes` | 主题仅配置注入（`options.ui?.theme`） | 中：定制 |
| G47 | 无会话生命周期命令 | codex `/resume` `/archive` `/fork` `/side` | 有 `/new` `/sessions` `/pin` `/title`；`session.fork` RPC 无 UI 命令；无 `/side` `/archive` | 中：会话管理 |
| G48 | 无可配置状态栏 | codex `/statusline` footer 项配置 | status panel 字段固定 | 低中：定制 |
| G49 | 缺命令簇 | codex `/hooks` `/memories` `/fast` `/personality` `/debug-config` `/experimental` `/feedback` `/ide` `/mention` `/ps` | hooks 有实现无命令；记忆无注入开关；fast 无切换；无 ide/ps 语义 | 低中：完备性 |
| G50 | 无 TUI 独立配置层 | opencode `tui.json`（theme/keybinds/scroll_speed/mouse/attention/leader_timeout） | 行为散落 `options.ui` | 低中：可配置性 |

## 打磨计划（P111+）

> 约定：`Pnn-前缀` 对应差距编号（G34–G40 协议/安全/迁移维度；G41–G50 TUI 专项维度）。每项完成后把内容移到「已实现功能」并更新「已完成（历史）」。
> P105–P110 批次已全部落地并入「已实现功能」；本批次为 2026-08-13 对照最新 codex v0.147 / opencode v1.18 的新差距，按优先级排期如下：
>
> **P111–P117（G34–G40，协议/安全/迁移）见上表；TUI 专项 G41/G42（P118 手动压缩 / P119 `!` shell 执行）已落地并入「已实现功能」，G43–G50 按 P120+ 排期（交互价值排序：键位 > 会话生命周期 > 视图/定制）。**


### TUI 专项批次（G41–G50）

- **P120 · 全局键位体系（G43）**：`AgentConsoleKeymap`（新模块，DI 注入 `ui.keymap` 配置 + 默认表）——opencode 式 `Ctrl+X` leader 序列（n 新会话 / c 压缩 / x 导出 / u 撤销 / r 重做 / l 会话列表 / t 主题 / m 模型 / a agent 列表 / s 状态 / y 复制）+ `Ctrl+P` 命令面板（全部 55+ 命令 fuzzy 搜索执行）；`/keymap` 命令从 vim-only 扩展为全局键位 list/set/unset/reset（持久化到配置）。锚点：`agent-ui/src/AgentConsoleKeymap.ts`（新）、`agent-ui/src/AgentConsoleComponent.ts`、`agent-ui/src/AgentConsoleSuggestions.ts`。
- **P121 · Esc 中断 + Enter 队列（G44）**：终端键绑定层新增 `interruptTurn`（默认 Esc，turn 进行中生效，与 vim normal 模式共存可配置）→ 走既有 cancel/abort 路径；输入行新增 queue 语义——turn 进行中 Enter 提示「排队发送」、turn 完成后自动发送（可配置 `ui.queueMode`）。锚点：`components/console/src/tui.ts`、`components/console/src/input.ts`、`agent-ui/src/AgentConsoleComponent.ts`。
- **P122 · `/diff` 工作树视图（G45）**：agent-ui 新增 `/diff [--staged|--unstaged|--untracked|paths]`——复用 review 的 `git diff` 只读工具面，渲染为侧边 diff 面板（复用 review hunk 折叠/侧栏能力），支持回车跳转打开文件。锚点：`agent-tools/review/review-diff.tool.ts`、`agent-ui/src/AgentConsoleComponent.ts`、`agent-ui/src/AgentConsolePanels.ts`。
- **P123 · `/theme` 主题命令（G46）**：内置 3–5 套主题（默认 dark/light/solarized 等）+ `ui.theme` 持久化；`/theme` 无参预览列表、`/theme <name>` 应用并保存（`setTheme` 已有注入面）。锚点：`agent-ui/src/AgentConsoleTheme.ts`、`agent-ui/src/AgentConsoleComponent.ts`。
- **P124 · 会话生命周期命令（G47）**：`/resume`（复用 `/sessions` 数据源做模糊选择器恢复）、`/archive`（归档标记 + `/sessions` 过滤 + 转录保留本地）、`/fork [messageId]`（映射 P77 `session.fork` RPC，UI 确认新建分支会话）、`/side`（临时 fork，父线程状态保持可见）。锚点：`agent-ui/src/AgentConsoleComponent.ts`、`agent-gateway/src/app-rpc/AppRpcServer.ts`、`agent/src/session/SessionStore.ts`。
- **P125 · `/statusline` 可配置状态栏（G48）**：status panel 字段化——`ui.statusline` 配置项序列（model/context/git-branch/tokens/session/workspace/agent），`/statusline [list|set|unset]` 交互配置并持久化。锚点：`agent-ui/src/AgentConsoleComponent.ts`、`agent-ui/src/AgentConsolePanels.ts`。
- **P126 · 命令簇补齐（G49）**：`/hooks`（列出已注册 hook 阶段与函数/命令形态，复用 agent hooks 事件面）、`/memories`（注入开关 `ui.memoryInjection: boolean`）、`/fast`（`/model fast|strong` 快捷切换，复用 profile 概念）、`/personality`（预设 tone 配置）、`/debug-config`（配置层诊断输出）、`/experimental`（特性开关 registry）、`/feedback`（诊断打包提示）、`/ide`（经 agent-vscode 桥拉取打开文件/选区入 prompt）、`/ps`（后台任务状态 + stop，复用 `BackgroundTaskManager`）。锚点：`agent-ui/src/AgentConsoleComponent.ts`、`agent-tools/src/background-task-manager.ts`、`agent/src/hooks/`。
- **P127 · TUI 独立配置层（G50）**：新增 `agent-ui tui.json` 配置（theme/keybinds/scroll_speed/mouse/attention sound/leader_timeout，schema 化），`AgentUiConfigReader` 合并优先级 CLI > env > tui.json > 默认；桌面壳/Web/IDE 复用同一读取路径。锚点：`agent-ui/src/AgentUiConfigReader.ts`、`agent-ui/src/agent-ui-config.ts`。

## 剩余（远期，未排期）

- **移动 remote（G21 余量）**：远程传输层（P90）、Web console 宿主（P91）、浏览器安全边界（P92）、VS Code 扩展（P93）与 Electron 桌面壳（P110）已就绪，剩余为移动端宿主工程（iOS/Android WebView 或 PWA），暂不排期。
- **GitHub/GitLab 应用集成**（Codex GitHub Action、GitHub 集成、隐藏自动化 agent、Codex Jobs 云端触发）—— 依赖平台 OAuth。

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

P92（`@tsdi/agent` 浏览器安全 module 边界）已落地：8 个 `Default*Store` 的 TypeOrm 实现顶层 import 改惰性 require（新增 `src/lazy-typeorm.ts`：`requireLazy` 动态路径绕过 esbuild 静态打包、`resolveTypeormAdapter` 惰性解析 TypeormAdapter token 并校验实例有效性——`app.get(token, null)` 无 provider 返回哨兵布尔导致误判已修）；`IntervalAgentScheduler` 的 `AgentScheduledTaskEntity` 惰性化；`AgentModule` 移除冗余 TypeOrm* providers/import（`Default*` 惰性覆盖，node 测试经 `AgentOrmModule` 显式注册不受影响）；`DefaultAgentRuntime`/`agent.module.ts` 深度导入 `./goal/GoalStore`（避开 index 的 TypeOrmGoalStore re-export）；新增 `src/web-entry.ts` 浏览器安全入口（只 re-export web 需要的 tokens/runtime/events/tools 等，不含 TypeOrm*/orm/entities）；`build-web.ts` `@tsdi/agent` 别名指向 web-entry + 临时 tsconfig 单独编译 web-entry。效果：web bundle 8.8MB→3.25MB（typeorm/browser 354 输入清零），`typeorm-stub.ts` hack 删除，浏览器 boot 验证通过。最终收尾补齐 `components/console/taskfile.ts`（此前 package build 脚本指向不存在的入口）；全量回归：agents 八包 1712 passing（agent 672 / agent-channels 59 / agent-cli 58 / agent-gateway 212 / agent-providers 13 / agent-ssh 8 / agent-tools 299 / agent-ui 391），跨包 core 130 / components 126 / components-console 72 passing，共 2040 passing；11 个相关包 build clean，`agent-ui build:web` clean（bundle 3.1MB）。

P93（VS Code 远程控制台扩展，G21 IDE 宿主）已落地：新增 `@tsdi/agent-vscode` 包——webview 宿主复用 P91 的 web bundle（`build.ts` 先跑 agent-ui `build-web.ts` 产出 `media/agent-console.js`，再 esbuild bundle `extension.ts`，`vscode` external）；`AgentConsolePanel` 实现 `tsdiAgent.openConsole`/`tsdiAgent.refreshConsole` 命令 + 配置变更自动 refresh，webview 带 `retainContextWhenHidden` + `localResourceRoots` + CSP（nonce + JSON 内联转义）；`VsCodeHost`/`WebviewPanelLike`/`UriLike` 注入式抽象使扩展逻辑可单测（host 接口 + fixture mock）；`webview-html.ts` 生成主题变量（`--vscode-editor-*`）宿主 HTML。效果：TUI/Web/IDE 三端共用 `AgentConsoleComponent` 渲染层。回归：agent-vscode 6 passing（panel 复用/重建、activation 注册、URL 归一化、CSP 渲染、注入转义），`agent-ui build:web` 产出 bundle 3.26MB（`media/agent-console.js`）。

P94–P104 批次（G23/G24/G25/G26/G28/G30/G31/G32）落地明细（2026-08 第二轮打磨）：

P98（Rollout token 预算，G25）已落地：`AgentOptions.tokenBudget`（perSession/perThread/reminders）+ `TokenBudgetTracker`（`recordUsage` 归一化 prompt_tokens/completion_tokens/total_tokens 三形态、`evaluate` 返回 budget/used/remaining/exhausted、`reset`、disabled 时零开销）；runtime 每轮模型完成（含空响应重试/续答/终止 wrap-up/streaming 全路径）`recordTokenUsage` 并 `enforceTokenBudget`——剩余 ≤20%/10% 发布 `AgentTokenBudgetReminderEvent`、耗尽发布 `AgentTokenBudgetExceededEvent` 并中止 turn（非流式返回预算耗尽消息、流式 yield `[Token budget exhausted...]`）；`AgentRuntime.getTokenBudgetState` 透出 per-session/per-thread 状态；gateway `usage.stats` 返回 `budgets`。回归：agent 新增 `token-budget.spec.ts` 8 例（禁用默认、会话累加、thread 独立、key 归一化、阈值提醒、耗尽、reset、无提醒）。全量 agent 698 passing。

P99（secrets/bearer 重放脱敏，G26）已落地：`RedactionFilter`（与 P86 会话分享共享 SECRET_KEY/SECRET_VALUE 正则集：api-key/token/secret/password/authorization/cookie 键整值脱敏 + `Bearer <token>` 与 `sk-*` 值内联脱敏；`redactText`/`redactValue`/`redactMessage`，identity 保持——无变更返回原对象/原 metadata 引用）；`AgentContextManager.applyCompactionReplay` 的 `buildUserMessageReplay` 输出先经 `redactionFilter.redactMessage` 再入上下文。回归：agent 新增 `redaction-filter.spec.ts` 8 例（Bearer、sk-*、纯文本、secret 键、数组递归、消息内容+metadata、identity 保持、content-only 变更）。全量 agent 698 passing。

P101（索引化 web search，G30）已落地：`AgentToolsWebOptions.indexed` + `allowedDomains`；`agent-tools/web/domain-policy.ts`（`domainAllowed` 子串匹配 + `resolveIndexedEnabled`——indexed 但无 allowlist 时回退未过滤）；`web_search` 在 indexed 模式仅返回白名单 URL 结果并标 `indexed: true`、`web_extract` 白名单外 URL 抛拒绝错误；search 与 extract 分离授权。回归：agent-tools 新增 `indexed-web-search.spec.ts` 6 例（search 过滤、非 indexed 全量、无 allowlist 回退、extract 拒绝、extract 放行、非 indexed 无门禁）。全量 agent-tools 307 passing。

P102（项目信任门，G31）已落地：`TrustedProjectStore`（FileAdapter 驱动、`<root>/trusted-projects.json`，`trust`/`untrust`/`isTrusted`/`list`/`storePathFor`，path resolve 归一化去重，损坏文件降级不阻塞）；CLI `tsdi-agent trust [dir]`（`--workspace`/`--untrust`/`--root` 覆盖）写入 `~/.tsdi-agent/trusted-projects.json`；`doctor` 报告 `workspaceTrusted`/`workspaceTrustStore` 并在未信任时给 `workspace_untrusted` warn + 提示；gateway `project.trust_status`/`project.trust` RPC（`AgentOptions.trustedProjectsRoot` 配置，未配置 unavailable），`app.capabilities` 注册。回归：agent 新增 `trusted-projects.spec.ts` 7 例（初始未信任、trust/isTrusted、去重+lastUsedAt、跨实例持久化、untrust、路径归一化、损坏恢复）；gateway 新增 `projectTrustRoundTrip` RPC 测试。全量 agent 698 / gateway 213 passing。

P103（自适应 thinking / reasoning effort 透传，G32）已落地：`ModelRequest.reasoningEffort`（'low'|'medium'|'high'）+ `AgentModelConfig.reasoningEffort`（profile 可配）；OpenAI-compatible `createRequest` 将档位映射 `reasoning_effort`（缺省沿用 'high' 原行为，reasoning 时仍禁 temperature）；Anthropic `thinking.budget_tokens` 按档位推导（low 1024 / medium 2048 / high 4096，显式 `thinkingBudget` 优先）；`RoutedModelAdapter.pickConfig` 透传 reasoningEffort。回归：agent `model-provider.spec.ts` 新增 2 例（openai 档位透传、anthropic 档位预算）。全量 agent 698 passing。

P95（MCP 2026-07-28 协议升级，G28）已落地：默认 `protocolVersion` 升至 `2026-07-28`（`SUPPORTED_MCP_PROTOCOL_VERSIONS` = 2026-07-28/2025-06-18/2025-03-26，`resolveNegotiatedProtocolVersion` 未知版本回退最新）；`McpClient` 新增可选 `listResources`/`listPrompts`（cursor 分页，server 不支持时 `.catch` 降级空数组）与 `negotiatedVersion()`；`StdioMcpClient`/`StreamableHttpMcpClient` 从 initialize result 捕获协商版本（close 时重置）。回归：agent-tools `mcp-http.spec.ts` mock server 升级 2026-07-28 + 新增 resources/prompts 分页协商 1 例 + 版本回退纯函数 1 例。全量 agent-tools 307 passing。

最终全量回归（本轮）：agent 698 / agent-channels 59 / agent-cli 58 / agent-gateway 213 / agent-providers 13 / agent-ssh 8 / agent-tools 307 / agent-ui 391 / agent-vscode 6，共 1753 passing；九包 `tsc --noEmit` clean；`agent-ui build:web` clean（bundle 3.1MB）、`agent-vscode build.ts` clean。

### 本轮收尾验证（2026-08-13）

已完成 P94–P104 批次收尾检查：九包全量测试全部通过（agent 698 / agent-channels 59 / agent-cli 58 / agent-gateway 213 / agent-providers 13 / agent-ssh 8 / agent-tools 307 / agent-ui 391 / agent-vscode 6，共 1753 passing）；九包 package build 全部通过；`agent-vscode` 构建联动 `agent-ui build:web` 成功，产出 `web/dist/agent-console.js` 3.1MB 及 VS Code `media/agent-console.js`。本次验证未发现源码回归，P105+ 仍作为下一阶段计划。

P105（Windows sandbox 宿主边界 + 网络代理强制，G23）已落地：`sandbox-exec` 新增 `windows-native` 与 `wsl-bwrap` 两级探测，检测到 `tsdi-agent-sandbox.exe` 时所有 Windows sandbox 命令经 `--mode/--workspace` helper 协议进入 restricted-token / Job Object / firewall 宿主，未安装 helper 时探测 WSL2 bwrap；新增 filesystem-write / network / read-denied 三项能力矩阵和按能力降级原因，避免把进程级 fallback 误报为原生隔离；`sandbox.proxy` 支持 HTTP/HTTPS/NO_PROXY 注入与 `required` fail-closed，并完整进入 harness profile snapshot/apply；agent-ui `/permissions [status]` 展示平台、实际工具和能力矩阵。回归：agent 704 passing、agent-ui 391 passing；agent / agent-ui / agent-tools / agent-gateway build clean。

P106（Agent Plugins 便携插件 + 市场目录，G27）已落地：在 P87 `RemoteSkillManager` 之上新增 `AgentPluginManager`/`plugins` 工具——插件 manifest（`plugin.json`：name/description/skills/connectors/mcpServers/version/hooks）解析与四层市场目录优先级（local/personal/workspace/remote），安装时 skills + MCP servers + hooks 一并注册；插件版本追踪/冲突检测复用 P87 语义；AGENTS.md 支持插件级作用域（目录级自动激活）；plugin analytics（安装/激活/调用计数入 audit）。回归：agent-tools 315 passing。

P109（MCP 断线重连 + OAuth 回调端口，G33）已落地：`StdioMcpClient`/`StreamableHttpMcpClient` 增加指数退避自动重连——进程存活探测 + 会话续期（`server/initialized` 重放），重连窗口内并发请求排队而非失败；`mcp-oauth.ts` 读取配置回调端口（`mcp.oauthCallbackPort`）并 honor。回归：agent-tools 315 passing。

P107（Thread sections + 分页历史，G24）已落地：`SessionStore` 扩展 section 模型（`AgentSessionSection { id, label }` + `addSection/renameSection/moveSection/deleteSection/listSections`，持久化于 `AgentState.sections`/实体表列，fork 时随 transcript 复制）；gateway `SessionInfo`/`SessionThreadGroup` 透出 sections，`session.messages` 升级为分页返回（`{ sessionId, messages, sections, nextCursor, hasMore }`，cursor/before/limit 增量浏览长转录），新增 `session.section.*` 5 RPC（list/create/rename/move/delete，owner 校验 + createIfMissing）；agent-ui `/sections` 命令（list/create/rename/move/delete）+ `/threads` 展示 sections 分组 + `loadSessionPage` 增量拉取 + `mergeMessagesPage` append/prepend 渲染。回归：agent 新增 `session-sections.spec.ts` 11 例（716 passing）、agent-gateway 11 例（224 passing）、agent-ui 9 例（400 passing），三包 tsc clean + build clean。

P108（每-turn 多代理委派模式，G29）已落地：新增纯模块 `agent/src/runtime/DelegationMode.ts`——`AgentDelegationMode`（'disabled' | 'explicit' | 'proactive'）+ `normalizeDelegationMode` + `buildDelegationModeHint`（proactive 注入「何时 spawn_agent/parallel_spawn」指导、disabled 声明委派禁用、explicit 空串保证默认系统提示逐字节不变）+ `extractCodingTaskDeliverySignal`/`buildDelegationQualityNote`（仅对 `ran: true` 执行结果做 gate：failedActionId / deliveryIncomplete 触发、干净交付/纯 plan 不触发）；`AgentTurnInput.agent.delegationMode` 与 `AgentOptions.delegationMode`（默认 'explicit'）；`AgentRuntime` 抽象 `setSessionDelegationMode`/`getSessionDelegationMode` no-op 基座，`DefaultAgentRuntime` 实现 `sessionDelegationModes` map + `resolveDelegationMode`（优先级 turn → session → option）+ `buildModelRequest` 追加模式提示与一次性质量 note 系统消息（消费即清）；`ToolInvocationResult.structuredOutput` 捕获 `coding_task` 原始输出（coordinator 与直连两路径），`maybeApplyDelegationQualityGate` 挂载 `invokeSingleTool`/`executeToolsParallel`；gateway `session.delegation_mode.set/get` RPC（镜像 sandbox_mode：方法表 + switch + handler + `normalizeDelegationModeValue`，'default'/'explicit' 重置、非法 -32602、owner 403）；agent-ui `/delegation mode [disabled|explicit|proactive|default]` + `/status` 展示 delegation + help hints。回归：agent 新增 `delegation-mode.spec.ts` 13 例（729 passing）、agent-gateway 2 例（225 passing）、agent-ui 4 例（404 passing），三包 tsc clean + build clean。

### 本轮收尾验证（P105–P109 批次，2026-08-13）

九包全量测试全部通过（agent 729 / agent-channels 59 / agent-cli 58 / agent-gateway 225 / agent-providers 13 / agent-ssh 8 / agent-tools 315 / agent-ui 404 / agent-vscode 6，共 1817 passing）；九包 `tsc --noEmit` clean；agent / agent-gateway / agent-ui / agent-vscode package build 全部通过，`agent-vscode` 构建联动 `agent-ui build:web` 成功产出 `web/dist/agent-console.js` 3.1MB 及 VS Code `media/agent-console.js`。差距表 v3（G23–G33）全行闭环，P105+ 打磨计划全部落地，剩余为「远期」桌面壳/移动 remote 与 GitHub/GitLab 集成。

### 本轮收尾验证（P110 桌面壳批次，2026-08-13）

P110（Electron 桌面壳，G21 余量）已落地：新增 `@tsdi/agent-desktop` 包——Electron 宿主复用 P91 web bundle（`build.ts` 先跑 agent-ui `build-web.ts` 再 esbuild bundle `src/main.ts`，`electron` external 保持宿主依赖），原生 `BrowserWindow`（`contextIsolation`/`sandbox`/无 `nodeIntegration`）+ 系统托盘（Show/Hide/Refresh/Quit 菜单 + 单击 toggle）+ close-to-tray + 单实例锁；宿主 HTML（`buildDesktopHtml`）带 nonce CSP + JSON 转义 `__TSDI_AGENT_WEB__` 注入（与 P93 webview 同源策略）；配置解析 `resolveDesktopConfig`（CLI argv > env > 默认，`--gateway-url/--token/--session-id/--workspace/--width/--height/--tray/--close-to-tray/--start-hidden/--no-single-instance` + `TSDI_AGENT_*` 环境变量）；`ElectronHost`/`FileSystemLike` 注入式抽象使窗口/托盘/生命周期逻辑可在无 Electron 环境单测（fixture host，`toFileUrl` 语义对齐 `pathToFileURL` 的 Windows 安全 URI）。效果：TUI/Web/IDE/Desktop 四端共用 `AgentConsoleComponent` 渲染层，桌面壳闭环，G21 仅剩移动 remote 远期项。回归：agent-desktop 18 passing（host html 3 例 + config 6 例 + app lifecycle 9 例），`tsc --noEmit` clean，`npm run build` 产出 `dist/main.js` 11KB + `resources/agent-console.js` 3.3MB。锚点：`agent-desktop/src/`（host/desktop-html/config/DesktopApp/main）、`agent-desktop/build.ts`、`agent-desktop/test/`（3 spec）。

### 本轮收尾验证（P118/P119 TUI 专项批次，2026-08-14）

P118（手动压缩 `/compact`，G41）与 P119（`!` 前缀本地 shell 执行，G42）已落地（明细见「已实现功能 · TUI 交互专项（G41/G42 批次）」）。最终回归：agent 732 / agent-tools 270 / agent-gateway 226 / agent-ui 418 / agent-cli 58 / agent-desktop 18 / agent-vscode 6，共 1728 passing；七包 `npm run build` 全部通过，其中 desktop 与 VS Code 构建均联动生成 agent-ui Web bundle（3.2MB）。差距表 G41/G42 已闭环，打磨计划 TUI 专项自 G43（P120）起继续排期。

### P111 Agent Plugins 1.0.0 标准兼容（2026-08-14）

P111（G34）已落地：标准与旧 manifest 双格式读取、标准 `skills/` 默认发现、独立 `mcp.json` 的 stdio / Streamable HTTP / legacy HTTP+SSE 归一化、reverse-domain 客户端命名空间保留、registry 相对 MCP 配置伴随下载与路径边界校验，以及 `plugins info` 标准信息输出。回归：agent-tools 317 passing，`npm run build` clean；新增本地标准插件聚合与 registry 标准插件安装 2 例。G34 已闭环，协议/安全批次下一项为 P112（凭据加密存储）。

### P112 凭据加密存储（2026-08-14）

P112（G35）已落地：MCP OAuth token 与 CLI provider/settings API key 统一加密落盘，Electron safeStorage 可注入，纯 Node 使用带明确 doctor 警告的 AES-256-GCM 本地密钥 fallback；密钥/密文权限 0600，旧 v1 明文 OAuth store 可读并自动迁移。回归：agent-tools 319 / agent-cli 58，共 377 passing；两包 build 与 CLI `tsc --noEmit` clean。G35 已闭环，下一项为 P113（迁移范围扩展）。

### P113 `/import` 迁移范围扩展（2026-08-14）

P113（G36）已落地：`claude-user` / `cursor-user` / `ecosystem` 三来源覆盖 commands/history、session/recent-chat 索引和 plugins/skills 清单；统一 preview/apply、真实 generatedAt + data 幂等比较、`--home` 覆盖与有界脱敏报告，明确不复制聊天正文和生态二进制。回归：agent-tools 320 / agent-cli 59，共 379 passing；两包 `npm run build` clean。G36 已闭环，下一项为 P114（usage 时间聚合）。

### P114 usage 时间维度聚合视图（2026-08-14）

P114（G37）已落地：在既有 daily/weekly/cumulative 汇总之上补齐 RPC/HTTP `range` + `since` 筛选、参数错误响应、selected window，以及 `/usage [daily|weekly|cumulative] [sessionId] [since]` 单周期展示；无参命令与 dashboard 保持三窗口兼容。回归：agent-gateway 226 / agent-ui 419，共 645 passing；两包 `npm run build` clean。G37 已闭环，下一项为 P115（CLI→Desktop 会话移交）。

### P115 CLI→Desktop 会话移交（2026-08-14）

P115（G38）已落地：CLI `desktop`/`app` 支持当前 session/workspace/gateway/token 的安全 handoff，desktop 单实例接收 additionalData 后重写配置并重载窗口；无已运行实例时按同一配置首次启动。回归：agent-desktop 19 / agent-cli 61，共 80 passing；desktop 与 CLI `npm run build` clean。G38 已闭环，下一项为 P116（统一 @ 提及菜单）。

### P116 统一 @ 提及菜单（2026-08-14）

P116（G39）已落地：agent-ui 在既有文件/目录 mention 上加入注册 skill 与已安装 plugin 分类候选，确认后插入 canonical 引用；turn 提交前解析 skill 激活提示和 plugin scope。无 workspace 时仍可使用 skill/plugin 候选，文件路径行为保持兼容。回归：agent-ui 421 passing，`npm run build` clean。G39 已闭环，下一项为 P117（并发 skill/plugin 发现与远程压缩效率）。

### P117 并发发现与远程压缩效率（2026-08-14）

P117（G40）已落地：skill roots 内文件读取和 plugin roots/contributions 使用 8 路有界并发；新增兼容旧同步 API 的 `provideSkillsAsync` 启动路径，并行准备 workspace、remote cache 与 plugins。system prompt sections、项目与 plugin AGENTS docs 并行读取且确定性输出；发生上下文压缩时 remote/plugin active skills 仅注入摘要，本地 skills 不降级。回归：agent-tools 322 / agent 733，共 1055 passing；两包 `npm run build` 与 `tsc --noEmit` clean。G40 已闭环，协议/安全/迁移批次 P111–P117 全部收口，下一项为 P120（全局键位体系）。
