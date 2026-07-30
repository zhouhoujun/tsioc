# Agents 后续打磨清单

## 结论

当前主干能力已齐，剩下主要是语义一致性、持久化边界和少量运行时行为修正。

## 已经完成

- 上下文压缩与状态展示
- `parallel_spawn` / `orchestrate` 的基础 DAG 编排
- Diff Review UI 的主流程
- `/projects`、`/toolruns` 等面板入口
- review 标注的 best-effort 记忆恢复

## 还需要继续打磨

### P0

- `DefaultApprovalAdapter` 的匹配逻辑不对，`pendingRequests(sessionId)` / `cancelRequest(toolName, sessionId)` 现在按错字段匹配。
- `/api/sessions/running` 不是“running”语义，只是“有消息的 session”。
- `orchestrate` 还没真正吃到 `maxTurns`，依赖失败也没有严格的 skip 语义。

### P1

- project/thread 归属模型还没统一，CLI、网关、UI、store 的分组口径不完全一致。
- review annotation 现在是当前 console/session 范围内的缓存，跨 session / 重启仍不够稳。
- `projectSummary`、todo 聚合、会话摘要的“代表项”选择偏启发式，容易选错最新活跃 session。

### P2

- `todo` 现在还是内存态，如果要当正式工件，得接入 session/project 持久层。
- `/projects` 和 `/search` 还能继续补跨会话聚合视图。
- dashboard 的任务历史、取消、统计和实时刷新还能继续补强。

## 建议顺序

1. 修 `approval`
2. 修 `/api/sessions/running`
3. 修 `orchestrate`
4. 统一 project/thread identity
5. 决定 `todo` 是否持久化
