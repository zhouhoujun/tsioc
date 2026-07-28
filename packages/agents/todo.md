# @tsdi/agents 真实完成度评估

评估日期：2026-07-28

这份文档替代之前的分析转录，按当前代码状态重新整理 `@tsdi/agents` 的完成度。

## 总体判断

- 整体完成度：约 `75%-85%`
- 如果只按高优先级能力清单统计：约 `7/11` 到 `8/11`
- 当前已经不是“缺很多基础能力”的阶段，主要差距集中在：
  - 更强的长时上下文压缩
  - 更成熟的多 Agent 并行编排
  - 更完整的 Diff Review / Dashboard 产品化体验

## 已实现能力

| 能力 | 状态 | 说明 |
|---|---|---|
| 文件系统操作 | done | `read_file` / `write_file` / `edit_file` / `list_dir` / `glob_search` / `watch_files` 已具备 |
| Shell / 终端执行 | done | `terminal` / `process.start` / `process.poll` / `process.kill` 可用 |
| Git 操作 | done | `git_operations` 已覆盖 status/diff/show/branch/worktree 等 |
| 规划能力 | done | `todo` / `ask_user` / `escalate` / `coding_task plan` 已具备 |
| 多任务处理 / 持久线程 | done | session store、scheduler、session service 已形成基础闭环 |
| 模型路由 | done | `RoutedModelAdapter` 已支持复杂度与关键字路由 |
| 工具执行控制面 | done | `ToolExecutionCoordinator`、schema 校验、审计 receipt 已具备 |
| 审批 / 人工确认 | done | approval manager + UI + gateway 路径已贯通 |
| 经验蒸馏 | done | `ExperienceDistiller` 已接入 runtime |
| GUI 控制台 | done | `agent-ui` 已形成完整控制台面板体系 |
| MCP 工具集成 | done | MCP registry / list / call / session activation 已具备 |

## 部分实现能力

| 能力 | 状态 | 说明 |
|---|---|---|
| 智能上下文压缩 | partial | 已有 `AgentContextManager` + `LLMSessionSummarizer`，但“智能度”仍不足 |
| 多 Agent 并行 | partial | 已有 `spawn_agent`、并行工具执行、parallel worktree 基础，但高层编排仍偏弱 |
| Diff Review UI | partial | 已有 review/tasks 面板、diff 摘要、rollback 信息，但还不是专门化 review 产品 |
| 后台任务仪表板 | partial | jobs/tasks/review 面板已存在，但 dashboard 能力还不完整 |
| 项目维度线程组织 | partial | session 已按 workspace 分组，但缺项目主线 / 任务根请求 / 跨会话聚合 |
| 提示缓存优化 | partial | provider 侧已有 prompt cache 选项，但还未形成统一优化策略 |
| 沙箱代码执行 | partial | 已有 `SandboxExecutor` 与 policy hooks，但隔离强度和统一性仍有限 |
| 屏幕截取 / GUI 操作 | partial | `screenshot` / `gui_control` 工具已具备，依赖适配器接入 |

## 已从“缺失”变为“已落地”的能力

这些项在旧分析里被列为缺失，但现在已经不应继续标记为 missing：

| 能力 | 当前判断 | 依据 |
|---|---|---|
| Git Worktree 隔离 | done | `coding_task` 已支持 `useWorktree`，自动创建/合并/清理 worktree |
| Checkpoint / 回滚 | done | 通用 `checkpoint` 工具 + `coding_task.rollback` 已具备 |
| 文件监听 / 热更新基础 | done | `watch_files` 工具已存在 |
| 屏幕截取 / GUI 操作 | partial | 工具接口已存在，不再是 0 到 1 |

## 高优先级清单重排

### P0

| 能力 | 状态 | 结论 |
|---|---|---|
| 智能上下文压缩 | partial | 仍是最值得继续做的核心差距 |
| Git Worktree 隔离 | done | 已基本完成，不再属于待启动项 |

### P1

| 能力 | 状态 | 结论 |
|---|---|---|
| 多 Agent 并行 | partial | 该做，但基线能力已存在 |
| 专用 Diff Review UI | partial | 可以继续产品化 |
| Checkpoint / 回滚 | done | 已完成主干能力 |

### P2

| 能力 | 状态 | 结论 |
|---|---|---|
| 屏幕截取 / GUI 操作 | partial | 重点在适配器和体验，不是核心框架缺失 |
| 后台任务仪表板 | partial | 已有 panels 基础，可继续增强 |
| 项目维度线程组织 | partial | 仍值得做，尤其是项目主线与会话聚合 |

