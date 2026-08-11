# Agents 后续打磨清单

## 功能总纲

主干能力已齐（2026-08 对比 Codex / opencode 口径）：turn 循环（run/streaming）、多模型适配（Echo/Anthropic/OpenAI/Routed + profiles + complexity 路由 + worker-class 路由 + 命令级 profile）、prompt cache 支持、上下文压缩 + turn diagnostics（store/aggregate/trend）、补偿/回滚（LIFO + 审计 + 文件快照 undo/redo）、审批流（自动评审 / granular 类别 + 网络目的地放行 / expiry/FIFO/防御清扫/审计落库）、sandbox 策略矩阵（capability 级 + OS 级 sandbox-exec + 会话级运行时切换）、40+ 工具组（files/git/terminal/browser 轻量 + playwright/web/http/memory/skills/mcp/scheduling/cron/kanban/knowledge/media/audio/capture/code-execution/process/security/communication/sessions/project/data/backup/pipeline/poll/approval/ai-cli/lsp/ssh 等）、MCP stdio + Streamable HTTP client + OAuth + server tool、skills 系统（本地注册表/目录/turn interceptor/激活提示）、编排（parallel_spawn/spawn_agent/llm_task/coding_task + delegation graph tree/lineage + worker 自动分类 + thread 状态 + thread 级工件聚合 + 子任务加密 + per-agent 权限）、可观测（audit/stats/compaction-history/summary-quality/turn-diagnostics/delegation/usage + evidence-ledger/verification-gate/weakness-miner/harness-profile 循证螺旋 + dashboard digests）、gateway（JSON-RPC + HTTP + SSE + owner 鉴权 + InMemory/TypeOrm 持久化）、console TUI（~15 面板 / ~30 命令 / vim mode / review hunk 折叠 + side-by-side / ssh 远程 shell / 实时双向语音 / 主题 / workspace mentions）、CLI（chat/run 一次性/rpc-stdio/tools list/doctor/completion/update + fast/strong 自适应配置）、多代理 v2（per-spawn profile/reasoning/concurrency + 子任务加密）。

## 差距分析（vs Codex / opencode，2026-08）

基于对 opencode（sst/opencode，Bun + Effect 运行时）与 Codex（openai/codex，Rust app-server + Responses API）源码/文档的实际对照。结论先行：**主干能力与两者已基本对齐，甚至部分领先；真正的差距集中在「编码反馈闭环」「会话/工作树可回退性」「上下文工程的最后一公里」和「面向第三方客户端的交付面」四个方向**，全部是增量可做、无需推翻现有架构的。

### 本项目优势（相对 codex/opencode，保持并强化）

1. **循证验证螺旋**（evidence-ledger / verification-gate / weakness-miner / harness-profile + falsify-rate 路由）：codex/opencode 均无系统化的「工具证据 → 声明 vs 实际 → 伪造率 → 修复提示」闭环，这是本项目最独到的差异化主线。
2. **多代理编排深度**：delegation graph tree/lineage 持久化、worker 自动分类（sessionRole/originThreadId）、thread 终态回写、thread 级 todo/review 聚合、worker-class 模型路由 —— 比 opencode 的 task tool 与 codex 的 subagent 更结构化、可审计。
3. **上下文压缩的严谨性**：anchor 保留（root goal / 最新 goal / 错误上下文 / 状态工具结果）+ 五字段 summary schema + 质量评分 + 压缩历史观测 —— 比 opencode 的摘要压缩更可度量、可回归。
4. **审批流 + 补偿/回滚完备性**：granular 类别 + expiry/FIFO/防御清扫 + 审计落库 + LIFO 补偿 + 文件快照 undo/redo —— 超出 opencode 的 ask/allow/deny 两级模型。
5. **可观测性覆盖**：turn diagnostics / summary quality / compaction history / delegation / audit 全部持久化并暴露 HTTP + RPC + UI 三层，opencode/codex 均无此厚度。
6. **覆盖面**：40+ 工具组、11 个 IM 渠道、MCP stdio + Streamable HTTP + OAuth + server、skills 本地注册表、gateway 多协议 —— 工具广度超过 opencode 内置集。

