Now I have a complete picture. Let me compile the analysis.
@tsdi/agents 核心能力 vs Codex 功能对比分析
一、已实现的能力（对标 Codex）
Codex 能力
文件系统操作
Shell 命令执行
Git 操作Sisyphus (Ultraworker)
规划能力
/home/zhouyou/workspace/core多任务处理 / 持久线程
后台/并行工作
上下文压缩
提示缓存
无状态请求处理
模型路由
工具执行控制面
审批/人工确认
经验蒸馏
Diff Review
GUI 控制台
MCP 工具集成
二、明确缺失的能力
Codex 能力
沙箱代码执行
屏幕截取/GUI 操作
多 Agent 并行（多 worktree）
Git Worktree 隔离
智能上下文压缩（Context Compaction）
专用 Diff Review UI
后台任务仪表板
代码回滚/Checkpoint
文件监听/热更新
提示缓存优化
项目维度的线程组织
三、架构优势（超越 Codex 的部分）
1. IoC 驱动的可插拔架构 — 所有组件（Runtime、ToolRegistry、ModelAdapter、Summarizer、Distiller）通过 IoC 容器注入，可在不修改核心代码的情况下替换任何组件
2. 主体制感知的工具授权 — ToolExecutionCoordinator 的 AgentToolAuthorizationPolicy 支持按 principal 粒度控制工具访问，适配多租户场景
3. 编排层（TurnHandler） — TurnHandler 允许通过 IoC 注入自定义拦截器，在不修改 runtime 的情况下插入 guard/interceptor/filter 逻辑
4. 审计追踪 — 每次工具调用都有完整 receipt（含 attempt、duration、inputSummary），支持 InMemory 和 TypeORM 两种审计后端
四、优先级建议
如果目标是达到 Codex 级别的编程能力，建议按以下优先级推进：
| 优先级 | 能力 | 理由 |
|---|---
继续
+ Thought: 340ms
优先级	能力
P0	智能上下文压缩
P0	Git Worktree 隔离
P1	多 Agent 并行
P1	专用 Diff Review UI
P1	Checkpoint / 回滚
P2	屏幕截取 / GUI 操作
P2	后台任务仪表板
P2	项目维度线程组织
P3	提示缓存优化
P3	沙箱代码执行
P3	文件监听
五、已有基础设施可以直接复用的模块
现有模块                          可支撑的新能力
─────────────────────────────────────────────────
AgentContextManager              → 智能压缩的 token 估算基础
LLMSessionSummarizer            → 压缩摘要的 LLM 调用层
coding_task + WorkspaceRunner    → worktree 隔离的执行框架
AgentTurnStarted/CompletedEvent  → 任务仪表板的事件源
AgentConsoleComponent panels    → diff review UI / dashboard 的面板框架
ToolExecutionCoordinator        → 多 Agent 的工具执行治理
AgentScheduler                  → 后台任务调度的扩展点
InMemorySessionStore            → 快速原型的 session 暂存
ExperienceDistiller             → 长期记忆的知识积累
RoutedModelAdapter              → 多 Agent 场景的模型路由
六、总结
当前状态：@tsdi/agents 已经具备了 Codex 80% 的核心编程工具能力（文件操作、Shell、Git、规划、记忆、模型路由、工具治理）。在架构可扩展性上甚至更强（IoC 驱动、主体制感知、审计追踪）。
关键差距：主要在"长时间自主运行"（智能压缩 vs 简单裁剪）和"并行工作"（多 Agent worktree vs 单 Agent）这两个维度。这两个能力是从"能用的编程助手"到"Codex 级自主编程"的分水岭。
最快的路径：先做 P0 的智能上下文压缩（复用 LLMSessionSummarizer + 修改 AgentContextManager 的触发策略），然后做 P0 的 Git Worktree（扩展 coding_task 的 workspace 概念），这两个加在一起就能让 Agent 支持长时间、多任务的编程场景。
▣  Sisyphus (Ultraworker) · Big Pickle · 1m 14s
继续
+ Thought: 1.3s
分析已经完整了。如果需要深入某个方向，我可以：
1. 深入某个 P0 能力的技术设计 — 比如智能上下文压缩的具体实现方案，或 Git Worktree 的集成架构
2. 开始实现 — 选择一个优先级最高的能力动手写代码
3. 生成工作计划 — 用 Prometheus 生成一个完整的多 session 实施蓝图
你想怎么推进？