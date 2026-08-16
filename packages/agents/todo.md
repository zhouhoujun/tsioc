# Agents 后续打磨清单

## 功能总纲

主干能力已齐（2026-08 对比 Codex / opencode 口径）：turn 循环（run/streaming）、多模型适配（Echo/Anthropic/OpenAI/Routed + profiles + complexity 路由 + worker-class 路由 + 命令级 profile + retry-after 分类退避）、prompt cache 支持（请求侧 cache_control + 系统提示静态段前置）、上下文压缩 + 重放（overflow 克隆最后用户消息 / 主动 continue 提示 + 媒体占位符）、turn diagnostics（store/aggregate/trend）、补偿/回滚（LIFO + 审计 + 文件快照 undo/redo）、Git step 快照 + 消息级 revert/unrevert + 会话 diff、审批流（自动评审 / granular 类别 + 网络目的地放行 / expiry/FIFO/防御清扫/审计落库）、sandbox 策略矩阵（capability 级 + OS 级 sandbox-exec + 会话级运行时切换 + Windows 原生宿主）、40+ 工具组（files/git/terminal/browser 轻量 + playwright/web/http/memory/skills/mcp/scheduling/cron/kanban/knowledge/media/audio/capture/code-execution/process/security/communication/sessions/project/data/backup/pipeline/poll/approval/ai-cli/lsp/ssh/coding 等）、LSP 诊断反馈闭环（编辑后 didChange → 拉诊断 → 证据注入）、MCP stdio + Streamable HTTP client + OAuth + server tool + 断线重连、skills 系统（本地注册表/目录/turn interceptor/激活提示 + 远程市场）、Agent Plugins（manifest/skills/MCP/hooks 捆绑 + 市场目录 + 1.0.0 标准兼容）、声明式 agent 原型（plan/build/review + 工具门控）、语义记忆检索（embedding + 三模式降级）、自动标题/摘要、会话 fork（branch 血缘继承）+ pin/unpin + title + delete + archive + resume、编排（parallel_spawn/spawn_agent/llm_task/coding_task + delegation graph tree/lineage + worker 自动分类 + thread 状态 + thread 级工件聚合 + 子任务加密 + per-agent 权限 + 每-turn 委派模式）、可观测（audit/stats/compaction-history/summary-quality/turn-diagnostics/delegation/usage + evidence-ledger/verification-gate/weakness-miner/harness-profile 循证螺旋 + dashboard digests + AGENTS 规则草案生成）、hooks 系统（before/afterTurn、before/afterTool、onApproval、pre/post-compaction，命令 + 进程内函数双形态）、gateway（JSON-RPC + HTTP + SSE + NDJSON 流 + WS + owner 鉴权 + InMemory/TypeOrm 持久化 + OpenAPI 3.1 文档 + 会话分享 + usage 时间聚合 + token 预算）、console TUI（~20 面板 / ~70 命令 / vim mode / Ctrl+X leader + Ctrl+P 面板 / review hunk 折叠 + side-by-side / ssh 远程 shell / 实时双向语音 / 主题 / workspace mentions / tui.json 配置层）、CLI（chat/run 一次性/rpc-stdio/tools list/doctor/completion/update/import/trust/desktop + fast/strong 自适应配置）、多代理 v2（per-spawn profile/reasoning/concurrency + 子任务加密）、AGENTS.md 指令链（override/fallback/32KiB 上限/root→cwd 拼接 + FileAdapter 注入）、Web/IDE/Desktop 三宿主（P90–P93/P110）、凭据加密存储、项目信任门、`!` shell 前缀、Esc 中断 + Enter 队列。

> v5 差距（G51–G78，2026-08-14）聚焦 **TUI 交互细节**（对照 codex v0.128–0.145 / opencode 2026-07 的键位、输入修饰符、展示与配置面），详见「差距分析 v5」。

## 已实现功能（P0–P127 全量，2026-08-14 盘点）

> 早期打磨（P0–P66）逐条回归记录见 git history；P67–P127 按方向归类如下（锚点仅列关键文件，均为当前代码中已核实的实现）。

### 主干能力（P0–P66）

- **turn 循环 / 多模型**：run/streaming、Echo/Anthropic/OpenAI-compatible/Routed 适配、profiles、complexity 路由、worker-class 路由、命令级 profile、重试/退避分类（P76）。
- **上下文工程**：prompt cache（请求侧 cache_control + 静态段前置，P69）、压缩 + 重放（overflow/主动 continue + 媒体占位符，P68）、AGENTS.md 指令链（override/fallback/32KiB/root→cwd + FileAdapter，P72）、语义记忆检索（embedding + keyword/semantic/hybrid 三模式，P73）、自动标题/摘要（P74）、项目记忆闭环（AGENTS 规则草案，P78）。
- **补偿/回滚/审批**：LIFO 补偿 + 文件快照 undo/redo、Git step 快照 + 消息级 revert/unrevert + 会话 diff（P71）、审批流（granular 类别 + 网络放行 + expiry/FIFO/防御清扫/审计落库）。
- **工具面**：40+ 工具组、LSP 诊断反馈闭环（P67）+ 自动安装（P89）、编辑后验证命令证据（P79）、MCP client（stdio/Streamable HTTP/OAuth/server/断线重连，P95/P109）、skills（本地注册表 + 远程市场，P87）、Agent Plugins（P106/P111）、声明式 agent 原型 plan/build/review + 工具门控（P70）、/review 内联评审（P80）。
- **编排/可观测**：parallel_spawn/spawn_agent/llm_task/coding_task + delegation graph + worker 分类 + thread 工件聚合 + 每-turn 委派模式（P108）、evidence-ledger/verification-gate/weakness-miner/harness-profile、hooks 双形态（含 pre/post-compaction，P82）、gateway（JSON-RPC/HTTP/SSE/NDJSON/WS + OpenAPI 3.1，P75）。
- **交付面（G21）**：远程传输层（P90）、Web console 宿主（P91）、浏览器安全 module 边界（P92）、VS Code 扩展（P93）、Electron 桌面壳（P110）。
- **安全/生态/生命周期**：会话分享（P86）、会话 fork（P77）、Provider 注册表（P84）、Eval runner（P85）、Goal 系统（P83）、token 预算（P98）、secrets/bearer 重放脱敏（P99）、索引化 web search（P101）、项目信任门（P102）、reasoning effort 透传（P103）、Windows 原生沙箱 + 网络代理强制（P105）、凭据加密存储（P112）、/import 迁移（P81/P113）、usage 时间聚合（P114）。
- **agent-ui 渲染性能（P62–P66）**：时间派生动画（去 setInterval）、elapsedLabel 秒级稳定、SessionState Proxy 驱动（去 ~130 处 notify/batch）、布局层脏节点缓存验证失败已回退（教训见根 AGENTS.md）。

### 编码反馈闭环

