# Agents 后续打磨清单

## 功能总纲

主干能力已齐（2026-08 对比 Codex / opencode 口径）：turn 循环（run/streaming）、多模型适配（Echo/Anthropic/OpenAI/Routed + profiles + complexity 路由 + worker-class 路由 + 命令级 profile + retry-after 分类退避）、prompt cache 支持（请求侧 cache_control + 系统提示静态段前置）、上下文压缩 + 重放（overflow 克隆最后用户消息 / 主动 continue 提示 + 媒体占位符）、turn diagnostics（store/aggregate/trend）、补偿/回滚（LIFO + 审计 + 文件快照 undo/redo）、Git step 快照 + 消息级 revert/unrevert + 会话 diff、审批流（自动评审 / granular 类别 + 网络目的地放行 / expiry/FIFO/防御清扫/审计落库）、sandbox 策略矩阵（capability 级 + OS 级 sandbox-exec + 会话级运行时切换 + Windows 原生宿主）、40+ 工具组（files/git/terminal/browser 轻量 + playwright/web/http/memory/skills/mcp/scheduling/cron/kanban/knowledge/media/audio/capture/code-execution/process/security/communication/sessions/project/data/backup/pipeline/poll/approval/ai-cli/lsp/ssh/coding 等）、LSP 诊断反馈闭环（编辑后 didChange → 拉诊断 → 证据注入）、MCP stdio + Streamable HTTP client + OAuth + server tool + 断线重连、skills 系统（本地注册表/目录/turn interceptor/激活提示 + 远程市场）、Agent Plugins（manifest/skills/MCP/hooks 捆绑 + 市场目录 + 1.0.0 标准兼容）、声明式 agent 原型（plan/build/review + 工具门控）、语义记忆检索（embedding + 三模式降级）、自动标题/摘要、会话 fork（branch 血缘继承）+ pin/unpin + title + delete + archive + resume、编排（parallel_spawn/spawn_agent/llm_task/coding_task + delegation graph tree/lineage + worker 自动分类 + thread 级工件聚合 + 子任务加密 + per-agent 权限 + 每-turn 委派模式）、可观测（audit/stats/compaction-history/summary-quality/turn-diagnostics/delegation/usage + evidence-ledger/verification-gate/weakness-miner/harness-profile 循证螺旋 + dashboard digests + AGENTS 规则草案生成）、hooks 系统（before/afterTurn、before/afterTool、onApproval、pre/post-compaction，命令 + 进程内函数双形态）、gateway（JSON-RPC + HTTP + SSE + NDJSON 流 + WS + owner 鉴权 + InMemory/TypeOrm 持久化 + OpenAPI 3.1 文档 + 会话分享 + usage 时间聚合 + token 预算）、console TUI（~20 面板 / ~70 命令 / vim mode / Ctrl+X leader + Ctrl+P 面板 / review hunk 折叠 + side-by-side / ssh 远程 shell / 实时双向语音 / 主题 / workspace mentions / tui.json 配置层）、CLI（chat/run 一次性/rpc-stdio/tools list/doctor/completion/update/import/trust/desktop + fast/strong 自适应配置）、多代理 v2（per-spawn profile/reasoning/concurrency + delegation graph tree/lineage + worker 自动分类 + thread 级工件聚合 + 子任务加密 + per-agent 权限 + 每-turn 委派模式）、PWA 移动宿主、ACP 客户端、mDNS 服务发现、云任务执行面、分层持久记忆、项目记忆闭环、which-key 提示 + 统一设置对话框 + 健康 popover + 消息导航键 + 子代理线程导航 + 模型收藏/最近/变体循环 + thinking 显隐 + 时间戳/tool output/用户名显隐 + plan 草稿提示 + connectors 生态 + approve retry + raw 模式 + 草稿 stash + 手动压缩 + ! shell 执行 + 外部编辑器 + 消息编辑分支 + 队列化 slash 命令 + PDF 附件 + auto-approve + half-page/line 滚动 + which-key 布局/过滤/分页。