### P3

| 能力 | 状态 | 结论 |
|---|---|---|
| 提示缓存优化 | partial | 有基础，无统一策略 |
| 沙箱代码执行 | partial | 有框架，无强隔离统一实现 |
| 文件监听 | done | 已具备，不应继续列为缺失 |

## 关键代码锚点

- 上下文压缩：`packages/agents/agent/src/context/AgentContextManager.ts`
- LLM 摘要：`packages/agents/agent/src/memory/LLMSessionSummarizer.ts`
- Worktree / 回滚：`packages/agents/agent-tools/coding/coding-task.tool.ts`
- 通用 checkpoint：`packages/agents/agent-tools/approval/checkpoint.tool.ts`
- Git worktree 操作：`packages/agents/agent-tools/git/git-operations.tool.ts`
- 截图 / GUI：`packages/agents/agent-tools/capture/screenshot.tool.ts`、`packages/agents/agent-tools/capture/gui-control.tool.ts`
- 文件监听：`packages/agents/agent-tools/files/watch-files.tool.ts`
- 项目分组 session：`packages/agents/agent-ui/src/AgentConsoleSessionService.ts`
- Review / Tasks / Jobs UI：`packages/agents/agent-ui/src/AgentConsolePanels.ts`

## 下一步建议

按投入产出比，建议这样排：

1. 强化上下文压缩
2. 补齐多 Agent 高层编排
3. 做专用 Diff Review UI
4. 做项目主线 / 跨会话组织
5. 最后再统一 prompt cache 与 sandbox 策略

## 可执行路线图

### M1. 强化上下文压缩

目标：让长会话不再主要依赖简单裁剪，而是稳定保留目标、决策、改动与未完成项。

建议任务：

- 为 `AgentContextManager` 增加更明确的压缩触发条件
- 区分“最近对话保留窗口”和“远端历史摘要窗口”
- 为 `LLMSessionSummarizer` 增加更稳定的结构化输出约束
- 为工具结果引入更细粒度的保留策略，避免大块 tool output 挤占上下文
- 增加长会话回归测试，覆盖多轮设计、编码、回滚、继续追问场景

验收标准：

- 连续多轮 `继续` 后，模型仍能稳定复述当前任务目标
- 已修改文件、失败原因、待办事项不会在压缩后丢失
- 长会话下空响应率和重复提问率明显下降

依赖：

- `AgentContextManager`
- `LLMSessionSummarizer`
- 现有 session message / tool message 结构

主要风险：

- 摘要过度压缩导致关键文件路径或失败上下文丢失
- 触发条件过于激进，反而让短会话成本升高
- 不同 provider 下摘要风格波动太大

建议交付物：

- compaction strategy 设计文档
- 长会话 regression 用例集
- 一组可观测指标：压缩次数、压缩前后 token、空响应率、重复提问率

### M2. 补齐多 Agent 高层编排

目标：把现有 `spawn_agent`、parallel tool execution、parallel worktree 基础，提升成可稳定使用的多 worker 工作流。

建议任务：

- 定义主 agent / worker agent 的职责边界
- 为 `spawn_agent` 增加结构化 delegation payload 规范
- 把 worker 结果标准化为 summary / diff / artifact / next-step
- 让主 agent 能聚合多个 worker 结果并继续推进
- 为并行 worker 增加失败隔离和重试策略

验收标准：

- 一个任务可拆成多个并行子任务并被主 agent 汇总
- 单个 worker 失败不会让整个任务状态不可恢复
- review 面板可看到 worker 数、状态、diff 摘要

依赖：

- `spawn_agent`
- `coding_task` parallel worktree
- review / task result 数据结构

主要风险：

- worker 返回格式不稳定，主 agent 难以汇总
- 并行子任务的上下文边界不清晰，导致重复工作
- worktree 生命周期处理不当会残留脏分支或目录

建议交付物：

- delegation payload 协议
- worker result schema
- 主 agent 聚合策略与失败恢复策略文档

### M3. 专用 Diff Review UI

目标：把现有 review/tasks 面板升级成真正可用的 diff 审查界面。

建议任务：

- 提供文件级 diff 导航而不是只看摘要文本
- 支持按 worker / 文件 / patch 分组浏览
- 支持 review 结论、风险提示、回滚入口集中展示
- 补充“仅看新增”“仅看失败任务”“仅看可回滚任务”等过滤能力

验收标准：

- 用户可在一个面板里完成查看 diff、判断风险、触发回滚
- review 场景不再依赖读取大段原始文本 diff