- **P67 · 编辑 → LSP 诊断反馈**：编辑工具执行后触发 didChange → 拉缓存 diagnostics → 追加为工具结果 `lspDiagnostics`；VerificationGate 新证据源 `evidence.verification == 'lsp'`；`lsp.diagnosticsOnEdit` 开关。锚点：`agent-tools/lsp/lsp-client.ts`、`agent/src/harness/ToolExecutionCoordinator.ts`。
- **P79 · 编辑后验证命令证据**：工具轮编辑后探测包 test/build/typecheck/lint 脚本并运行 → `evidence.verification == 'verify-command'`；VerificationGate 检查 (d) 消费失败命令为伪造原因；`verification.verifyCommands`/`autoScripts`/`timeoutMs`。锚点：`agent/src/harness/VerifyCommandRunner.ts`、`agent/src/runtime/DefaultAgentRuntime.ts`。
- **P71 · Git step 快照 + revert/unrevert**：`git stash create` + pinned refs 整树捕获（不污染历史），绑定消息 id；`revert(messageId)`/`unrevert()` 恢复工作树 + 会话双态；会话 diff 供 review 面板。锚点：`agent/src/harness/GitStepSnapshotStore.ts`。
- **P76 · 模型请求重试/退避分类**：rate-limit/server/network/timeout 四类 + 指数退避 + jitter + `Retry-After`（15s 上限），OpenAI-compatible 与 Anthropic 共享。锚点：`agent/src/model/RetryPolicy.ts`。
- **P89 · LSP server 自动安装**：扩展→命令→安装命令内置映射 + `command -v` 探测 + 有界超时安装；`autoInstall: true` 自动安装、其余返回带安装命令的 hint。锚点：`agent-tools/lsp/lsp-install.ts`。

### 上下文工程

- **P68 · Compaction replay + 媒体占位符**：硬性 overflow 克隆最后用户消息（媒体 → `[Attached <type>: <name>]`）`replayKind: 'last-user-message'`；主动压缩注入继续提示 `replayKind: 'continue-prompt'`；CompactionHistoryRecord/AgentTurnDiagnostics 全链路传播。锚点：`agent/src/context/AgentContextManager.ts`。
- **P69 · Prompt cache 请求侧落地 + 系统提示分段**：`PromptSection.cacheable`（DateTime/Memory 置 false）、静态段前置；openai 标注 `cache_control`（supported 'full'）、deepseek 依赖自动 caching（'partial'）、其余 observe_only；前缀 hash 检测 `prefixBroken`。锚点：`agent/src/model/OpenAICompatibleModelAdapter.ts`、`agent/src/prompt/SystemPromptBuilder.ts`。
- **P72 · AGENTS.md 指令链升级**：root→cwd 有序指令链（override → 主文件名 → fallback 去重）；`projectDocMaxBytes` 32KiB 字节截断不劈多字节字符；FileAdapter 注入式驱动。锚点：`agent/src/project/agents-doc.ts`。
- **P73 · 语义记忆检索**：MemoryEmbedder（DI token，无配置回退关键词）+ cosine 排序 + SemanticMemoryRanker；MemorySearchService 三模式（keyword/semantic/hybrid）；`memory.search` 支持 mode/minScore。锚点：`agent/src/memory/AgentMemoryRetriever.ts`。
- **P74 · 自动标题/摘要**：首条用户消息异步生成 title/focusSummary（LLM + deterministic 回退）。
- **P78 · 项目记忆闭环**：`buildAgentsRuleDraft(report)` 把高频失败渲染为带人工审核标记的 AGENTS.md 规则草案；`harness.audit` 经 `includeDraft: true` 返回，默认不写入。

### 配置迁移

- **P81 · Claude Code / Cursor 配置迁移**：`tsdi-agent import` / `import_config`，CLAUDE.md、`.cursor/rules/*.md`、`.cursor/mcp.json` / `.mcp.json` 两阶段迁移（preview/apply）；AGENTS.md marker 分区幂等更新；workspace/symlink 守卫。
- **P113 · /import 迁移范围扩展（G36）**：`claude-user` / `cursor-user` / `ecosystem` 三来源（commands/history、sessions/recent-chat 索引、plugins/skills 清单）；统一 preview/apply、幂等、有界脱敏，不复制聊天正文/二进制；CLI `--sources` / `--home`。锚点：`agent-tools/project/import-config.tool.ts`、`agent-cli/src/import-command.ts`。

### skills 生态 / 插件生态

- **P87 · skills 远程市场（G19）**：git 源 shallow clone + ref 固定 + 更新；registry 源 JSON manifest → SKILL.md 物化 + 版本追踪；id 冲突检测（force 覆盖、失败回滚）；`skills_remote` 工具（install/update/list/remove/status）。锚点：`agent-tools/skills/remote-skill-manager.ts`。
- **P106 · Agent Plugins 便携插件 + 市场目录（G27）**：plugin.json manifest 解析 + local/personal/workspace/remote 四层市场目录；安装时 skills + MCP + hooks 一并注册；目录级自动激活；analytics 入 audit。锚点：`agent-tools/plugins/`。
- **P111 · Agent Plugins 1.0.0 标准兼容（G34）**：标准/旧 manifest 双格式；标准 `skills/` 默认扫描；独立 `mcp.json` 的 stdio / Streamable HTTP / legacy HTTP+SSE 归一化；reverse-domain 命名空间保留；registry 相对 MCP 配置伴随下载 + 路径边界校验。锚点：`agent-tools/skills/plugin-manager.ts`。

### 后台子代理 / 多代理

- **P88 · 后台子代理 UX（G20）**：`spawn_agent background: true` fire-and-collect；BackgroundTaskManager（start 立即返回 running、异步回写 + 生命周期事件、get/list/cancel/wait）；`BACKGROUND_TASK_RUNNER` DI token 注入避环；gateway SSE + agent-ui 通知。锚点：`agent-tools/src/background-task-manager.ts`。
- **P108 · 每-turn 多代理委派模式（G29）**：`AgentDelegationMode` disabled/explicit/proactive + 模式提示注入；coding_task 交付质量门（failedActionId/deliveryIncomplete 触发）；gateway `session.delegation_mode.set/get`；agent-ui `/delegation mode`。锚点：`agent/src/runtime/DelegationMode.ts`。
- **多代理 v2 基础**：per-spawn profile/reasoning/concurrency、delegation graph tree/lineage、worker 自动分类、thread 级工件聚合、子任务加密、per-agent 权限。

### 远程传输 / 宿主（G21）