### 真正差距（按优先级排序，P67 起逐项消化）

| # | 差距 | 对照对象 | 现状证据 | 影响 |
|---|---|---|---|---|
| G1 | **编辑 → LSP 诊断反馈闭环缺失** | opencode 每次 edit 后 `textDocument/didChange` → 拉取 diagnostics → 喂回上下文 | 本项目 LSP 仅是只读查询工具（`lsp_definition/references/diagnostics/symbols`），`write/edit/apply_patch` 路径未接入；verification-gate 的 declared-vs-actual 是弱替代 | 高：模型改错后无法自感知，是编码 agent 质量的核心闭环 |
| G2 | **会话/工作树不可回退到消息级** | opencode step-start git 快照 + revert/unrevert + 会话 diff；codex thread fork | 仅有内容级文件 undo/redo（FileSnapshotStore）与会话 store snapshot；无 git checkpoint 绑定会话状态、无 fork 分支、无会话 diff API | 高：长会话纠错/分支探索体验不足 |
| G3 | **compaction 后无用户消息 replay** | opencode/codex 压缩后克隆最后用户消息重放（媒体转占位符）或注入「继续」提示 | `AgentContextManager` 压缩后直接进入下一轮，无 replay 步骤（有 recentMessageWindow 缓解，不等价） | 中高：长会话压缩后连续性受损 |
| G4 | **prompt cache 只读，无请求侧 cache_control** | codex 明确静态内容前置保证前缀缓存命中 | OpenAI-compatible/deepseek 仅 observe usage；系统提示未做 cacheable/non-cacheable 分段（PromptCachePolicy 有 scopes 但 wire 层未落地） | 中高：长会话 token 成本随轮次线性膨胀 |
| G5 | **AGENTS.md 发现过简** | codex：`AGENTS.override.md` + fallback 文件名 + 32KiB 上限 + root→cwd 拼接优先级 | 本项目 `findFileUpward` 单文件向上查找，遇 home 停止；无 override/fallback/上限/优先级 | 中：项目级规则表达能力不足 |
| G6 | **无声明式 agent 原型（plan/build/review）** | opencode `Agent.Info`（mode/permission/prompt/model/steps）声明式配置 + plan_enter/build-switch 系统提示；codex `[agents]` | 仅有 `setPlanMode` 会话开关与 per-agent 权限 metadata，无一等公民的原型定义 | 中：agent 复用与分发能力弱 |
| G7 | **记忆无语义检索** | codex memories；生态 RAG/embedding | `AgentMemoryRetriever` 为关键词匹配；ExperienceDistiller 为确定性规则 | 中：记忆召回质量受限（可复用现有 memory/经验蒸馏优势） |
| G8 | **无自动标题/摘要 agent** | opencode 首条消息异步 `ensureTitle` + 隐藏 title/summary agent | `SessionStore.setTitle` 为手动调用；LLMSessionSummarizer 仅服务压缩 | 低中：会话导航体验 |
| G9 | **Gateway 无 OpenAPI/SDK，第三方客户端难接入** | opencode server 暴露 OpenAPI 3.1 + SDK 生成 | gateway 有 JSON-RPC/HTTP/SSE，但无规范描述与官方客户端包 | 中：桌面/IDE/Web 多面的前置阻塞项 |
| G10 | **模型请求重试策略简** | opencode `session/retry.ts`：错误分类 + 指数退避 + retry-after 尊重 | 有 empty-response 重试、follow-up recovery、total timeout re-arm，但缺 rate-limit/5xx 分类与 retry-after | 低中：高负载下体验不稳 |

## 打磨计划（P67+）

> 约定：`Pnn-前缀` 对应上表差距编号（G1–G10）。每项完成后更新「已完成（历史）」。

### P67 · 编辑 → LSP 诊断反馈闭环（G1）—— 高优先 ✅ 已完成（b217b080c）