> v5 差距（G51–G78，2026-08-14）聚焦 **TUI 交互细节**（对照 codex v0.128–0.145 / opencode 2026-07 的键位、输入修饰符、展示与配置面），已全部闭环。

## 已实现功能（P0–P162 全量，2026-08-17 盘点）

> 早期打磨（P0–P66）逐条回归记录见 git history；P67–P162 按方向归类如下（锚点仅列关键文件，均为当前代码中已核实的实现）。

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

### TUI 交互专项（G41–G78，P118–P153）

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
- **P128 · G54 · 运行中 steer + Tab 排队双模式**：Enter = 注入指令到运行中 turn（steer，`kind: 'steer'`）；Tab = 排队 follow-up（queueDraft）；`ui.steerMode` 可关；浏览器/TUI 共用。锚点：`AgentConsoleComponent.ts`、`AgentConsoleSessionState.ts`。
- **P129 · G53 · 外部编辑器撰写长 prompt**：`/editor` + `Ctrl+G`（$VISUAL/$EDITOR/vim/nano/code）；agent-cli spawn 外部编辑器，agent-ui `AgentEditorBridge` 桥。锚点：`AgentEditorBridge.ts`、`AgentConsoleComponent.ts`、`agent-cli/src/run-console.ts`。
- **P130 · G55+G70 · Esc,Esc 编辑上一条消息 + 上下文分支**：空闲态 Esc,Esc 进入编辑最后用户消息、连续回退；提交编辑有后续轮次 → forkSession contextual branch。锚点：`AgentConsoleComponent.ts`、`AgentConsoleKeymap.ts`。
- **P131 · G52 · `/raw` 原始滚动模式**：`/raw` on/off/toggle 切换原始文本渲染，`ui.rawMode` 持久化。锚点：`AgentConsoleRawMode.ts`、`AgentConsoleMessageRenderers.ts`、`AgentConsoleComponent.ts`。
- **P132 · G64 · 草稿 stash**：`/stash` list/push/pop/rm verb 命令 + `AgentConsoleStashStore` 跨会话持久化 `.tsdi-agent/stash.json`。锚点：`AgentConsoleStash.ts`、`AgentConsoleComponent.ts`。
- **P133 · G56 · 上下文分域键位（5 上下文）**：global/composer/list/approval/pager 分域 + 覆盖/解绑 + 跨上下文冲突检测 + `/keymap` context scope/录制 + schema v2 兼容 v1。锚点：`AgentConsoleKeymap.ts`、`AgentConsoleComponent.ts`。
- **P134 · G58 · 子代理线程键盘导航**：pager 上下文 `↓` 进首子线程、`→`/`←` 兄弟循环、`↑` 回父线程，无目标/无焦点回落消息选择。锚点：`AgentConsoleKeymap.ts`、`AgentConsoleComponent.ts`。
- **P135 · G63 · 消息导航键**：PageUp/PageDown 翻页、Home/End 首/末条、`Shift+G` 跳最后用户消息。锚点：`AgentConsoleKeymap.ts`、`AgentConsoleComponent.ts`、`AgentConsoleSessionState.ts`。
- **P136 · G57 · 模型收藏/最近循环/变体循环**：`Ctrl+F` 收藏切换、`F2`/`Shift+F2` 最近模型循环、`Ctrl+T` reasoning effort 档位循环；持久化 `.tsdi-agent/models.json`。锚点：`AgentConsoleKeymap.ts`、`AgentConsoleModelStore.ts`、`AgentConsoleComponent.ts`。
- **P137 · G59 · which-key 提示系统**：`Ctrl+Alt+K` 切换当前上下文键位提示层，Esc 或任意键关闭并执行。锚点：`AgentConsoleKeymap.ts`、`AgentConsoleSessionState.ts`、`AgentConsoleComponent.ts`、`AgentConsolePanels.ts`。
- **P138 · G71 · 队列化 slash 命令**：运行中 Tab 排队 `/cmd`，turn 结束后 FIFO drain 按命令解析执行。锚点：`AgentConsoleComponent.ts`、`AgentConsoleSessionState.ts`、`AgentConsolePanels.ts`。
- **P139 · G51 · 终端窗口/标签标题 `/title`**：`/title` 配置窗口标题字段 + 运行状态更新 + 跨浏览器（document.title）/TUI（OSC 0）双实现。锚点：`AgentConsoleTitle.ts`、`AgentConsoleComponent.ts`。
- **P140 · G62 · thinking/reasoning 显隐切换**：`/thinking` + `Ctrl+X T` 过滤 reasoning 块。锚点：`AgentConsoleKeymap.ts`、`AgentConsoleSessionState.ts`、`AgentConsoleComponent.ts`、`AgentConsolePanels.ts`。
- **P141 · G65 · tui.json 增强字段**：diffStyle/cursor/scrollAcceleration/attention 扩展。锚点：`AgentTuiConfig.ts`、`AgentUiConfigReader.ts`。
- **P142 · G60 · 统一设置对话框**：`/settings` 多 tab（General/Keybinds/Providers），键位录制 + 冲突检测 + 重置。锚点：`AgentConsoleSettingsStore.ts`、`AgentConsoleComponent.ts`。
- **P143 · G61 · 连接/MCP/LSP 健康 StatusPopover**：`Ctrl+X H` 弹出健康 popover。锚点：`AgentConsoleSessionState.ts`、`AgentConsoleComponent.ts`、`AgentConsoleKeymap.ts`、`AgentConsolePanels.ts`。
- **P144 · G73+G74 · 显示开关簇**：`/display` 时间戳显隐 + `/timeline` 时间线 + `/settings` General Tool output/Username 开关。锚点：`AgentConsoleMessageRenderers.ts`、`AgentConsoleComponent.ts`、`AgentConsoleSessionState.ts`、`AgentConsoleSettingsStore.ts`。
- **P145 · G66 · `/share` 会话分享命令**：`/share` + `/unshare [token]` + 分享面板。锚点：`AgentConsoleComponent.ts`、`AgentConsoleSessionState.ts`、`agent-gateway/src/app-rpc/AppRpcServer.ts`。
- **P146 · G67 · `/skills` `/mcp` `/plugins` 浏览命令**：技能/MCP/插件浏览 + 详情。锚点：`AgentConsoleComponent.ts`、`AgentConsoleSessionState.ts`。
- **P147 · G68 · `/approve` 重试自动评审拒绝**：`/approve retry` 单次重试被 falsification 拒绝的 action。锚点：`AgentConsoleComponent.ts`、`agent-gateway/src/app-rpc/AppRpcServer.ts`。
- **P148 · G69 · plan 模式草稿提示**：草稿命中 plan 意图时提示 `/plan`。锚点：`AgentConsoleSessionState.ts`、`AgentConsolePanels.ts`、`AgentConsoleComponent.ts`。
- **P149 · G72 · `/apps` connectors 生态命令面**：connector catalog 浏览 + `$app` 插入。锚点：`AgentConsoleApps.ts`、`AgentConsoleComponent.ts`、`AgentConsoleSessionState.ts`。
- **P150 · G75 · 云任务执行面**：gateway headless 任务队列 + CLI `cloud run/list/status/cancel/apply`。锚点：`agent-gateway/src/cloud/CloudTaskQueue.ts`、`agent-cli/src/cloud-command.ts`。
- **P151 · G76 · mDNS 服务发现**：gateway DNS-SD 广播 + CLI `attach --mdns`。锚点：`agent-gateway/src/discovery/MdnsServiceDiscovery.ts`。
- **P152 · G77 · ACP 客户端适配层**：JSONL transport 客户端 + 流式 session update + 双向宿主 RPC。锚点：`agent/src/acp/AcpClient.ts`。
- **P153 · G78 · 分层持久记忆**：项目 namespace 隔离 + `/memories` 管理。锚点：`agent/src/memory/ProjectMemoryService.ts`、`AgentMemoryRetriever.ts`。