- **P90 · Gateway 远程传输层**：`POST /rpc/stream` NDJSON 流式（turn_stream chunk + result）；agent-ui `HttpAgentConsoleAppRpc`（fetch JSON-RPC + Bearer + 超时 + NDJSON 解析）+ `AgentConsoleRemoteEventBridge`（SSE 增量解析 + 15+ 类事件映射 + sessionId 过滤 + 断线重连）。锚点：`agent-gateway/src/api/AppRpcHandler.ts`、`agent-ui/src/HttpAgentConsoleAppRpc.ts`。
- **P91 · Web console 宿主**：gateway `staticDir` 静态托管；agent-ui `web-console.ts`（mountAgentWebConsole + `TsdiAgentWeb`）+ `build-web.ts` 两阶段构建（tsc 保装饰器元数据 → esbuild bundle）。锚点：`agent-gateway/src/gateway/GatewayServer.ts`、`agent-ui/web-console.ts`。
- **P92 · @tsdi/agent 浏览器安全 module 边界**：8 个 Default*Store TypeOrm 惰性 require（`src/lazy-typeorm.ts`）+ IntervalAgentScheduler 惰性化；`src/web-entry.ts` 浏览器安全入口；bundle 8.8MB→3.25MB、typeorm 清零。锚点：`agent/src/lazy-typeorm.ts`、`agent/src/web-entry.ts`。
- **P93 · VS Code 远程控制台扩展**：webview 复用 P91 bundle + CSP(nonce+JSON 转义) + 主题变量；`AgentConsolePanel`/`VsCodeHost` 注入式可测。锚点：`agent-vscode/src/`。
- **P110 · Electron 桌面壳**：BrowserWindow(contextIsolation/sandbox) + 系统托盘 + close-to-tray + 单实例锁；`resolveDesktopConfig`（argv > env > 默认）；`ElectronHost`/`FileSystemLike` 注入式可测。锚点：`agent-desktop/src/`。

### 成本控制与安全加固

- **P98 · Rollout token 预算（G25）**：`AgentOptions.tokenBudget` + TokenBudgetTracker（三形态归一化）；剩余 20%/10% 提醒事件、耗尽中止 turn；`usage.stats` 返回 budgets。锚点：`agent/src/harness/TokenBudgetTracker.ts`。
- **P99 · secrets/bearer 重放脱敏（G26）**：RedactionFilter（SECRET_KEY/VALUE 正则集 + `Bearer <token>`/`sk-*` 内联）；compaction replay 注入前先脱敏；identity 保持。锚点：`agent/src/harness/RedactionFilter.ts`。
- **P102 · 项目信任门（G31）**：TrustedProjectStore（FileAdapter、trust/untrust/isTrusted/list）；CLI `trust` 命令；doctor 报告 workspaceTrusted；gateway `project.trust_status/trust`。锚点：`agent/src/project/trusted-projects.ts`。
- **P112 · 凭据加密存储（G35）**：CredentialEncryptionBackend（Electron safeStorage 适配 / AES-256-GCM fallback，0600 权限 + 降级警告）；MCP OAuth v2 密文 envelope + v1 兼容迁移；CLI apiKey 同库。锚点：`agent-tools/mcp/mcp-credentials.ts`。
- **P114 · usage 时间维度聚合（G37）**：RPC/HTTP `range`（daily/weekly/cumulative）+ `since` 筛选 + selected 回传；agent-ui `/usage [range] [sessionId] [since]`。锚点：`agent-gateway/src/usage/UsageStats.ts`。

### 模型与生态协议

- **P103 · 自适应 thinking / reasoning effort 透传（G32）**：`ModelRequest.reasoningEffort` low/medium/high；OpenAI-compatible 映射 `reasoning_effort`；Anthropic 推导 thinking budget（1024/2048/4096，显式优先）。锚点：`agent/src/model/ModelRequest.ts`。
- **P101 · 索引化 web search（G30）**：`AgentToolsWebOptions.indexed` + allowedDomains；domain-policy 子串匹配；search/extract 分离授权。锚点：`agent-tools/web/domain-policy.ts`。
- **P95 · MCP 2026-07-28 协议升级（G28）**：默认 protocolVersion 2026-07-28（协商降级）；`listResources`/`listPrompts`（cursor 分页 + 降级）；`negotiatedVersion()`。锚点：`agent-tools/mcp/types.ts`。
- **P109 · MCP 断线重连 + OAuth 回调端口（G33）**：指数退避自动重连 + 会话续期（`server/initialized` 重放）+ 窗口内请求排队；`mcp.oauthCallbackPort`。锚点：`agent-tools/mcp/StdioMcpClient.ts`。

### 生命周期 / 目标 / 会话

- **P82 · pre/post-compaction hooks（G13）**：`beforeCompaction`/`afterCompaction`（shell/function 双形态），after 载荷含 summary/质量分/report/丢弃统计。锚点：`agent/src/hooks/AgentHooks.ts`。
- **P83 · Goal 系统（G15）**：InMemory/TypeORM/Default GoalStore；跨 session 关联；active goal 自动注入上下文；全部 criteria 覆盖确定性完成；gateway `goal.*` + agent-ui `/goal`。锚点：`agent/src/goal/`。
- **P77 · 会话 fork**：`SessionStore.fork(sessionId, messageId?)` 完整/截断转录 + branch 血缘 + `sessionRole: branch`；gateway `session.fork`。锚点：`agent/src/session/SessionStore.ts`。
- **P107 · Thread sections + 分页历史（G24）**：section 模型（add/rename/move/delete/list，fork 复制）；`session.messages` 分页（cursor/before/limit + nextCursor/hasMore）；`session.section.*` 5 RPC；agent-ui `/sections` + `/threads` 分组 + loadSessionPage/mergeMessagesPage。
- **P85 · Eval 基准 runner（G17）**：EvalTask/EvalRun + 注入式 EvalRunner（单任务/批量/profile/验证命令评分/降级/报告存储）；gateway `POST /api/eval/run`、`GET /api/eval`。
- **P86 · 会话分享（G18）**：owner 创建不可变脱敏快照 + 192-bit token 公开只读 + 撤销；递归裁剪路径/密钥/Bearer/sk-*。锚点：`agent-gateway/src/api/SessionShareHandler.ts`。
- **P84 · Provider 注册表（G16）**：内置 provider/model 目录 + 可解析 `provider.json`；能力位（chat/vision/tool-calling/prompt-cache/reasoning）；CLI/gateway `/model` 消费。

### 声明式 agent / 平台沙箱 / 交付面

- **P70 · 声明式 agent 原型（G6）**：AgentArchetype 对齐 opencode `Agent.Info`；plan（只读+plans 目录）/build/review 三原型；工具门控 deny > allow > readOnly（writePaths 放行、`prefix*` 通配）；agent-ui `/archetype` + `/status`；gateway `session.archetype.set/get`。
- **P80 · /review 内联评审命令（G12）**：`review_diff` 只读 git diff 评审 + ReviewFindingsStore 审计落库；gateway `review.*` RPC + REST；agent-ui `/review` 子命令 14 条。
- **P75 · Gateway OpenAPI 规范（G9）**：从 GatewayRoute[] 生成 OpenAPI 3.1（路径参数/认证 scheme/`/rpc`），`GET /openapi.json` 免认证。
- **P105 · Windows 原生沙箱 + 网络代理强制（G23）**：`windows-native`（restricted-token/Job Object/firewall）→ `wsl-bwrap` 回退；能力矩阵 + 降级原因；`sandbox.proxy` HTTP/HTTPS/NO_PROXY + `required` fail-closed；agent-ui `/permissions [status]`。
- **P115 · CLI→Desktop 会话移交（G38）**：`tsdi-agent desktop`（app alias）；token 仅环境传递；Electron `requestSingleInstanceLock(additionalData)` + second-instance 重载。
- **P116 · 统一 @ 提及菜单（G39）**：files/skills/plugins 统一候选 + 分类描述；`@skill:<id>`/`@plugin:<id>` 解析为激活提示与 scope。
- **P117 · 并发发现与远程压缩效率（G40）**：有界并发映射 + `provideSkillsAsync`；prompt/docs 并行准备确定性输出；压缩轮次 remote/plugin skill 摘要化 + `read_skill` 指引。

