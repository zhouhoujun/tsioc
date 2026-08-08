# Agents 后续打磨清单

## 功能总纲

主干能力已齐（2026-08 对比 Codex / opencode 口径）：turn 循环（run/streaming）、多模型适配（Echo/Anthropic/OpenAI/Routed + profiles + complexity 路由 + worker-class 路由 + 命令级 profile）、prompt cache 支持、上下文压缩 + turn diagnostics（store/aggregate/trend）、补偿/回滚（LIFO + 审计 + 文件快照 undo/redo）、审批流（自动评审 / granular 类别 + 网络目的地放行 / expiry/FIFO/防御清扫/审计落库）、sandbox 策略矩阵（capability 级 + OS 级 sandbox-exec + 会话级运行时切换）、40+ 工具组（files/git/terminal/browser 轻量 + playwright/web/http/memory/skills/mcp/scheduling/cron/kanban/knowledge/media/audio/capture/code-execution/process/security/communication/sessions/project/data/backup/pipeline/poll/approval/ai-cli/lsp/ssh 等）、MCP stdio + Streamable HTTP client + OAuth + server tool、skills 系统（本地注册表/目录/turn interceptor/激活提示）、编排（parallel_spawn/spawn_agent/llm_task/coding_task + delegation graph tree/lineage + worker 自动分类 + thread 状态 + thread 级工件聚合 + 子任务加密 + per-agent 权限）、可观测（audit/stats/compaction-history/summary-quality/turn-diagnostics/delegation/usage + evidence-ledger/verification-gate/weakness-miner/harness-profile 循证螺旋 + dashboard digests）、gateway（JSON-RPC + HTTP + SSE + owner 鉴权 + InMemory/TypeOrm 持久化）、console TUI（~15 面板 / ~30 命令 / vim mode / review hunk 折叠 + side-by-side / ssh 远程 shell / 实时双向语音 / 主题 / workspace mentions）、CLI（chat/run 一次性/rpc-stdio/tools list/doctor/completion/update + fast/strong 自适应配置）、多代理 v2（per-spawn profile/reasoning/concurrency + 子任务加密）。

## 剩余（远期，未排期）

- **桌面/IDE/Web 多面**（opencode desktop + IDE 扩展 + web console）——需新 UI 工程，暂不排期。
- **GitHub/GitLab 应用集成**（Codex GitHub Action、opencode GitHub 集成、隐藏自动化 agent）——依赖平台 OAuth。

## 已完成（历史）

P0–P61 全部打磨条目（含 P34/P35 Tier1/Tier2 与 A/B 面、P42–P45 规划项）均已落地并有测试覆盖；截至 P61 全量回归：agent 554 / agent-cli 52 passing，各子包 `tsc --noEmit` clean。逐条打磨记录见 git history 中各 P 段。

P62–P66（agent-ui 渲染性能优化）已收口：P62 点动画改时间派生（移除 setInterval）、P64 `elapsedLabel` 秒级稳定化、P65 SessionState Proxy 驱动（去 ~130 处 notify/batch）已随 f6339d205 落地；P63 布局层缓存验证失败已回退（教训见根 AGENT.md）；P66 动画帧基准随后续"`• Working` 静态标签 + dashboard 并入工作行"的新设计取消（无动画即无需动画帧基准）。架构约束（响应式驱动、禁定时器、时间派生、跨平台无 node API、响应式代理机制）已沉淀至根 AGENT.md。