### v6 TUI 打磨落地（P154–P162，2026-08-17 完成）

- **P154 · G21 余量 · 移动 PWA remote**：Web console 可安装 PWA + manifest + service worker + safe-area 适配。锚点：`agent-ui/web-console.ts`、`web-console-pwa.ts`。
- **P155 · G21 OAuth 宿主边界 · connectors 授权回调**：`/apps <id>` 宿主注入式 `authorizeConnector` 回调。锚点：`AgentConsoleComponent.ts`、`AgentConsoleApps.ts`。
- **P156 · 隐藏自动化 agent**：cloud task headless session 标记 `sessionRole: automation`，默认过滤。锚点：`agent-gateway/src/cloud/CloudTaskQueue.ts`、`AppRpcServer.ts`。
- **P157 · GitHub/GitLab 外部触发幂等底座**：cloud task 增 `source`/`externalId`/有界 metadata，按 principal+source+externalId 去重。锚点：`agent-gateway/src/cloud/CloudTaskQueue.ts`、`agent-cli/src/cloud-command.ts`。
- **P158 · G80 · 半页/逐行滚动**：Shift+Space/Ctrl+D/Ctrl+U 半页滚动 + Ctrl+Y/Ctrl+E 逐行滚动（pager 上下文），4 个 `scroll-half/line-up/down` 动作。锚点：`AgentConsoleKeymap.ts`、`AgentConsoleComponent.ts`、`AgentConsoleSessionState.ts`。
- **P159 · G84 · JSON 导出**：已有 `/export --json`（P86 exportStore.json 模式），无需改动。锚点：`AgentConsoleComponent.ts`（runExportCommand）。
- **P160 · G79 · Auto-approve 会话标记**：`ApprovalManagerOptions.autoApprove` 标记会话 auto-approve，经 approval manager 检查跳过 pending 队列。锚点：`agent/src/approval/ApprovalManager.ts`、`agent/src/runtime/DefaultAgentRuntime.ts`。
- **P161 · G82 · PDF 附件支持**：`PendingAttachment.type` 支持 `pdf`，mimeType `application/pdf`，MIME_MAP/FILE_ICON_MAP/normalizeAttachmentType/ACCEPT_ATTRIBUTE 扩展。锚点：`agent/src/attachments/types.ts`、`agent-ui/src/AgentConsoleComponent.ts`、`agent-tools/src/media/media-tool.ts`、`agent-tools/src/project/project-files.ts`。
- **P162 · G81 · which-key 布局/过滤/分页**：which-key overlay 增加 grouped/compact 布局（`whichKeyLayout` toggle）、custom 过滤（`whichKeyFilterCustom`，L/F 键切换）、group 分页（`whichKeyPage`，n/p 键翻页，25 条/页）。锚点：`AgentConsoleKeymap.ts`（`which-key-layout-toggle` + `which-key-pending-toggle` 动作）、`AgentConsoleSessionState.ts`（`whichKeyLayout`/`whichKeyFilterCustom`/`whichKeyPage` + setters）、`AgentConsoleComponent.ts`（toggleWhichKeyLayout/toggleWhichKeyPendingFilter/navigateWhichKeyPage）、`AgentConsolePanels.ts`（`AgentConsoleWhichKeyPanelComponent` grouped/compact 分支 + 分页渲染）。