### TUI 交互专项（G41–G50，P118–P127）

- **P118 · 手动压缩 `/compact`（G41）**：`compactNow(reason)` 强制压缩（复用压缩流水线、拒绝 turn 中、publish `session.compacted`）；gateway `session.compact` RPC；agent-ui `/compact [reason]`。
- **P119 · `!` 前缀本地 shell 执行（G42）**：`handleShellBang`（`!cmd` 执行 / 裸 `!` 草稿 / `!!` 多行累积）；输出渲染为 shell 消息**不进模型上下文**；`resolveMessageDisplayContent` shell 分支绕过 200 字符截断。
- **P120 · 全局键位体系（G43）**：AgentConsoleKeymap（Ctrl+X leader 13 动作 + Ctrl+P fuzzy 面板）；`/keymap` 管理 global/vim 双域并持久化 `.tsdi-agent/keymap.json`。
- **P121 · Esc 中断 + Enter 队列（G44）**：`escape -> interrupt-turn`（运行中优先于 vim，可解绑）；普通 prompt 运行中按 Enter 按 session FIFO 排队（含附件）+ 队列计数 + finally 后排空；`ui.queueMode: false` 保留草稿。
- **P122 · `/diff` 工作树视图（G45）**：`review_diff` 四 scope（working-tree/staged/unstaged/untracked）+ paths + untracked unified patch；agent-ui `/diff` 复用 review 面板 hunk/折叠/side-by-side。
- **P123 · `/theme` 主题命令（G46）**：dark/light/solarized/high-contrast 四套语义主题；selector + 即时应用 + `Ctrl+X T`；持久化 `.tsdi-agent/theme.json` 启动恢复。
- **P124 · 会话生命周期命令（G47）**：`/resume`（模糊选择器恢复）/`/archive`（归档 + `/sessions` 过滤）/`/fork [messageId]`/`/side`（临时 fork 父线程保持可见）；gateway `session.set_archived` RPC；fork 归档泄漏 bug 修复。
- **P125 · `/statusline` 可配置状态栏（G48）**：status panel 字段化（model/context/git-branch/tokens/session/workspace/agent）；`/statusline [list|set|unset]` 持久化 `.tsdi-agent/statusline.json`。
- **P126 · 命令簇补齐（G49）**：`/hooks` `/memories` `/fast` `/personality` `/debug-config` `/experimental` `/feedback` `/ide`（AGENT_IDE_BRIDGE）/`/ps` 共 9 条全部注册 `/help`。
- **P127 · TUI 独立配置层（G50）**：`tui.json` schema 化（AgentTuiConfig：theme/keybinds/scrollSpeed/mouse/attentionSound/leaderTimeout）；合并优先级 CLI > env（`TSDI_AGENT_TUI_*`）> tui.json > 默认；agent-cli `resolveCliTuiConfig` 映射进 console options。

### v5 TUI 打磨落地（G51–G78，P128+ 已完成项）

- **P128 · G54 · 运行中 steer + Tab 排队双模式（2026-08 落地）**：Enter = 注入指令到运行中 turn（steer，`kind: 'steer'`，复用中断/续答流水线）；Tab = 排队 follow-up（queueDraft，P121 FIFO）；`ui.steerMode` 可关；浏览器/TUI 共用 resolver。验证：agent-ui 483 passing EXIT=0 + tsc clean。锚点：`agent-ui/src/AgentConsoleComponent.ts`（submit/queueDraft）、`AgentConsoleSessionState.ts`。
- **P140 · G62 · thinking/reasoning 显隐切换（2026-08 落地）**：`/thinking` 命令 + `Ctrl+X T` 键位切换 reasoning 块显隐；`isDisplayMessage` 按 `uiEventType === 'reasoning'` 过滤；`showThinking` 默认 true；与 `/theme` 冲突处理——theme 移 `Ctrl+X Shift+T`（TUI 大写→`shift+<lower>` + 浏览器 shiftKey 端到端）。验证：agent-ui 488 passing EXIT=0 + tsc clean。锚点：`agent-ui/src/AgentConsoleKeymap.ts`、`AgentConsoleSessionState.ts`、`AgentConsoleComponent.ts`、`AgentConsolePanels.ts`、`view-model.spec.ts`。
- **P141 · G65 · tui.json 增强字段（2026-08 落地）**：`diff_style`（auto/stacked）、`cursor`（style/blinking）、`scroll_acceleration`、`attention` 扩展（notifications/sound_pack/volume/custom sounds，桌面通知仅终端失焦时）；AgentTuiConfig schema + merge + 校验扩展，兼容既有字段。验证：tui-config.spec.ts EXIT=0 + tsc clean。锚点：`agent-ui/src/AgentTuiConfig.ts`、`AgentUiConfigReader.ts`。
- **P129 · G53 · 外部编辑器撰写长 prompt（2026-08 落地）**：`/editor` 命令（agent-cli 注册 `Ctrl+G`）+ `OPEN_IN_EDITOR` 桥；agent-cli spawn 外部编辑器（$VISUAL/$EDITOR/vim/nano/code 探测，临时文件 → 读回 composer），agent-ui 仅暴露 `AgentEditorBridge` 接口 + 无 host 时 notify，不引用 node API。验证：editor.spec.ts 6 用例 + agent-ui 520 passing EXIT=0 + tsc clean。锚点：`agent-ui/src/AgentEditorBridge.ts`（新增）、`AgentConsoleComponent.ts`（/editor）、`agent-cli/src/run-console.ts`（spawn）。
- **P130 · G55+G70 · Esc,Esc 编辑上一条消息 + 上下文分支（2026-08 落地）**：空闲态 Esc,Esc（400ms 窗口）进入编辑最后一条用户消息，编辑中 Esc 取消恢复草稿、Esc,Esc 连续回退上一条（首条边界提示）；steer 用户消息跳过、`[Mention Context]` 前缀剥离、图片 parts 还原为 pendingAttachments；提交编辑时若已产生后续轮次 → `forkSession(source, 上一条 id)` 创建 contextual branch（首条编辑走 `ensureSession()` 开新会话），复用 P77 fork + 编辑态输入 `/cmd` 不触发分支；`EDIT_ESCAPE_WINDOW_MS`。验证：edit-message.spec.ts 12 用例 + agent-ui 520 passing EXIT=0 + tsc clean。锚点：`agent-ui/src/AgentConsoleComponent.ts`（handleIdleEscape/enterEditMode/startEditTarget/dismissEditMode/submit fork 块）、`AgentConsoleKeymap.ts`（escape: 'interrupt-turn' 空闲态回落）。
- **P131 · G52 · `/raw` 原始滚动模式（2026-08 落地）**：`/raw` 命令（on/off/无参 toggle）切换消息区为原始文本渲染——`renderAgentConsoleMessageItem` 在 raw 上下文对全部 templateKind 走 `renderAgentConsolePlainTextLines(content, { compactBlankLines: false })`（保留 `**bold**`、`- item` 等字面量），`resolveMessageDisplayContent` raw 时绕过 summarizeToolDisplayText 输出工具全量内容 + attachmentSummary；`AgentConsolePanels.renderedMessageItems` raw 时跳过截断/折叠；`ui.rawMode` 持久化（AgentTuiConfig normalize/merge + `.tsdi-agent/raw-mode.json`，`AgentConsoleRawModeStore` 仿 KeymapStore）；tui.json 文件层经 resolveCliTuiConfig 自动生效。验证：raw-mode.spec.ts 12 用例 + agent-ui 532 passing EXIT=0 + agent/agent-cli/agent-ui tsc clean。锚点：`agent-ui/src/AgentConsoleRawMode.ts`（新增）、`AgentConsoleMessageRenderers.ts`、`AgentConsoleComponent.ts`（runRawModeCommand/restoreRawMode）、`AgentConsolePanels.ts`、`AgentTuiConfig.ts`、`agent/src/options.ts`、`agent-cli/src/run-console.ts`。
- **P132 · G64 · 草稿 stash（2026-08 落地）**：`/stash` 命令（verb 风格，仿 runStatuslineCommand）——`list`（无参默认 list，列出命名 stash 及字符数）、`push <name>`/`save <name>`（存当前草稿 `state.input`，空草稿 notify，缺省名 `default`）、`pop <name>`/`restore <name>`（`state.updateDraft` 恢复草稿并删除条目）、`rm <name>`/`drop <name>`/`delete <name>`（删除条目）；`AgentConsoleStashStore` 跨会话持久化 `.tsdi-agent/stash.json`（`{version:1, stashes}`，load/save 过滤空名/空文本，FileAdapter 可空回退）；help 条目 + commandHints 同步。验证：stash.spec.ts 11 用例 + agent-ui 543 passing EXIT=0 + agent/agent-cli/agent-ui tsc clean。锚点：`agent-ui/src/AgentConsoleStash.ts`（新增）、`AgentConsoleComponent.ts`（runStashCommand/`/stash` dispatch/param #28/onInit）、`AgentConsoleSessionState.ts`（commandHints）、`agent-ui.module.ts`。

