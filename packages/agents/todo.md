部分实现能力（仍需打磨）
1. 智能上下文压缩 — AgentContextManager + LLMSessionSummarizer 已有，但"智能度"仍不足
2. 多 Agent 并行高层编排 — spawn_agent、worktree 已有，聚合/失败恢复仍偏弱
3. Diff Review UI — 已有 review/tasks 面板，但还不是专门化产品
4. 后台任务仪表板 — panels 基础已存在，dashboard 能力不完整
5. 项目维度线程组织 — session 已按 workspace 分组，缺跨会话聚合



5 个领域的现状 vs 差距
1. 智能上下文压缩
当前状态: ✅ M1 完成 — 663 行，包含 token 估算、裁剪、摘要锚点、工具消息压缩、追问重写
差距:
- 摘要器是简单的 SimpleSessionSummarizer / LLMSessionSummarizer，没有智能多级压缩
- 没有自适应预算调整（根据会话模式动态调整）
- 没有渐进式压缩（light → medium → deep）
- 用户追问已压缩内容时无法选择性恢复细节
- 没有压缩指标对用户可见
2. 多 Agent 并行高层编排
当前状态: spawn_agent 工具 + LightweightAgentRunner + NestedAgentRunner + DelegatingSpawnAgentAdapter + toolsets 过滤(M2b) + session 合并(M2d)
差距:
- 只有单个子 Agent 生成，没有 parallel_spawn / map_reduce / fan-out / race 等并行原语
- 没有协调原语（wait all / wait any / scatter-gather）
- 没有并行结果聚合器
- 没有子 Agent 间的依赖图
- 没有编排器 agent 来分配、监控和综合结果
- 没有并发的进度流式报告
3. Diff Review UI
当前状态: AgentConsoleAppRpc.ts（仅 8 行接口）+ agent-ui 包存在
差距:
- 完全没有结构化 diff 的可视化
- 没有 diff 渲染（并排或统一模式）
- 没有审查工作流（批准/拒绝/评论）
- 没有与 git diff 集成的代码审查
- parsedDelegatedAgentReport 返回 diff 字段但没有任何渲染
4. 后台任务仪表板
当前状态: 事件系统（AgentToolInvokedEvent、AgentToolCompletedEvent 等）+ 审计 sink（InMemoryAuditSink、TypeOrmAuditSink）
差距:
- 完全没有仪表板 UI
- 没有实时任务状态视图
- 没有任务历史或指标
- 没有取消或管理界面
- 没有进度条或状态指示器
5. 项目维度线程组织
当前状态: SessionStore 具有 listProjects() / setProjectMetadata()、TypeOrmSessionStore 完整实现、AgentSessionProjectIndex 和 AgentSessionProjectMetadata 接口已定义
差距:
- InMemorySessionStore 可能没有实现项目特性
- 没有 CLI 命令管理项目
- 没有会话树/线程视图
- 没有按项目浏览会话的 UI
- 没有工作空间的自动项目检测