---

## v7 已完成（P163–P169，2026-08-18）

- **P163 · G85**：会话快照 UI、Git 快照列表/差异/恢复命令与 gateway RPC 已闭环。
- **P164 · G86**：浏览器端长 markdown 通过可注入 Web Worker 异步解析，TUI/无 Worker 环境同步回退。
- **P165 · G87**：Electron 桌面宿主增加持久化会话标签栏，支持点击切换、关闭、新建及 Ctrl/Cmd+1..9 快捷键；TUI 与浏览器宿主保持原语义。
- **P166 · G88**：MCP `initialize` 的 server instructions 聚合并以有界 system prompt 段自动注入。
- **P167 · G89**：`/settings` Providers 增加 Thinking Level 显式选择器，low/medium/high 与 Ctrl+T、模型请求透传共用状态，并持久化至 workspace settings。
- **P168 · G90**：新增 `/yolo [on|off]` 与 Settings General 开关，动态切换 approval manager auto-approve 并持久化 workspace 状态。
- **P169 · G91**：新增 opt-in MCP code mode adapter，将现有 sandboxed `CodeExecutionAdapter` 暴露为标准 `code_execution` MCP tool descriptor/result，含输入校验和错误状态。

## 差距分析 v7（vs Codex v0.148-alpha.20 / opencode v1.18.18 + desktop v1.17.18，2026-08-18）

