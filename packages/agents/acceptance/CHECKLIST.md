# Agent TUI · PTY 验收（P200 / G123）

针对 P190 遗留的人工验收场景提供可复用脚手架：真实 PTY 内驱动 `tsdi-agent` chat，
用**假模型**（本地 OpenAI 兼容服务）注入脚本化回复，自动断言界面表现。

## 场景覆盖

| # | 场景 | 注入内容 | 自动断言 |
|---|------|----------|----------|
| 1 | 长回复尾部问询可见 | 120 行长回复，结尾"是否继续？" | 流式结束后问询出现在视口底部附近 |
| 2 | keymap overlay | 按键 `Ctrl+Alt+K`（which-key-toggle） | overlay 文案出现（候选词可用 env 调整） |
| 3 | plan 实时勾选 | 两次 `todo` 工具调用：pending → completed | `[ ] 计划项 A` 出现后翻转为 `[x]` |
| 4 | plan 全生命周期（P232B） | `todo` 脚本：建计划(4 步并行)→运行→失败→确认 retry→恢复→review gate→完成 | 创建→并行→失败→恢复→门禁→完成各阶段依次出现；记录首屏步骤可见率/失败定位按键数/event-to-UI 延迟 |
| 5 | 命令结果回看（P262） | `/usage` → `Ctrl+O` 打开 outputs 面板 → `Esc` 收起 | `/usage` 摘要出现；面板标题 `command outputs` + `/usage` 条目可见；Esc 后面板关闭 |
| 6 | slash 命令修正（P282） | 无效 `/statusline` verb → 修正后重试 | 诊断保留 draft；修正后成功并清空 composer |
| 7 | 运行中断与秒跳 | 慢速流式回复；观察 Working 后发送 `Ctrl+C`，再启动一轮发送 `Esc` | Working 依次出现 0s/1s/2s；两个按键均取消 turn 并恢复 composer |

## 运行

```bash
# 前置：agent-cli 已构建（bin/tsdi-agent.js 存在）
cd packages/agents/agent-cli && npm run build   # 如未构建

# 全量默认场景
python3 packages/agents/acceptance/run_acceptance.py

# P232 part B 计划全生命周期场景（假模型与该驾驶员均切到 plan-lifecycle）
FAKE_SCENARIO=plan-lifecycle python3 packages/agents/acceptance/run_acceptance.py
```

脚本自动完成：启动假模型 → 以 env 注入 `AGENT_PROVIDER/AGENT_MODEL/AGENT_API_KEY/AGENT_BASE_URL`
→ 在 PTY 中 spawn CLI → 逐场景发送输入并断言 → 失败时转储现场到
`packages/agents/acceptance/artifacts/<时间戳>/scenario-*.log`（原始字节 + 去 ANSI 文本）。
退出码 0 = 全部通过。

## 环境变量

| 变量 | 默认 | 说明 |
|------|------|------|
| `AGENT_CMD` | `npm run --silent chat --prefix packages/agents/agent-cli` | 被测命令，可换成已安装的 `tsdi-agent chat` |
| `ACCEPTANCE_TIMEOUT` | `90` | 单次等待超时（秒） |
| `EXPECT_WHICHKEY` | `which-key,Which-Key,…` | 场景 2 overlay 文案候选（逗号分隔） |
| `EXPECT_TODO_LABEL` | `计划项 A` | 场景 3 计划项文案（需与 `FAKE_TODO_CONTENT` 一致） |
| `FAKE_TODO_CONTENT` | `计划项 A` | 假模型侧计划项文案 |
| `FAKE_SCENARIO` | `default` | `plan-lifecycle` 时假模型回放 P232 全生命周期脚本，驾驶员只跑场景 4 |

依赖：Python 3（`run_acceptance.py` 需 3.8+，`|` 联合类型写法已改为 `Optional`），
标准库（pty/http.server），Linux/macOS 可用；Windows 不支持。

## P232 part B 度量（场景 4 自动输出 `[metric]` 行）

- **首屏当前步骤可见率**：plan 首次渲染后，当前 `in_progress`（并行运行）步骤中可见的比例。
- **失败定位按键数**：从当前焦点到失败步骤所需按键数（模拟确认输入的 `y\r`）。
- **event-to-UI 延迟**：假模型状态变更事件到界面出现该行的毫秒数（monotonic 时钟）。

度量阈值（2026-09-12 真实终端验收回填，`fake_model_server.py` plan-lifecycle 脚本 P232B）：

| 指标 | 阈值 | 实测值 | 说明 |
|------|------|--------|------|
| 首屏当前步骤可见率 | ≥ 1.0 | 1.00 | plan 首次渲染后并行 `in_progress` 步骤全部可见 |
| 失败定位按键数 | ≤ 1 | 1 | 焦点到失败步骤输入的 `y\r` 确认键数 |
| event-to-UI 延迟 | ≤ 3000ms | 2026ms | 假模型状态变更事件到界面出现该行的毫秒数 |

自动断言检查阶段是否出现在视口与可见率 ≥ 0.5；上表由人工在真实终端验收时回填。

## 人工验收清单（自动化之外仍需目检）

- [ ] 场景 1：滚动过程中**不闪跳**、无重影；问询行始终贴底不被截半
- [ ] 场景 2：overlay 打开/关闭各一次；布局切换（layout-toggle）后对齐正常；关闭后焦点回到输入框
- [ ] 场景 3：勾选翻转**由数据变化驱动**（无定时器轮询痕迹）；pending→completed 颜色/删除线符合主题
- [ ] 全场景运行期间状态栏（statusline）与终端标题随运行状态更新
- [x] `Ctrl+C` / `Esc` 中断慢速流式回复后界面恢复干净、可继续输入（场景 7 自动验收）

### P304 Timeline 截图矩阵

使用 `timeline-naturalized` 稳定场景逐格目检；截图是本地验收产物，放入忽略的
`packages/agents/acceptance/artifacts/`，不得提交到仓库。

- [ ] 暗色主题，80 列：tool lifecycle、plan step、retry、approval、error、file change 顺序清晰，CJK 不破列
- [ ] 暗色主题，120 列：对象与状态 meta 对齐，错误根因未被折叠
- [ ] 亮色主题，80 列：状态不只依赖颜色，选中/焦点与正文仍有足够区分
- [ ] 亮色主题，120 列：主行无重复 lifecycle，详情入口和层级轨道清晰

## 已知边界

- 场景 2 的 overlay 断言基于文案候选匹配；若面板标题文案变更，调整 `EXPECT_WHICHKEY`。
- 场景 3 依赖 `@tsdi/agent-tools` 的 `todo` 工具（`planning/todo.tool.ts`，入参
  `{todos:[{id,content,status}]}`）；若 schema 变更，同步修改 `fake_model_server.py::_turn`。
- 假模型按请求序号回放脚本（长文 → pending → completed → 收尾语），新增场景请扩展 `_turn`。
- 场景 4（plan-lifecycle）使用 `TodoStatus`（`pending|in_progress|completed|cancelled|failed`）
  与 `dependsOn` 构造并行/失败/恢复/门禁剧本；假模型与驾驶员都需 `FAKE_SCENARIO=plan-lifecycle`，
  否则默认仍走 P200 三场景。
- 完整 PTY 端到端运行对终端与时序敏感，推荐在真实终端执行；自动化可验证假模型脚本、
  度量纯函数与 plan-eval 基线回归（agent-tools `test/plan-eval-bench.spec.ts`）。