### 回归基线

截至 P127（2026-08-14 复验）：十包 **1938 passing 全部 EXIT=0**（agent 735 / agent-gateway 230 / agent-ui 478 / agent-cli 66 / agent-vscode 7 / agent-tools 323 / agent-channels 59 / agent-providers 13 / agent-ssh 8 / agent-desktop 19）；跨包共享渲染层 core 130 / components 126 / components/console 72 passing；十包 `tsc --noEmit` clean；agent-ui build:web、agent-vscode build（联动 Web bundle 3.2MB）、agent-cli build 全部通过。

---

## 差距分析 v5（vs Codex v0.145 / opencode 2026-07，TUI 细节专项，2026-08-14）

### 结论

G1–G50 已全部闭环（见「已实现功能」）。v5 对照 **codex v0.128–0.145**（release notes / 官方 slash-commands 文档 / 社区 TUI 参考）与 **opencode 2026-07**（docs：keybinds/tui/commands）逐项核对本 TUI（~70 命令、13 全局键位、vim 模式、tui.json 配置层）后确认：**功能面已基本对齐甚至超出（工具广度、审批、可观测、多代理、循证验证），但 TUI 的"输入层双模（steer/queue）"、"键位体系深度（上下文分域）"、"展示与配置面（终端标题/thinking 显隐/设置对话框/健康 popover）"、"命令面闭环（/share、/skills、/mcp、/plugins）"四个交互维度仍有真实差距**。

### 对照基准速览（codex/opencode 的 TUI 交互面）

- **codex v0.128–0.145**：7 上下文键位（global/chat/composer/editor/pager/list/approval）+ `/keymap` 持久化 `[tui.keymap]`；Enter=steer（运行中注入指令）、Tab=排队 follow-up；Esc,Esc 编辑上一条消息；Ctrl+G 外部编辑器（$VISUAL/$EDITOR）；Ctrl+R 历史搜索；`/raw` 原始滚动模式；`/title` 终端窗口/标签标题（含 action_required_prefix）；`/statusline`；`/theme`；`/pets`；plan-mode 草稿提示；编辑早期消息自动分支（v0.142.5）；Tab 排队 slash 命令；响应式 markdown 表格 + 增量渲染 + resize reflow；active-turn `/statusline`/`/title`；`/goal` 持久工作流；`/agent`/`/subagents` 线程切换；`/apps` connectors；`/approve` 重试自动评审拒绝；paginated thread history（v0.142.5）。
- **opencode 2026-07**：~180 键位（tui.json keybinds，leader ctrl+x + leader_timeout）；模型收藏（ctrl+f）/最近循环（f2）/变体循环（ctrl+t）；agent 循环（tab）+ 子代理线程键盘导航（child=↓/cycle=→←/parent=↑）；thinking 显隐（ctrl+x t）；消息导航（page up/down、first/last、last-user）；会话时间线（ctrl+x g）；undo/redo（ctrl+x u/r，含文件变更回滚）；/share + unshare；/export（ctrl+x x 打开 $EDITOR）；/editor；命令面板（ctrl+p）；which-key（ctrl+alt+k）；设置对话框（general/keybinds/providers 多 tab + 键位录制冲突检测）；StatusPopover（server/MCP/LSP 健康）；tui.json 扩展字段（diff_style auto/stacked、cursor style/blinking、scroll_speed/scroll_acceleration、mouse、attention 通知+声音包+自定义音效+音量）；username 显示开关；时间戳/泛化工具输出显隐；草稿 stash；`!` shell 模式（输出进对话）。

### 本项目优势（保持并强化）