依赖：

- `coding_task` diff / rollback 元数据
- `AgentConsolePanels` 现有 review/tasks 面板
- gateway / app-rpc 的任务详情接口

主要风险：

- diff 体量大时，控制台渲染性能下降
- worker 维度、文件维度、patch 维度之间的导航容易复杂化
- 纯 TUI 体验可能限制高级交互

建议交付物：

- review panel 信息架构草图
- diff 数据模型
- reviewer 流程用例：查看、筛选、确认、回滚

### M4. 项目主线与跨会话组织

目标：让 session 不只是按 workspace 分桶，而是能围绕同一项目主线持续推进。

建议任务：

- 定义“任务根请求 / 项目主线 / 当前阶段”的元数据结构
- 为 session 建立 project-level 索引
- 支持在 UI 中查看同一项目下的多个相关 session
- 让总结、待办、review 可以按项目聚合

验收标准：

- 同一 workspace 下可以识别多个独立任务主线
- 用户能快速找到“这个项目当前做到了哪里”

依赖：

- session store 的 workspace 字段
- `AgentConsoleSessionService` 分组能力
- 现有 summary / todo / review 数据

主要风险：

- “项目”和“任务主线”边界不清，容易混淆
- 同一 session 中可能存在多个主题切换，归属规则需要稳定
- 过多元数据会增加迁移和兼容成本

建议交付物：

- project/session/thread 元数据模型
- session 归类规则
- UI 中的项目索引和主线摘要展示原型

### M5. 统一 prompt cache 与 sandbox 策略

目标：把已有 provider 级 cache 和 execution policy hooks 收敛成一套统一能力。

建议任务：

- 梳理各 provider 的 prompt cache 差异
- 为 runtime 增加统一的 cache policy 配置层
- 明确 sandbox 能力分级：轻量限制、命令级限制、强隔离执行
- 为不同 tool 类型定义默认 sandbox policy

验收标准：

- 用户能用统一配置开启或关闭 cache / sandbox 能力
- 不同执行工具的隔离行为可预测、可测试、可审计

依赖：

- provider 侧已有 prompt cache 实现
- `SandboxExecutor`
- `ToolExecutionCoordinator` / tool execution policy

主要风险：

- provider 差异太大，统一层可能变成最低公分母
- sandbox 策略统一后，可能影响已有工具兼容性
- 缺少统一观测会让策略调整难以回归验证

建议交付物：

- cache policy 配置模型
- sandbox capability matrix
- 兼容性测试矩阵：terminal / git / ai_cli / process / code execution

## 建议排序

如果按真实落地顺序执行，建议：

1. `M1` 上下文压缩
2. `M3` Diff Review UI
3. `M2` 多 Agent 高层编排
4. `M4` 项目主线与跨会话组织
5. `M5` prompt cache 与 sandbox 统一策略

原因：

- `M1` 直接影响长会话可用性，是当前最核心短板
- `M3` 最容易把已有能力转成用户可感知体验
- `M2` 的价值高，但依赖前两项稳定后更容易收敛
- `M4` 和 `M5` 更偏平台化收尾

## 建议拆票方式

为了后续能直接进 backlog，建议每个里程碑都拆成三类票：

- framework：运行时、tool、store、adapter、policy
- ui：console panel、review flow、dashboard flow、session organization
- tests：runtime loop、tool integration、ui renderer、long-session regression

推荐每个里程碑至少拆出这些最小票型：

- 1 个 architecture ticket：定义边界、数据模型、事件流
- 2-4 个 implementation tickets：按 runtime / tool / ui 拆开
- 1 个 integration ticket：打通 gateway、app-rpc、ui
- 1 个 regression ticket：补自动化验证

## 建议排期方式

建议不要按“大版本一次做完”推进，而是按下面的节奏：

1. 先做一个最小闭环版本
2. 再补观测与回归测试
3. 最后补体验增强和边界情况

更具体地说：

- `M1` 和 `M3` 适合先做 MVP，再快速补测试
- `M2` 和 `M4` 适合先定协议和数据模型，再做 UI
- `M5` 适合最后统一收口，避免过早冻结策略

## Backlog 草案

下面这组票可以直接作为 backlog 初稿使用。

状态约定：

- `[ ]` 未开始
- `[-]` 进行中
- `[x]` 已完成

### M1 上下文压缩

