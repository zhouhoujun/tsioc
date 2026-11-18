# agent-ui 基线与预算（P0）

日期：2026-11-18。分支：`7.tui`。目的：在 P1–P4 逐阶段实施前，固定可复跑的测试入口、
性能数字与预算阈值，避免"用单测耗时/代码推测宣布优化"。

## 1. 阶段划分与验收

| 阶段 | 内容 | 验收载体 | 状态 |
| --- | --- | --- | --- |
| P0 | 基线、预算与回归入口（本文档） | 全量 gate + 1k 消息切换基线 | 本提交 |
| P1 | 弹窗契约（与输入区同宽、贴输入框）+ `/sessions`、`/projects` 细节 | console-renderer / dialog-regressions / p236 | 已完成（`55324b026`） |
| P2 | 响应式利用与性能（投影/过滤缓存、批量写入、热点 getter、A/B） | 1k 消息 A/B + agent-ui 全套 + components-bench | 进行中 |
| P3 | Web 设置页（同一 schema、components/common 组件） | DOM 设置页测试 + 刷新持久化 + Web build | 待做 |
| P4 | 收尾（文档//help/which-key、全量 gate、真实 TUI/浏览器手测） | 全量 gate 12/12 | 待做 |

## 2. 测试基线（2026-11-18，`4ef0f7a84` + P0 文档）

| 包 | 结果 |
| --- | --- |
| `@tsdi/components` | 191 passing |
| `@tsdi/components/common` | 122 passing |
| `@tsdi/components/console` | 171 passing |
| `@tsdi/components/html` | 146 passing |
| `@tsdi/agent-ui` | 2214 passing（3.2 min） |
| tsc `agent-ui` | 通过 |
| Web 生产包 | 通过 |

弹窗相关定向套件（console-renderer / dialog-regressions / session-picker / p236 /
vm-panels）：191 passing。

## 3. 性能基线（4 tab × 1000 消息，viewport 32 行）

`openSession(id, { background: true })` 完整切换（含 paint，`Date.now()` 采样 8 次）：

| 指标 | 实测 |
| --- | --- |
| p50 | 76–77 ms |
| p95 | 91–93 ms |
| state（禁用 paint）p50/p90 | 59–63 / 74–81 ms（A/B 交替，负载 2–4） |
| 单次整屏 paint | 25–56 ms |
| 历史逐页加载 | 98–138 ms |

预算（负载 `load average ≤ 3` 时）：

- 完整切换 p50 ≤ 120 ms，p95 ≤ 200 ms；
- state p50 ≤ 90 ms；
- 不允许新增"每次读取都执行"的缓存/遍历（响应式核心热路径纪律见 AGENTS.md）。

对照：P2 首个优化前同 harness p50 87–140 ms（尖峰 195 ms）；优化后稳定在 76–77 ms。
两次被否决的优化（`removeDeps` 三元组、console 样式快路径）记录在 `todo.md`。

## 4. source-size 预算

- `packages/agents/**`：单文件 ≤ 600 行，已超额文件只降不升；
- `packages/components/common/**`：≤ 700 行；
- 本次基线：agents 与 components/common 全部达标。
- 已知外部阻塞（2026-11-18）：用户未提交的
  `packages/activities/src/visual/components/workflow-designer.component.ts`
  （1903 行 > 基线 1897）导致全量 gate 的 `source-size` 阶段失败；该文件不属于
  agent-ui 改动，**不得**通过调高基线或提交他人的工作来"修复"。

## 5. 复跑命令

```bash
# 单包
cd packages/agents/agent-ui && npm run test

# 完整 gate（workflow-designer 外部改动未清理时 source-size 会失败）
bash scripts/agents-gate.sh components components-common components-console \
  components-html agent-ui tsc-agent-ui source-size diff-check build-agent-ui-web

# 4 tab × 1000 消息切换（打印 p50/p95，frame 数断言）
cd packages/agents/agent-ui
cat > run-one.tmp.ts <<'EOF'
import { runTest } from '@tsdi/unit';
runTest(['./test/tab-switch-long-session.spec.ts'], { baseURL: __dirname })
    .catch((err: Error) => { console.error('RUNNER-FAIL', err); process.exit(1); });
EOF
npx ts-node --transpile-only -r tsconfig-paths/register run-one.tmp.ts
rm -f run-one.tmp.ts
```

## 6. 纪律

- 每阶段单独提交：测试、预算数字与文档同提交；
- 任何性能改动必须交替 A/B ≥3 轮（首次冷启动样本剔除），无收益立即回退；
- 不删除/降级既有用户功能；弹窗契约变更同步修测试，不放宽断言；
- 新增逻辑落新文件（<600 行）；触碰基线文件时同提交下调基线。