> 对照基准从 v0.147（2026-08-13）升级至 codex v0.148-alpha.20 + opencode v1.18.18 + opencode desktop v1.17.18。
>
> Codex 自 v0.147 以来发布多个 alpha 版本（alpha.1-alpha.20），新增：增量 markdown 离主线程渲染、命令输出截断、并发 skill/plugin 发现、远程压缩效率、MCP 非阻塞启动。
>
> OpenCode 自 v1.18.17 以来发布 v1.18.18（bugfix only），desktop 持续迭代至 v1.17.18，新增：session snapshots & revert（含文件变更回滚）、Chrome-style tab 快捷键（mod+1..9）、可拖拽标签、thinking level 选择器、yolo auto-approve 模式、code mode MCP adapter、locale/i18n 扩展（RTL/plural rules）、MCP server instructions 自动注入上下文。

### v7 差距明细（G85–G94）

| # | 差距 | 对照对象 | 本项目现状 | 影响 | 优先级 |
|---|---|---|---|---|---|
| ✅ G85 | **会话快照 & 一键 revert（含文件变更回滚）** | opencode desktop v1.17.11 | 已实现（P163）：快照列表、diff 预览、恢复命令与 gateway RPC | 高 |
| ✅ G86 | **增量 markdown 离主线程渲染** | opencode v1.17.17 | 已实现（P164）：浏览器 Worker + 同步回退 | 中-高 |
| ✅ G87 | **多会话标签页（Chrome-style tab 快捷键）** | opencode desktop v1.17.10 | 已实现（P165）：Electron 标签栏、持久化、点击/关闭/新建、Ctrl/Cmd+1..9 | 中 |
| ✅ G88 | **MCP server instructions 自动注入上下文** | opencode desktop v1.17.10 | 已实现（P166）：initialize instructions 聚合并有界注入 system prompt | 中 |
| ✅ G89 | **Thinking level 选择器（settings UI）** | opencode desktop v1.17.10 | 已实现（P167）：Providers 显式选择器 + Ctrl+T 共用状态 + workspace 持久化 | 中-低 |
| ✅ G90 | **Yolo auto-approve 模式** | opencode desktop v1.17.12 | 已实现（P168）：`/yolo on|off`、Settings toggle、动态 manager 开关与持久化 | 低-中 |
| ✅ G91 | **代码模式 MCP adapter** | opencode desktop v1.17.14 | 已实现（P169）：显式 opt-in adapter 复用 sandboxed CodeExecutionAdapter | 低 |
| G92 | **Locale/i18n 扩展（RTL + 多语言）** | opencode desktop v1.17.10：RTL layout + plural rules + 多语言（ar/he/ja/ko 等） | 无 i18n 框架，所有 UI 文本硬编码英文。desktop 端（Electron）可利用系统 locale，但 TUI/browser 未适配 | 低：国际化需求，当前用户群以英文为主 | 不排期 |
| G93 | **Session progress indicator** | opencode desktop v1.17.10：新 session 进度指示器 | statusline 有 token/context 信息，但无进度条/步骤指示器（长任务的可视化反馈） | 低：UX 锦上添花 | 不排期 |
| G94 | **可拖拽标签页** | opencode desktop v1.17.10：draggable tabs for session reordering | 无标签页概念（G87），拖拽更远期 | 低：桌面端 UX | 不排期 |

### v6 已对齐确认（v0.148-alpha / opencode 1.18 中仍对齐）

G79–G84 已全部闭环（P158–P162）。v5 差距 G51–G78 已全部闭环（P128–P153）。以下能力在最新版本中仍保持对齐：

