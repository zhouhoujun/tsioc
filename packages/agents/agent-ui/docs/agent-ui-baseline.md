# agent-ui 基线与预算（P0）

日期：2026-11-18。分支：`7.tui`。目的：在 P1–P4 逐阶段实施前，固定可复跑的测试入口、
性能数字与预算阈值，避免"用单测耗时/代码推测宣布优化"。

## 1. 阶段划分与验收

| 阶段 | 内容 | 验收载体 | 状态 |
| --- | --- | --- | --- |
| P0 | 基线、预算与回归入口（本文档） | 全量 gate + 1k 消息切换基线 | 本提交 |
| P1 | 弹窗契约（与输入区同宽、贴输入框）+ `/sessions`、`/projects` 细节 | console-renderer / dialog-regressions / p236 | 已完成（`55324b026`） |
| P2 | 响应式利用与性能（投影/过滤缓存、批量写入、热点 getter、A/B） | 1k 消息 A/B + agent-ui 全套 + components-bench | 进行中 |
| P3 | Web 设置页（同一 schema、components/common 组件） | DOM 设置页测试 + 刷新持久化 + Web build | 已完成 |
| P4 | 收尾（README/dialog matrix、全量 gate + DOM/TUI/预算） | 全量 gate 13/14 + bench 全绿（source-size 外部阻塞） | 已完成 |

## 2. 测试基线（2026-11-18，`4ef0f7a84` + P0 文档）

| 包 | 结果 |
| --- | --- |
| `@tsdi/components` | 191 passing |
| `@tsdi/components/common` | 122 passing |
| `@tsdi/components/console` | 171 passing |
| `@tsdi/components/html` | 146 passing |
| `@tsdi/agent-ui` | 2222 passing（2.4 min，含设置页 4 用例 + 侧栏 2 用例） |
| tsc `agent-ui` | 通过 |
| Web 生产包 | 通过 |

弹窗相关定向套件（console-renderer / dialog-regressions / session-picker / p236 /
vm-panels）：191 passing。

## 3. 性能基线（4 tab × 1000 消息，viewport 32 行）

`openSession(id, { background: true })` 完整切换（含 paint，`Date.now()` 采样 8 次）：

| 指标 | 实测 |
| --- | --- |
| p50 | 76–115 ms（多轮，负载 2.0–2.4） |
| p95 | 91–150 ms |
| state（禁用 paint）p50/p90 | 59–63 / 74–81 ms（A/B 交替，负载 2–4） |
| 单次整屏 paint | 25–56 ms |
| 历史逐页加载 | 98–138 ms |

预算（负载 `load average ≤ 3` 时）：

- 完整切换 p50 ≤ 120 ms，p95 ≤ 200 ms；
- state p50 ≤ 90 ms；
- 不允许新增"每次读取都执行"的缓存/遍历（响应式核心热路径纪律见 AGENTS.md）。

对照：P2 首个优化前同 harness p50 87–140 ms（尖峰 195 ms）；P2 后 76–115 ms（含负载波动）。
两次被否决的优化（`removeDeps` 三元组、console 样式快路径）记录在 `todo.md`。

## 4. source-size 预算

- `packages/agents/**`：单文件 ≤ 600 行，已超额文件只降不升；
- `packages/components/common/**`：≤ 700 行；
- 本次基线：agents 与 components/common 全部达标。
- P4 全量 gate（2026-11-18）：components ×4 / agent-ui / tsc / diff-check / web build /
  dom-gate / dom-gate-matrix / tui-gate / gate-regression 全部 PASS；`components-bench` 全部
  BENCH-OK（trigger 703ms ≤ 1500，v-for reorder 340ms ≤ 1000，viewchildren 186ms ≤ 800）。
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

## 7. 测试运行方式（2026-11-20）

`npm run test` 现在按“重 spec 独立 + 其余按原序三等分”分 5 组并行（`unit.ts`），
并在内存不足时自动合并分组（1–5 组，阈值 1.2GB/worker）：

- 组：`console-renderer`、`session-tabs`、`remainder-1..3`（原序连续切片）。
  连续切片很重要：早前按耗时均衡的随机组合会让 DOM 相关文件以新顺序相遇，
  暴露 teardown 顺序假设（销毁视图的绑定在 teardown 中重跑）。
- 覆盖完整性：每组独立验证 + 汇总运行均为 2231 passing
  （109 + 11 + 743 + 598 + 770；含 3 个分组自检用例）；`test/test-groups.spec.ts`
  断言 1–5 组时每个 spec 恰好出现一次。
- 开关：`AGENT_UI_TEST_GROUPS=<1..5>` 强制组数，`AGENT_UI_TEST_SHARDS=1` 回到单进程；
  `npm run test:coverage`（`-c`）始终单进程以保证一份 coverage 报告。
- 实测（同一主机，负载有波动）：

| 方式 | 墙钟 | 说明 |
| --- | --- | --- |
| 单进程（基线） | 209s（低负载）/ 519s（多任务并发时） | 2231 passing |
| 5 组 | **120.2s**（6.5GB 可用）/ 144.3s（gate 当次） | 全部 5 组 green |
| 2 组合并 | 141.6s | 覆盖完整（2122 + 109） |

- 说明：并行收益受宿主机内存/负载影响很大。内存紧张时会自动退回更少分组，
  避免 5 个 ts-node 进程换页反而变慢。`AGENT_UI_TEST_GROUPS=1` 可复现旧行为。

## 9. 2026-11-20 更新（P2/P3 收尾）

测试基线（同一分支 `7.tui`，提交 `9d29d7a6a` 之后）：

| 包 | 结果 |
| --- | --- |
| `@tsdi/agent` | 1082 passing |
| `@tsdi/agent-gateway` | 396 passing |
| `@tsdi/agent-ui` | **2265 passing**（4 组，108.6s：109 + 11 + 754 + 1391） |
| tsc | agent / agent-ui / agent-gateway 通过 |
| source-size / diff-check / production-db-integrity | 通过 |

说明：

- 本次按可用内存自动选择 4 组；5 组仍可通过 `AGENT_UI_TEST_GROUPS=5` 强制复跑。
- `source-size` 的外部阻塞（activities workflow-designer）已不再阻塞，当前全量通过。
- 投影缓存（按 transcript 复用 display 列表）微基准约 5%，已并入 P2；
  1k tab 切换仍是后续预算项，未宣称达到 ≤70ms 目标。
- P3 已完成：tab 键盘循环/恢复、`@file#Lx-Ly`、Web/PWA 通知、`/btw`、
  项目级 durable allow（`p` / `/permissions allow`）。
- P3 剩余：会话级 undo/redo（恢复 prompt）、ordered approval rules 与 shell 命令扫描器、
  LSP 诊断/formatter。