1. **循证验证螺旋**（evidence-ledger / verification-gate / weakness-miner / harness-profile + falsify-rate 路由 + LSP 诊断证据 P67 + AGENTS 规则草案 P78）：codex/opencode 均无系统化「工具证据 → 声明 vs 实际 → 伪造率 → 修复提示」闭环，这是最独到的差异化主线。
2. **多代理编排深度**：delegation graph tree/lineage 持久化、worker 自动分类、thread 终态回写、thread 级 todo/review 聚合、coding_task 结构化编排、worker-class 路由、每-turn 委派三态（P108）——比 opencode task tool 与 codex subagent 更结构化、可审计。
3. **上下文压缩严谨性**：anchor 保留 + 五字段 summary schema + 质量评分 + 压缩历史观测 + overflow replay/媒体占位（P68）——比 opencode 摘要压缩更可度量、可回归。
4. **审批流 + 补偿/回滚完备性**：granular 类别 + expiry/FIFO/防御清扫 + 审计落库 + LIFO 补偿 + 文件快照 undo/redo + Git step 快照 revert/unrevert（P71）。
5. **可观测性覆盖**：turn diagnostics / summary quality / compaction history / delegation / audit 全部持久化并暴露 HTTP + RPC + UI 三层。
6. **覆盖面**：40+ 工具组、11 个 IM 渠道、MCP 三形态 + OAuth + server、skills 本地 + 远程市场 + 插件（1.0.0 标准）、hooks 双形态、gateway 多协议 + OpenAPI。
7. **跨平台响应式 UI 架构**：TUI/浏览器/VS Code webview/Electron 四端共用响应式渲染层（数据驱动、无定时器、时间派生动画），跨平台约束沉淀至根 AGENTS.md。
8. **TUI 功能密度**：~70 命令 / ~20 面板 / vim / Ctrl+X leader / Ctrl+P 面板 / `/compact` `/diff` `/theme` `/keymap` `/resume` `/archive` `/fork` `/side` `/statusline` `/hooks` `/memories` `/fast` `/personality` `/debug-config` `/experimental` `/feedback` `/ide` `/ps` `/voice` `/review` `/goal` `/usage` `/sections` `/threads` `/delegation` 等已覆盖 codex/opencode 绝大多数命令面。

### 差距明细表（v5 新增 G51–G78）

| # | 差距 | 对照对象 | 现状证据 | 影响 |
|---|---|---|---|---|
| G51 | 终端窗口/标签标题配置（`/title`） | codex `/title`：project/status/thread/branch/model/task progress 字段 + `action_required_prefix` | 本 TUI `/title` 仅会话标题重命名（AgentConsoleComponent.ts:4608），无终端标题更新 | 中：多会话/多 pane 辨识、审批等待可见性 |
| ✅ G52 | raw scrollback 模式（`/raw`） | codex `/raw` 切换原始滚动区便于终端选择/复制 | 已实现（P131）：`/raw` on/off/toggle 切换原始文本渲染（保留 markdown 字面量 + 工具全量输出），`ui.rawMode` 持久化 | 低-中：长输出复制体验 |
| ✅ G53 | 外部编辑器撰写长 prompt（Ctrl+G / `/editor`） | codex Ctrl+G（$VISUAL/$EDITOR）；opencode `/editor`（ctrl+x e） | 已实现（P129）：`/editor` + `Ctrl+G`，agent-cli spawn $VISUAL/$EDITOR/vim/nano/code，agent-ui `AgentEditorBridge` 桥 | 高：长指令/多行编辑效率 |
| ✅ G54 | 运行中 steer + Tab 排队双模式 | codex Enter=steer（注入新指令到运行中 turn）、Tab=queue 下一 turn | 已实现（P128）：Enter=steer 注入 + Tab=queueDraft 排队，`ui.steerMode` 可关 | 高：运行中纠正能力（codex 核心交互） |
| ✅ G55 | Esc,Esc 编辑上一条消息 | codex Esc,Esc 回退编辑 previous message（可连续回退） | 已实现（P130）：空闲态 Esc,Esc 进入编辑最后用户消息，Esc,Esc 连续回退 | 中：快速修正 |
| G56 | 上下文分域键位（global/composer/list/approval/pager） | codex 7 context keymap + 覆盖/解绑；opencode 全量 keybinds + 冲突检测 | `/keymap` 仅 global+vim 双域（AgentConsoleKeymap.ts） | 中：键位体系深度、tmux 冲突规避 |
| G57 | 模型收藏/最近循环/变体循环 | opencode model_favorite_toggle ctrl+f、model_cycle_recent f2、variant_cycle ctrl+t（reasoning effort 档位循环） | `/model` 选择器存在，无收藏/最近循环/变体循环 | 中：模型切换效率（fast/strong 场景） |
| G58 | 子代理线程键盘导航 | opencode session_child_first=↓、child_cycle=→/←、parent=↑ | 委派线程仅 `/threads` 命令，无消息视图键盘导航 | 中：多代理结果审查 |
| G59 | which-key 提示系统 | opencode which_key_toggle ctrl+alt+k（按住显示键位） | 无 | 低：键位发现性 |
| G60 | 统一设置对话框（general/keybinds/providers） | opencode DialogSettings 多 tab + 键位录制 + 冲突检测 + 重置 | 配置散落 `/keymap` `/debug-config` `/theme` `/statusline` 等命令 | 中：配置 UX |
| G61 | 连接/MCP/LSP 健康 StatusPopover | opencode StatusPopover（server/MCP/LSP 实时健康） | `/status` 文本展示，无实时健康 popover | 低-中 |
| ✅ G62 | thinking/reasoning 显隐切换 | opencode ctrl+x t 显隐 reasoning 块；codex 显式 reasoning 选择 | 已实现（P140）：`/thinking` + `Ctrl+X T` 过滤 reasoning；theme 移 `Ctrl+X Shift+T` | 中：模型可解释性 |
| G63 | 消息导航键（page up/down、first/last、last-user） | opencode messages_page_up/page_down/first/last/last_user | 无 | 中：长会话定位 |
| ✅ G64 | 草稿 stash（暂存 prompt） | opencode prompt_stash / prompt_stash_pop / prompt_stash_list | 已实现（P132）：`/stash` list/push/pop/rm verb 命令，命名暂存草稿跨会话持久化 `.tsdi-agent/stash.json` | 低 |
| ✅ G65 | tui.json 增强字段 | opencode tui.json：diff_style（auto/stacked）、cursor（style/blinking）、scroll_speed/scroll_acceleration、attention（notifications/sound_pack/volume/custom sounds） | 已实现（P141）：diffStyle/cursor/scrollAcceleration/attention 扩展，兼容既有字段 | 中：终端适配性 |
| G66 | 会话分享 TUI 命令（`/share`） | opencode `/share` + unshare（复制 URL） | P86 网关分享仅 REST/RPC + Web 宿主，无 TUI 命令 | 中：协作闭环 |
| G67 | `/skills` `/mcp` `/plugins` 浏览命令 | codex `/skills`（浏览使用）、`/mcp`（列出工具）、`/plugins`（市场浏览）；opencode MCP/插件面板 | 有 `@` mention skills/plugins 与 `/tools`，无独立浏览命令 | 中 |
| G68 | `/approve` 重试自动评审拒绝 | codex `/approve`：批准一次对近期自动评审拒绝的 retry | `/approve`（AgentConsoleComponent.ts:5005）仅审批队列确认，无 retry 语义 | 低-中 |
| G69 | plan 模式草稿提示 | codex 从 composer 草稿推断 plan 意图并提示 `/plan` | `/plan` + archetype 已有，无草稿检测提示 | 低 |
| ✅ G70 | 编辑早期消息上下文分支 | codex v0.142.5：编辑 earlier prompt 创建 contextual branch，保留原对话/附件/mention 绑定 | 已实现（P130）：提交编辑时后续轮次存在 → forkSession 建 contextual branch，首条编辑开新会话 | 中 |
| G71 | 队列化 slash 命令（Tab 排队 `/cmd`） | codex：运行中 Tab 排队 slash 命令，turn 结束后解析执行 | P121 排队普通 prompt，slash 命令未纳入队列 | 低 |
| G72 | `/apps` connectors 生态命令面 | codex `/apps`（connectors 浏览 + `$app` 插入） | 无 | 中（生态） |
| G73 | 时间戳/泛化工具输出显隐切换 | opencode session_toggle_timestamps / session_toggle_generic_tool_output | `/toolruns` 面板已有，无显隐开关 | 低 |
| G74 | 用户名显示开关 + 会话时间线 | opencode username toggle（命令面板）/ session_timeline（ctrl+x g） | 无 | 低 |
| G75 | 云任务执行面（daemon/remote-control） | codex cloud / codex apply / codex remote-control daemon；opencode serve+attach + password auth | 有本地 gateway + Web console + `/rpc/stream`，无云端执行/任务队列/daemon | 中-高（远期候选） |
| G76 | mDNS 服务发现 | opencode `--mdns` / `--mdns-domain` | 无 | 低 |
| G77 | ACP（Agent Client Protocol）客户端 | opencode `acp`（跨客户端协议） | 无 | 中（生态） |
| G78 | 分层持久记忆（跨会话召回 + 管理 UI） | codex v0.142.5 memories（paginated thread history + persisted names + memories） | 有语义记忆检索（P73）+ `/memories` 注入开关 + 项目记忆闭环（P78），无跨会话持久记忆库与显式管理面 | 中 |