- `[ ]` `AGENT-M1-ARCH`：定义 compaction strategy，包括触发条件、保留窗口、摘要结构、tool output 保留规则
- `[ ]` `AGENT-M1-RUNTIME-1`：在 `AgentContextManager` 中实现最近消息窗口与远端摘要窗口分层保留
- `[ ]` `AGENT-M1-RUNTIME-2`：为 `LLMSessionSummarizer` 增加结构化摘要 schema 与稳定字段约束
- `[ ]` `AGENT-M1-RUNTIME-3`：为大体积 tool output 引入按类型裁剪与摘要策略
- `[ ]` `AGENT-M1-TEST`：补长会话 regression 用例，覆盖多轮 `继续`、工具失败、回滚、追问
- `[ ]` `AGENT-M1-OBS`：补压缩指标采集，包括压缩次数、token 变化、空响应率、重复提问率

### M2 多 Agent 编排

- `[ ]` `AGENT-M2-ARCH`：定义主 agent / worker agent delegation payload 与 result schema
- `[ ]` `AGENT-M2-RUNTIME-1`：让 `spawn_agent` 输出标准化 summary / diff / artifact / next-step
- `[ ]` `AGENT-M2-RUNTIME-2`：为主 agent 增加多 worker 结果聚合与失败隔离策略
- `[ ]` `AGENT-M2-RUNTIME-3`：为并行 worker 增加重试与超时回收机制
- `[ ]` `AGENT-M2-UI`：在 review / tasks 面板展示 worker 数量、状态、摘要与失败原因
- `[ ]` `AGENT-M2-TEST`：补并行 delegation 集成测试，覆盖部分失败与重试场景

### M3 Diff Review UI

- `[ ]` `AGENT-M3-ARCH`：定义 review panel 的 diff 数据模型、导航结构与筛选维度
- `[x]` `AGENT-M3-UI-1`：支持文件级 diff 导航，不再只停留在摘要文本
- `[ ]` `AGENT-M3-UI-2`：支持按 worker / 文件 / patch 分组浏览
- `[ ]` `AGENT-M3-UI-3`：集中展示 review 结论、风险提示与回滚入口
- `[ ]` `AGENT-M3-UI-4`：增加“仅看失败任务”“仅看可回滚任务”，并补齐“仅看新增”过滤
- `[ ]` `AGENT-M3-TEST`：补大 diff 渲染性能与交互回归测试

### M4 项目主线与跨会话组织

- `[ ]` `AGENT-M4-ARCH`：定义 project / session / thread 元数据模型与归类规则
- `[ ]` `AGENT-M4-STORE`：为 session store 增加 project-level 索引能力
- `[ ]` `AGENT-M4-UI-1`：在 UI 中支持同项目相关 session 聚合浏览
- `[ ]` `AGENT-M4-UI-2`：让 summary / todo / review 可以按项目主线聚合展示
- `[ ]` `AGENT-M4-TEST`：补多主题切换、跨 session 聚合与兼容性测试

### M5 Prompt Cache 与 Sandbox

- `[ ]` `AGENT-M5-ARCH`：定义统一 cache policy 与 sandbox capability matrix
- `[ ]` `AGENT-M5-RUNTIME-1`：为 runtime 增加统一 prompt cache 配置层
- `[ ]` `AGENT-M5-RUNTIME-2`：为不同工具类型定义默认 sandbox policy
- `[ ]` `AGENT-M5-RUNTIME-3`：把 provider 差异映射到统一观测与策略层
- `[ ]` `AGENT-M5-TEST`：补 terminal / git / ai_cli / process / code execution 兼容矩阵

### 已完成的近期修复

- `[x]` 长消息折叠提示从 `enter open` 改成 `/messages`，避免误导用户在输入框里继续输入
- `[x]` 折叠消息支持点击直接展开 / 收起 detail
- `[x]` tool failure / approval failure 不再污染主 assistant transcript
- `[x]` 无焦点消息列表保留“最近的有效用户主请求”，避免连续 `继续` 把原始需求顶掉
- `[x]` 针对纯设计 / 方案类请求，prompt 避免不必要地调用 `todo` / `project_intel`
- `[x]` `project_intel` 在未传 `action` 时默认回退到 `summary`
- `[x]` `simples/todo.md` 已迁移为 `packages/agents/todo.md`

## 当前结论

`@tsdi/agents` 已经跨过“只有基础工具能力”的阶段。

现在更准确的描述是：

- 基础编程 Agent 能力：已完成
- 长时自治能力：部分完成
- 并行协作能力：部分完成
- 产品化控制台体验：部分完成

真正还需要持续投入的，不是再补“有没有”，而是补“够不够强、够不够顺手、够不够稳定”。
