# Agents 完成度评估

## 总体状态

| 领域 | 状态 | 完成度 |
|------|------|--------|
| 1. 智能上下文压缩 | 核心完成，可进一步打磨 | ~80% |
| 2. 多 Agent 并行高层编排 | parallel_spawn + orchestrate 已实现 | ~85% |
| 3. Diff Review UI | 完整 TUI 面板已在运行 | ~85% |
| 4. 后台任务仪表板 | 基础面板已建立 | ~50% |
| 5. 项目维度线程组织 | CLI 命令已可用 | ~45% |

---

## 1. 智能上下文压缩

**当前状态**: ✅ 已完成渐进式压缩管道
- `AgentContextManager` — 上下文组装与管理
- `LLMSessionSummarizer` — LLM 驱动的摘要生成
- `SimpleSessionSummarizer` — 简单摘要器
- `c9a7c23e0`: 渐进式压缩（light → medium → deep）+ 会话细节恢复 + 自适应预算调整
- `8b7038c77`: 压缩指标捕获（`compactionCount`, `totalTokenSavings`, `compressionRatio`, `compactionLevel`）
- `b6f70af00`: stash TTL + 自适应预算细化
- `4cf3eaeb8` / `b33bea00a` / `35edbe2d0`: 跨会话经验持久化与合成

**剩余差距**:
- 压缩指标虽已捕获，但在 TUI 中对用户不可见（无面板展示指标）
- 选择性恢复细节的通道已有，但触发仍需更自然
- 摘要器仍是通用 LLM 摘要，缺少针对 tool-heavy 会话的优化摘要策略

---

## 2. 多 Agent 并行高层编排

**当前状态**: ✅ 并行原语 + DAG 编排器已完成
- `spawn_agent` 工具 — 单子 Agent 生成（M2a）
- `parallel-spawn.tool.ts` — `ParallelSpawnTool`: 并行发起多个子 Agent，返回各结果
- `orchestrate.tool.ts` — `OrchestrateTool`（353 行）: DAG 拓扑排序 + phase-by-phase 并行执行 + 依赖上下文注入 + 结果聚合（`803b54b07`）
- `LightweightAgentRunner` + `NestedAgentRunner` + `DelegatingSpawnAgentAdapter`
- toolsets 过滤（M2b）+ session 合并（M2d）
- toolsets 限制（`agent` group 内）

**剩余差距**:
- 无 map_reduce / fan-out / race 等更高层并行模式（orchestrate 覆盖了 DAG 场景，但未覆盖这些）
- 无并行执行的进度流式报告（所有结果在 phase 完成后一次性返回）
- orchestrate 中失败任务的重试策略目前只有跳过，没有自动重试逻辑

---

## 3. Diff Review UI

**当前状态**: ✅ 完整的 TUI 审阅面板
- 四层信息模型：task → group（aggregate/worker）→ file → patch filter
- unified diff section 解析（`parseUnifiedDiffSections`）
- 键盘导航：`,./[]` 切换 group/file, arrows 滚动, `a/u` 过滤, `y` 复制
- 审查标注：每文件 approve/reject + 注释（`47b3deaba`, `c00106b15`）
- 命令支持：`/review approve [comment]`, `/review reject [comment]`, `/review clear`, `/review approve-all`, `/review clear-all`, `/review summary`
- 文件列表标注标记（✓/✗）
- patch 过滤：`all` / `additions`
- lineage 跟踪（prev/next lineage root）
- 进度指示器：dashboard panel ▶ 标记, tool runs 尝试次数, progress bar
- 回滚状态/checkpoint 显示

**剩余差距**:
- 无并排（side-by-side）diff 渲染（TUI 限制）
- 无语义 diff folding（比 unified diff section 更细粒度）
- 无 diff 上下文跳跃（跳到下一个修改块）
- 无 per-file 风险评分
- 标注仅在内存中，不持久化到 session/memory store
- 无 `/review export` 输出审阅报告

---

## 4. 后台任务仪表板

**当前状态**: 🟡 基础面板已建立
- `731b32ddd`: 工具运行进度条（`[███░░░░░]`）+ 运行状态指示器
- Dashboard panel: 运行中工具 ▶ 标记 + 尝试次数 + 输入摘要
- Tool runs panel: 尝试次数 #N 显示 + 输入摘要预览
- Working panel: 进度条 + 工具名 + 尝试次数
- 事件系统：`AgentToolInvokedEvent`, `AgentToolCompletedEvent` 等
- 审计 sink：`InMemoryAuditSink`, `TypeOrmAuditSink`

**剩余差距**:
- 无任务历史视图（已完成工具调用的记录列表）
- 无取消/管理界面（无法从面板中断运行中的工具）
- 无指标聚合（成功率、平均耗时等）
- 无定时刷新或实时更新推送

---

## 5. 项目维度线程组织

**当前状态**: 🟡 CLI 命令已可用
- `SessionStore` — `listProjects()`, `setProjectMetadata()`, `getProjectMetadata()`
- `TypeOrmSessionStore` — 完整实现
- `AgentSessionProjectIndex`, `AgentSessionProjectMetadata` — 接口定义
- `28578fa4d`: `tsdi-agent project list`, `tsdi-agent project sessions <projectKey>`

**剩余差距**:
- `InMemorySessionStore` 可能未实现项目特性
- 无会话树/线程视图（如 Threads 风格的父子会话）
- 无按项目浏览会话的 TUI 视图
- 无工作空间的自动项目检测
- 无跨会话搜索或聚合查询

---

## 优先级建议

| 优先级 | 项 | 原因 |
|--------|-----|------|
| P0 | 标注持久化 | review 标注不持久，关闭后丢失 |
| P0 | 压缩指标 UI 展示 | 数据已捕获，只差面板展示 |
| P1 | 任务取消/管理 | dashboard 缺少关键交互 |
| P1 | 会话树视图 | 项目组织缺少核心可视化 |
| P2 | side-by-side diff | TUI 限制，非阻塞 |
| P2 | map_reduce/race 原语 | orchestrate 已覆盖多数场景 |