- `write_file` / `edit_file` / `apply_patch` 执行成功后，对受影响文件触发 `textDocument/didChange` → 拉取（pull）或等待缓存 diagnostics → 追加为工具结果附带的 `lspDiagnostics` 字段（有界：最多 N 条/截断），不阻塞写入。
- diagnostics 注入 `VerificationGate` 作为新证据源（`evidence.verification == 'lsp'`），与 declared-vs-actual 并行。
- 支持 `lsp.diagnosticsOnEdit: boolean | 'auto'` 开关；无 LSP 配置时静默降级。
- 锚点：`agent-tools/lsp/lsp-client.ts`（didChange 支持）、`agent-tools/lsp/lsp-manager.ts`（按扩展名路由）、`agent-tools/files/*.tool.ts`（编辑工具后置钩子）、`agent/src/harness/VerificationGate.ts`、`agent/src/harness/ToolExecutionCoordinator.ts`。
- 测试：`agent-tools/test/lsp.spec.ts`（fake LSP server 端到端）、`agent/test/verification-gate.spec.ts`（lsp 证据合并）。

### P68 · Compaction replay + 媒体占位符（G3）—— 高优先 ✅ 已完成

- 压缩完成后：若为硬性 overflow，克隆最后用户消息（媒体附件 → `[Attached <type>: <name>]` 文本占位符）重放入口；若为主动压缩，注入「Continue if you have next steps」合成提示。
- `AgentContextPreparedEvent` / `CompactionHistoryStore` 增加 `replayed` 标记，保持观测可回归。
- 锚点：`agent/src/context/AgentContextManager.ts`（preparation 流水线）、`agent/src/runtime/DefaultAgentRuntime.ts`（turn 入口）、`agent/src/harness/CompactionHistoryStore.ts`。
- 测试：`agent/test/context-compaction.spec.ts`（overflow 重放、媒体占位、主动继续）。

### P69 · Prompt cache 请求侧落地 + 系统提示分段（G4）—— 高优先 ✅ 已完成

- 系统提示按 cacheable（identity/rules/tools/skills 目录/项目上下文）与 non-cacheable（日期时间/动态上下文）分段，静态段前置。
- OpenAI-compatible 适配器（含 deepseek）请求侧发出 cache 注解（OpenAI `cache_control`/`cached` 前缀或 deepseek context caching 语义），从 observe-only 升级为请求侧控制。
- 缓存破坏检测：tools/model/sandbox 中途变更时避免重排前缀（codex 教训）。
- 锚点：`agent/src/model/OpenAICompatibleModelAdapter.ts`、`agent/src/model/PromptCachePolicy.ts`、`agent/src/prompt/SystemPromptBuilder.ts`、`agent/src/prompt/sections/*`。
- 测试：`agent/test/model-provider.spec.ts`（cache 注解断言、前缀稳定性）。

### P70 · 声明式 agent 原型：plan/build/review（G6）—— 中优先

- 引入 `AgentArchetype` 配置（name/description/mode: primary|subagent/permission 规则集/prompt/model/steps），对齐 opencode `Agent.Info` 与 codex `[agents]`。
- 内置 `plan`（只读 + 仅允许写 plans 目录）、`build`（默认全量）、`review`（只读 + 文档工具）三个原型；`setPlanMode` 收敛为 plan 原型的会话实例。
- `@mention`/斜杠命令切换原型；原型间切换注入 build-switch 风格系统提示。
- 锚点：`agent/src/options.ts`、`agent/src/runtime/AgentRuntime.ts`（原型解析）、`agent-tools/src/options.ts`、`agent-ui`（原型切换命令）。
- 测试：`agent/test/runtime-loop.spec.ts`（plan 只读约束）、`agent-tools/test/tools.spec.ts`。

### P71 · Git step 快照 + 消息级 revert/unrevert + 会话 diff（G2）—— 中优先

- 每 step-start 以 git 临时 ref/commit 捕获工作树（不污染历史），绑定到会话消息 id；提供 `revert(messageId)` / `unrevert()` 恢复工作树 + 会话双态。
- 会话 diff 计算（`GET /api/session/:id/diff?messageId=` 类接口，对齐 opencode），供 review 面板复用。
- 与现有 FileSnapshotStore 并存：git 快照用于整树恢复，FileSnapshot 用于精确 undo。
- 锚点：`agent/src/harness/FileSnapshotStore.ts`（复用 seam）、`agent-tools/git/git-operations.tool.ts`、`agent-gateway/src/api/SessionHandler.ts`、`agent-ui` review 面板。
- 测试：`agent/test/turn-cancel.spec.ts`（revert 链路）、`agent-gateway/test/gateway-server.spec.ts`。