> 已对齐不列为差距：`@` mention（files/skills/plugins 统一候选 P116）、`!` shell 前缀（P119）、`/compact` `/diff` `/theme` `/keymap` `/resume` `/archive` `/fork` `/side` `/statusline` `/hooks` `/memories` `/fast` `/personality` `/debug-config` `/experimental` `/feedback` `/ide` `/ps` `/goal` `/usage` `/review` `/permissions` `/status` `/undo` `/redo` `/copy` `/export` `/search` `/sections` `/threads` `/voice`（实时双向语音）、Enter 队列（P121）、Esc 中断（P121）、tui.json 配置层（P127，字段待补 G65）、leader + 命令面板（P120）。

## 打磨计划（P128+）

> 约定：`Pnn-前缀` 对应差距编号（G51–G78，TUI 细节专项 + 平台生态）。每项完成后把内容移入「已实现功能」并更新差距表为 ✅。优先级：高 = codex/opencode 核心交互缺失，直接影响日常效率；中 = 体验/生态增益；低 = 锦上添花。

### 批次 A · 输入层与消息编辑（P128–P132）

- ~~**P129 · G53 · 外部编辑器撰写长 prompt（高）**~~ ✅ 已完成：`/editor` + `Ctrl+G` 经 $VISUAL/$EDITOR/vim/nano/code 拉起外部编辑器（agent-cli spawn），agent-ui 仅暴露 `AgentEditorBridge` 桥 + `OPEN_IN_EDITOR`，无 node API 守卫。落地：`agent-ui/src/AgentEditorBridge.ts`（新增）、`AgentConsoleComponent.ts`、`agent-cli/src/run-console.ts`；测试 `test/editor.spec.ts`，agent-ui 520 passing EXIT=0。
- ~~**P130 · G55+G70 · Esc,Esc 编辑上一条消息 + 上下文分支（中）**~~ ✅ 已完成：空闲态 Esc,Esc（400ms 窗口）进入编辑最后用户消息、可连续回退；提交编辑有后续轮次 → forkSession contextual branch、首条编辑开新会话。落地：`agent-ui/src/AgentConsoleComponent.ts`（handleIdleEscape/startEditTarget/dismissEditMode/submit fork 块）、`AgentConsoleKeymap.ts`；测试 `test/edit-message.spec.ts`（12 用例），agent-ui 520 passing EXIT=0。
- ~~**P131 · G52 · `/raw` 原始滚动模式（低-中）**~~ ✅ 已完成：`/raw` on/off/toggle 切换消息区为原始文本渲染（保留 markdown 字面量、工具全量输出），`ui.rawMode` 持久化 `.tsdi-agent/raw-mode.json`。落地：`agent-ui/src/AgentConsoleRawMode.ts`（新增）、`AgentConsoleMessageRenderers.ts`、`AgentConsoleComponent.ts`（runRawModeCommand/restoreRawMode）、`AgentConsolePanels.ts`、`AgentTuiConfig.ts`、`agent/src/options.ts`、`agent-cli/src/run-console.ts`；测试 `test/raw-mode.spec.ts`（12 用例），agent-ui 532 passing EXIT=0。
- ~~**P132 · G64 · 草稿 stash（低）**~~ ✅ 已完成：`/stash` 命令（list/push/pop/rm verb 风格，缺省名 default）+ `AgentConsoleStashStore` 跨会话持久化 `.tsdi-agent/stash.json`。落地：`agent-ui/src/AgentConsoleStash.ts`（新增）、`AgentConsoleComponent.ts`（runStashCommand/`/stash` dispatch/help/param #28/onInit）、`AgentConsoleSessionState.ts`（commandHints）、`agent-ui.module.ts`；测试 `test/stash.spec.ts`（11 用例），agent-ui 543 passing EXIT=0 + tsc clean。

### 批次 B · 键位与导航（P133–P138）

- **P133 · G56 · 上下文分域键位（中）**：keymap 从 global/vim 双域扩展为 global/composer/list/approval/pager 上下文（覆盖优先于全局、空绑定解绑）；`/keymap` 交互支持选上下文 + 录制 + 冲突检测；持久化 schema 升级（兼容 v1 `keymap.json`）。锚点：`agent-ui/src/AgentConsoleKeymap.ts`、`AgentTuiConfig.ts`。
- **P134 · G58 · 子代理线程键盘导航（中）**：消息视图内 `↓` 进首个子线程、`→`/`←` 兄弟线程切换、`↑` 回父线程（对齐 opencode child/cycle/parent）；经 `AgentConsoleSessionService` 加载对应 thread 转录。锚点：`agent-ui/src/AgentConsoleKeymap.ts`、`AgentConsoleSessionService.ts`。
- **P135 · G63 · 消息导航键（中）**：pageup/pagedown、first/last、last-user 消息跳转（openkeybind 等价）；复用 `loadSessionPage`/`mergeMessagesPage` 增量加载。锚点：`agent-ui/src/AgentConsoleComponent.ts`。
- **P136 · G57 · 模型收藏/最近循环/变体循环（中）**：模型收藏（ctrl+f）+ 最近使用循环（f2/shift+f2）+ 变体循环（ctrl+t 循环 reasoning effort 档位，复用 P103 透传）；收藏持久化 `.tsdi-agent/models.json`。锚点：`agent-ui/src/AgentConsoleKeymap.ts`、`AgentConsoleComponent.ts`（/model）。
- **P137 · G59 · which-key 提示（低）**：按住 leader 或 `Ctrl+Alt+K` 弹出当前上下文可用键位提示层（数据来自 AgentConsoleKeymap.effectiveBindings）。锚点：`agent-ui/src/AgentConsoleKeymap.ts`、`AgentConsolePanels.ts`。
- **P138 · G71 · 队列化 slash 命令（低）**：运行中 `Tab` 排队的输入若以 `/` 开头则标记为 next-turn 命令，当前 turn 结束后按命令解析执行（复用 P121 FIFO 队列 + 命令分发）。锚点：`agent-ui/src/AgentConsoleComponent.ts`。