- Agent Plugins（P106/P111）、sections + paginated history（P107）、MCP 2026-07-28（P95）
- /share（P145）、/compact（P118）、plan mode 提示（P148）、/approve retry（P147）
- /apps connectors（P149）、cloud tasks（P150）、mDNS（P151）、ACP（P152）
- 分层记忆（P153）、which-key 系统（P137 + P162）、设置对话框（P142）
- PDF 附件（P161）、auto-approve（P160）、half-page/line 滚动（P158）

### 本项目优势（保持并强化）

1. **循证验证螺旋**（evidence-ledger / verification-gate / weakness-miner / harness-profile + falsify-rate 路由 + LSP 诊断证据 P67 + AGENTS 规则草案 P78）：codex/opencode 均无系统化「工具证据 → 声明 vs 实际 → 伪造率 → 修复提示」闭环，这是最独到的差异化主线。
2. **多代理编排深度**：delegation graph tree/lineage 持久化、worker 自动分类、thread 终态回写、thread 级 todo/review 聚合、coding_task 结构化编排、worker-class 路由、每-turn 委派三态（P108）——比 opencode task tool 与 codex subagent 更结构化、可审计。
3. **上下文压缩严谨性**：anchor 保留 + 五字段 summary schema + 质量评分 + 压缩历史观测 + overflow replay/媒体占位（P68）——比 opencode 摘要压缩更可度量、可回归。
4. **审批流 + 补偿/回滚完备性**：granular 类别 + expiry/FIFO/防御清扫 + 审计落库 + LIFO 补偿 + 文件快照 undo/redo + Git step 快照 revert/unrevert（P71）。
5. **可观测性覆盖**：turn diagnostics / summary quality / compaction history / delegation / audit 全部持久化并暴露 HTTP + RPC + UI 三层。
6. **覆盖面**：40+ 工具组、11 个 IM 渠道、MCP 三形态 + OAuth + server、skills 本地 + 远程市场 + 插件（1.0.0 标准）、hooks 双形态、gateway 多协议 + OpenAPI。
7. **跨平台响应式 UI 架构**：TUI/浏览器/VS Code webview/Electron 四端共用响应式渲染层（数据驱动、无定时器、时间派生动画），跨平台约束沉淀至根 AGENTS.md。
8. **TUI 功能密度**：~70 命令 / ~20 面板 / vim / Ctrl+X leader / Ctrl+P 面板 / which-key / 5 上下文分域键位 / 模型收藏/最近/变体循环 / 消息导航 / 子代理线程导航 / 设置对话框 / 健康 popover——已覆盖 codex/opencode 绝大多数命令面。

---

## 打磨计划 v7（G85–G94）

> 约定：`Pnn` 对应差距编号（G85–G94）。每项完成后把内容移入「已实现功能」并更新差距表为 ✅。优先级：高 = opencode 核心交互差距，直接影响日常效率；中 = 体验/生态增益；低 = 锦上添花。

### 批次 F · 会话安全网与渲染性能（P163–P164，已完成）

- ~~**P163 · G85 · 会话快照 & 一键 revert（含文件变更 diff 预览）（高）**~~ ✅ 已完成，见上方 v7 已完成清单。
  - 底层能力已有（P71 GitStepSnapshotStore），需新增：
    - UI 面板 `/snapshots`：列出会话所有 snapshot（message id + timestamp + diff stats），选择后预览文件变更（复用 `/diff` hunk 渲染）
    - 一键 revert 按钮：调用既有 `revert(messageId)` + 确认弹窗
    - gateway `session.snapshot.list` RPC：复用 GitStepSnapshotStore.list(sessionId) + 格式化 diff stats
    - agent-ui `/snapshots [list|revert <id>|diff <id>]` 子命令
  - 锚点：`agent/src/harness/GitStepSnapshotStore.ts`、`agent-gateway/src/app-rpc/AppRpcServer.ts`、`agent-ui/src/AgentConsoleComponent.ts`