### P72 · AGENTS.md 指令链升级（G5）—— 中优先

- `AGENTS.override.md` 优先于 `AGENTS.md`；`projectDocFallbackFilenames`；`projectDocMaxBytes`（默认 32KiB）上限截断；root→cwd 自根向叶拼接、近端覆盖远端。
- `findAgentsDoc` 返回指令链（多文件有序），`ProjectContextSection` 消费新返回结构。
- 锚点：`agent/src/project/agents-doc.ts`、`agent/src/project/init-agents-doc.ts`、`agent/src/prompt/sections/ProjectContextSection.ts`、`agent/src/options.ts`。
- 测试：`agent/test/project-context.spec.ts`（override 优先级、fallback、截断）。

### P73 · 语义记忆检索（G7）—— 中优先

- 可选 embedding 提供者（注入 `MemoryEmbedder` token，无配置时回退关键词）；`memory.search` 增加 `mode: 'semantic' | 'keyword' | 'hybrid'`。
- 结果合并现有记忆/经验蒸馏管线（`AgentMemoryRetriever`），不破坏现有确定性路径。
- 锚点：`agent/src/memory/AgentMemoryRetriever.ts`、`agent/src/memory/MemoryStore.ts`、`agent-tools/memory/*`。
- 测试：`agent/test/memory.spec.ts`（降级回退）、`agent-tools/test/tools.spec.ts`。

### P74 · 自动标题/摘要 agent（G8）—— 低中优先

- 首条用户消息后异步 `ensureTitle`（低成本模型/温度固定），回落 deterministic（首句截断）。
- 会话级结构化摘要独立于压缩摘要（对齐 opencode summary agent），供 `/projects`/`/threads` 展示。
- 锚点：`agent/src/runtime/DefaultAgentRuntime.ts`（runTurn 入口）、`agent/src/memory/SessionStore.ts`（setTitle/summary）、`agent/src/model/RoutedModelAdapter.ts`。
- 测试：`agent/test/runtime-loop.spec.ts`、`agent-ui/test/view-model.spec.ts`。

### P75 · Gateway OpenAPI 规范（G9）—— 中优先（桌面/IDE 前置）

- 为 gateway HTTP 面生成 OpenAPI 3.1 文档（session/message/delegation/audit/compaction/summary-quality 等 handler），JSON-RPC 方法表导出为 schema。
- 可选：生成 TypeScript 客户端骨架（对齐 opencode SDK 生成思路）。
- 锚点：`agent-gateway/src/api/*Handler.ts`（收集路由元数据）、`agent-gateway/src/app-rpc/AppRpcServer.ts`（能力表）。
- 测试：`agent-gateway/test/gateway-server.spec.ts`（spec 快照）。

### P76 · 模型请求重试/退避分类（G10）—— 低中优先

- 模型请求错误分类：rate-limit / 5xx / 网络 / 超时；rate-limit 尊重 `retry-after`，其余指数退避 + jitter；接入现有 empty-response/follow-up 恢复链。
- 锚点：`agent/src/model/ModelAdapter.ts`（错误类型）、`agent/src/runtime/DefaultAgentRuntime.ts`（complete/streaming 重试路径）。
- 测试：`agent/test/model-adapter.spec.ts`（分类 + 退避断言）。

### P77 · 会话 fork（G2 延伸）—— 低优先

- 基于会话 snapshot 的 fork：`fork(sessionId, messageId?)` 创建子会话（branch role），继承 thread 归属（originThreadId），复用现有项目/线程模型。
- 锚点：`agent/src/memory/SessionStore.ts`（snapshot/restore seam）、`agent-gateway/src/api/SessionHandler.ts`、`agent-ui` `/fork` 命令。
- 测试：`agent/test/session.spec.ts`、`agent-ui/test/view-model.spec.ts`。

### P78 · 项目记忆闭环：从验证失败回写 AGENTS.md（学习闭环）—— 远期