### 批次 C · 展示与配置（P139–P144）

- ~~**P139 · G51 · 终端窗口/标签标题 `/title`（中）**~~ ✅ 已完成：`/title` 配置窗口标题字段（project/status/thread/branch/model/context/task，`list/set/unset` 动词，遗留裸文本会话重命名保留），运行状态更新（含 approval 等待 `action_required` 前缀）；跨浏览器（document.title）/TUI（OSC 0 转义序列）双实现 + `ui.terminalTitle`/`tui.terminalTitle` 关闭开关（默认 true）；持久化 `.tsdi-agent/title.json`。落地：`agent-ui/src/AgentConsoleTitle.ts`（新增）、`AgentConsoleComponent.ts`、`AgentConsoleSessionState.ts`、`AgentTuiConfig.ts`、`agent/src/options.ts`、`agent-cli/src/run-console.ts`；测试 `test/title.spec.ts` + tui-config.spec.ts，agent-ui 502 passing EXIT=0。
- **P142 · G60 · 统一设置对话框（中）**：`/settings` 命令打开多 tab 设置面板（general：theme/language/fonts/shell；keybinds：录制 + 冲突检测 + 重置；providers：模型/provider 管理）；Web/TUI 共用组件，配置写 `.tsdi-agent/settings.json` + tui.json。锚点：`agent-ui/src/AgentConsoleComponent.ts`、`AgentConsolePanels.ts`。
- **P143 · G61 · 连接/MCP/LSP 健康 StatusPopover（低-中）**：status 面板 hover/键位弹出实时健康（gateway 连接、MCP server 状态、LSP server 状态），数据源复用 `/status` 与 tools/mcp 状态。锚点：`agent-ui/src/AgentConsolePanels.ts`、`agent-ui/src/AgentConsoleSessionState.ts`。
- **P144 · G73+G74 · 显示开关簇（低）**：时间戳显隐、泛化工具输出显隐（`/toolruns` 面板联动）、用户名显示开关、会话时间线（`Ctrl+X G` 消息级 timeline 视图）；全部经命令面板/设置持久化。锚点：`agent-ui/src/AgentConsoleMessageRenderers.ts`、`AgentConsolePanels.ts`。

### 批次 D · 命令面闭环（P145–P149）

- **P145 · G66 · `/share` 会话分享命令（中）**：`/share` 生成脱敏分享链接（复用 P86 SessionShareHandler）+ `/unshare` 撤销；分享面板展示 token/过期/撤销，Web 宿主一键复制。锚点：`agent-ui/src/AgentConsoleComponent.ts`、`agent-gateway/src/api/SessionShareHandler.ts`。
- **P146 · G67 · `/skills` `/mcp` `/plugins` 浏览命令（中）**：`/skills`（浏览/激活/停用本地+远程技能）、`/mcp`（列出 MCP server 与工具，verbose 显示 server 详情，复用 P95 negotiatedVersion）、`/plugins`（浏览已装插件与市场，复用 P111 标准信息）；与 `@` mention 候选共用数据源。锚点：`agent-ui/src/AgentConsoleComponent.ts`、`agent-tools/skills/`、`agent-tools/mcp/`。
- **P147 · G68 · `/approve` 重试自动评审拒绝（低-中）**：`/approve` 对最近一次 auto-review 拒绝的 action 批准单次 retry（区别于审批队列确认）；联动 verification-gate 判定记录。锚点：`agent-ui/src/AgentConsoleComponent.ts`（/approvals）、`agent/src/harness/VerificationGate.ts`。
- **P148 · G69 · plan 模式草稿提示（低）**：composer 草稿检测 plan 意图（「plan/方案/设计/先不要改」等启发式 + 长度阈值）→ 状态栏/输入区提示 `/plan`；`ui.planNudges: false` 关闭。锚点：`agent-ui/src/AgentConsoleComponent.ts`。
- **P149 · G72 · `/apps` connectors 生态命令面（中）**：connectors 目录（内置 GitHub/GitLab/IM 等模板）→ 浏览 + `$app` 插入 prompt + 授权状态展示（复用 agent-channels 生态）。锚点：`agent-ui/src/AgentConsoleComponent.ts`、`agent-channels/`。

### 批次 E · 平台与生态（P150–P153，远期排期）

- **P150 · G75 · 云任务执行面（中-高）**：gateway 增加任务队列/daemon（`remote-control` 语义：headless 会话 + 任务提交/轮询/取消 + `codex apply` 等价的结果取回），CLI `cloud run`/`cloud list`/`cloud apply`；与 P90 `/rpc/stream`、P115 desktop handoff 同构。锚点：`agent-gateway/src/`、`agent-cli/src/`。
- **P151 · G76 · mDNS 服务发现（低）**：gateway 启动广播 mDNS（service type 可配），CLI `--mdns`/`--mdns-domain` 发现局域网 gateway 并 `attach`。锚点：`agent-gateway/src/gateway/GatewayServer.ts`、`agent-cli/src/run-console.ts`。
- **P152 · G77 · ACP 客户端（中）**：实现 ACP（Agent Client Protocol）客户端适配层，作为既有 runtime 的薄协议桥（面向兼容 ACP 的宿主/编辑器）。锚点：`agent/` 新增 adapter。
- **P153 · G78 · 分层持久记忆（中）**：项目级持久记忆库（跨会话写入/召回，复用 P73 semantic 检索 + P78 规则草案管道）、记忆管理面（`/memories list/add/remove`，展示已注入记忆）、记忆 freshness/冲突策略。锚点：`agent/src/memory/`、`agent-ui/src/AgentConsoleComponent.ts`。

## 剩余（远期，未排期）

- **移动 remote（G21 余量）**：远程传输层（P90）、Web console 宿主（P91）、浏览器安全边界（P92）、VS Code 扩展（P93）、Electron 桌面壳（P110）已就绪，剩余为移动端宿主工程（iOS/Android WebView 或 PWA），暂不排期。
- **GitHub/GitLab 应用集成**（Codex GitHub Action、GitHub 集成、隐藏自动化 agent、Codex Jobs 云端触发）—— 依赖平台 OAuth；部分与 P149 `/apps` / P150 云任务衔接，仍不排期。

## 已完成（历史）

P0–P127 全部打磨条目均已落地并并入「已实现功能」（含 P34/P35 Tier1/Tier2 与 A/B 面、P42–P45 规划项、P62–P66 agent-ui 渲染性能、G1–G50 全差距）。逐条回归记录（含每次全量测试通过数与锚点验证）见 git history 中各 P 段；最近一次全量基线：十包 1938 passing EXIT=0（2026-08-14）。自 P128 起为 v5（G51–G78）新一轮打磨。