- ~~**P164 · G86 · 增量 markdown 离主线程渲染（中-高）**~~ ✅ 已完成，见上方 v7 已完成清单。
  - 方案：Web Worker + markdown-it/wasm 解析器，消息内容分块发送到 worker，解析完成后 postMessage 回主线程渲染
  - 限制：TUI 无 Web Worker 支持（node worker_threads 可用但增加复杂度），优先浏览器端实现
  - agent-ui `MarkdownWorkerBridge`（可注入，浏览器走 Worker，TUI/browser fallback 走同步）
  - 长消息（>1000 字符）自动走 worker 路径，短消息保持同步（避免 IPC 开销）
  - 锚点：`agent-ui/src/AgentConsolePanels.ts`（render 分支）、新增 `AgentConsoleMarkdownWorker.ts`

### 批次 G · 多会话标签页与 MCP 增强（P165–P166，已完成）

- ~~**P165 · G87 · 多会话标签页（桌面端）（中）**~~ ✅ 已完成，本次落地于 `agent-desktop/src/desktop-html.ts`。
  - Electron/VS Code 端：tab bar 组件 + session 切换 + mod+1..9 快捷键
  - TUI 端：保持 `/sessions` 列表（TUI 单会话语义更自然）
  - 浏览器端：多窗口/tab 由浏览器管理，agent-ui 无需内置 tab
  - 仅 Electron host 实现 tab bar（`agent-desktop/src/`），复用 session store 切换
  - 锚点：`agent-desktop/src/`（新增 `TabBarComponent`）

- ~~**P166 · G88 · MCP server instructions 自动注入上下文（中）**~~ ✅ 已完成，见上方 v7 已完成清单。
  - MCP client `initialize` 响应中提取 `serverInfo.instructions` 字段
  - `AgentContextManager` 在 system prompt 中追加 `## MCP Server Instructions` 段（有界，1KiB 总上限）
  - `McpClient.instructions` 字段 + `McpConnectionManager.getServerInstructions()` 聚合
  - 锚点：`agent-tools/mcp/StdioMcpClient.ts`、`agent/src/context/AgentContextManager.ts`、`agent/src/prompt/SystemPromptBuilder.ts`

### 批次 H · Settings UX 与便利性（P167–P169）

- ~~**P167 · G89 · Thinking level 选择器（settings UI）（中-低）**~~ ✅ 已完成，落地于 `AgentConsoleSettingsStore.ts`、`AgentConsoleComponent.ts`。
  - `/settings` Providers tab 增加 Thinking Level 行（low/medium/high radio）
  - 联动 `reasoningEffort` 透传（P103）+ Ctrl+T 变体循环（P136）
  - 持久化 `.tsdi-agent/settings.json` 新增 `thinkingLevel` 字段
  - 锚点：`agent-ui/src/AgentConsoleSettingsStore.ts`、`AgentConsoleComponent.ts`（openSettingsProvidersTab）

- ~~**P168 · G90 · Yolo auto-approve 模式（低-中）**~~ ✅ 已完成，落地于 `ToolApprovalManager.ts`、`AgentConsoleComponent.ts`、`AgentConsoleSettingsStore.ts`。
  - `/yolo [on|off]` 命令：设置 `autoApprove: true`（所有工具调用自动批准，跳过 approval 队列）
  - `/settings` General tab 增加 Yolo Mode toggle
  - 持久化 `.tsdi-agent/settings.json` 新增 `yoloMode` 字段
  - 锚点：`agent-ui/src/AgentConsoleComponent.ts`、`AgentConsoleSettingsStore.ts`

- ~~**P169 · G91 · 代码模式 MCP adapter（低）**~~ ✅ 已完成，落地于 `agent-tools/mcp/code-mode-adapter.ts`。
  - 可选：MCP server 注册 `code_execution` tool，接受 code + language → 返回 stdout/stderr
  - 复用 ACP code execution 能力（P152），包装为 MCP tool 协议
  - 锚点：`agent-tools/mcp/`（新增 `code-mode-adapter.ts`）

---

## 回归基线