- 循证螺旋发现的高频 falsify 模式 → 生成项目级规则（`AGENTS.md` 或 `.agents/rules/*.md`）草案 → 人审后落地；对齐 codex「修正 agent 错误时更新 AGENTS.md」实践。
- 锚点：`agent/src/harness/WeaknessMiner.ts`、`agent/src/project/agents-doc.ts`。

## 剩余（远期，未排期）

- **桌面/IDE/Web 多面**（opencode desktop + IDE 扩展 + web console）——需新 UI 工程，暂不排期。
- **GitHub/GitLab 应用集成**（Codex GitHub Action、opencode GitHub 集成、隐藏自动化 agent）——依赖平台 OAuth。

## 已完成（历史）

P0–P61 全部打磨条目（含 P34/P35 Tier1/Tier2 与 A/B 面、P42–P45 规划项）均已落地并有测试覆盖；截至 P61 全量回归：agent 554 / agent-cli 52 passing，各子包 `tsc --noEmit` clean。逐条打磨记录见 git history 中各 P 段。

P62–P66（agent-ui 渲染性能优化）已收口：P62 点动画改时间派生（移除 setInterval）、P64 `elapsedLabel` 秒级稳定化、P65 SessionState Proxy 驱动（去 ~130 处 notify/batch）已随 f6339d205 落地；P63 布局层缓存验证失败已回退（教训见根 AGENT.md）；P66 动画帧基准随后续"`• Working` 静态标签 + dashboard 并入工作行"的新设计取消（无动画即无需动画帧基准）。架构约束（响应式驱动、禁定时器、时间派生、跨平台无 node API、响应式代理机制）已沉淀至根 AGENT.md。

P67（编辑 → LSP 诊断反馈闭环，G1）已随 b217b080c 落地：编辑工具（write/edit/apply_patch）执行后触发 `textDocument/didChange` → 拉取缓存 diagnostics → 追加为工具结果 `lspDiagnostics`（有界截断、不阻塞写入）；注入 `VerificationGate` 为 `evidence.verification == 'lsp'` 新证据源；支持 `lsp.diagnosticsOnEdit: boolean | 'auto'` 开关、无 LSP 配置静默降级。

P68（Compaction replay + 媒体占位符，G3）已落地：`AgentContextManager` preparation 流水线在压缩后重放——硬性 overflow 克隆最后用户消息（媒体附件 → `[Attached <type>: <name>]` 文本占位符）`replayKind: 'last-user-message'`；主动压缩注入「Continue if you have next steps」`replayKind: 'continue-prompt'`，并防重复注入；`CompactionHistoryRecord`（必填 `replayed` + `replayKind`）/ `AgentTurnDiagnostics`（`replayCount`/`replayKind`）/ `ContextPreparationReport` 全链路传播，TypeOrm 实体加列、gateway DTO 透出。回归：agent 572 / agent-gateway 187 / agent-ui 334 passing，三包构建 clean，测试覆盖 overflow 重放、媒体占位、主动继续、防重复四场景。

P69（Prompt cache 请求侧落地 + 系统提示分段，G4）已落地：`PromptSection` 新增 `cacheable` 标记（DateTime/Memory 段置 false），`SystemPromptBuilder` 静态段（identity/project/tools）前置、动态段（date-time/memory）后置，保证 prompt 前缀稳定；`OpenAICompatibleModelAdapter` 从 observe-only 升级为请求侧控制——openai provider 对 system 消息标注 `cache_control: {type: 'ephemeral'|'persistent'}`（supported 'full'），deepseek 依赖自动 context caching（supported 'partial'、不注解），其余 openai-compatible 保持 observe_only；修复前缀破坏 bug（动态 summary/memory 从 system prompt 之前移到之后）；新增静态前缀 hash 跨请求比较，tools/system 变更时 `PromptCacheRuntimeMetadata.prefixBroken` 置 true。回归：agent 579 / agent-gateway 187 / agent-ui 334 passing，三包构建 clean；新增测试覆盖 cache_control 注解、summary/memory 后置、deepseek partial、前缀破坏检测、分段渲染顺序。

P70–P78（差距打磨计划，2026-08 排定）未开始；启动时逐项更新本段。