截至 P169（2026-08-18）：十包 **2156 passing 全部 EXIT=0**（agent 752 / agent-gateway 246 / agent-ui 653 / agent-cli 73 / agent-tools 325 / agent-channels 59 / agent-providers 13 / agent-ssh 8 / agent-desktop 20 / agent-vscode 7）；跨包共享渲染层 core 130 / components 126 / components/console 72 passing；受影响包 `tsc --noEmit` 与 build 通过，agent-ui build:web 保持通过。

---

## 性能基线（2026-08-17）

| 指标 | 数值 |
|---|---|
| 十包测试总数 | 2156 passing |
| 十包 tsc --noEmit | 全 clean（EXIT=0） |
| Web bundle | agent-ui 3.4MB（esbuild） |
| Electron dist | 44KB（agent-desktop） |
| VS Code dist | 24KB（agent-vscode） |
| 总测试耗时（串行） | ~75–80s |
| 总 LOC（src） | ~62,600 |
| 各包 LOC | agent 22,948 / agent-ui 22,922 / agent-gateway 8,514 / agent-cli 3,960 / agent-tools 3,956 / agent-channels 1,362 / agent-ssh 585 / agent-desktop 496 / agent-vscode 237 / agent-providers 7 |

---

## 代码质量审计（2026-08-17）

### 类型抑制（src 文件 `as any`）

| 包 | 主要文件 | 数量 | 性质 |
|---|---|---|---|
| agent | TypeOrmSessionStore.ts | 33 | TypeORM 查询构建器泛型擦除（结构性） |
| agent | TypeOrmDelegationGraphStore.ts + orm.module.ts + lazy-typeorm.ts | 25 | 惰性 require + 动态类型 |
| agent-ui | AgentConsoleComponent.ts | 10 | 响应式 proxy 类型推断 |
| agent-ui | HttpAgentConsoleAppRpc.ts | 8 | JSON-RPC 响应类型 |
| agent-gateway | AppRpcServer.ts | 7 | RPC handler 动态分发 |
| agent-tools | agent-tools.module.ts | 7 | DI 模块注册 |

**评估**：均为 TypeORM 泛型擦除 / DI 动态注册 / RPC 动态分发的结构性 `as any`，非偷懒抑制。零 `@ts-ignore` / `@ts-expect-error`。test 文件 2537 处 `as any` 属 mock 正常用法。

### TODO/FIXME/HACK

**零实际待办**。唯一 5 处 `TODO` 为 `todo-store.ts` 常量命名（`TODO_MEMORY_ID_PREFIX`），非真正待办标记。

### 大文件（>500 LOC）

| 文件 | LOC | 评估 |
|---|---|---|
| AgentConsoleComponent.ts | **9171** | 核心组件，建议按功能域拆分（输入/渲染/命令/键位） |
| AgentConsoleSessionState.ts | 4426 | 状态管理，规模合理 |
| AgentConsolePanels.ts | 3459 | 面板渲染，规模合理 |
| DefaultAgentRuntime.ts | 3191 | 运行时核心，规模合理 |
| AppRpcServer.ts | 3144 | RPC 聚合，规模合理 |

---

## 文档审计（2026-08-17）

| 包 | README | CHANGELOG | 评估 |
|---|---|---|---|
| agent | ✅ 10.9KB | ✅ 新建 | ✅ |
| agent-gateway | ✅ 2.5KB | ✅ 新建 | ✅ |
| **agent-ui** | **✅ 新建** | ✅ 新建 | ✅ |
| agent-cli | ✅ 9.1KB | ✅ 新建 | ✅ |
| agent-tools | ✅ 8.7KB | ✅ 新建 | ✅ |
| agent-channels | ✅ 1.6KB | ✅ 新建 | ✅ |
| agent-providers | ✅ 1.3KB | ✅ 新建 | ✅ |
| **agent-ssh** | **✅ 新建** | ✅ 新建 | ✅ |
| agent-desktop | ✅ 2.3KB | ✅ 新建 | ✅ |
| agent-vscode | ✅ 扩充 | ✅ 新建 | ✅ |
