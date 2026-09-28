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
| 8 | 主题与宽度矩阵 | 真实 PTY 切换 dark/light 主题与 80/120 列 | 主题 ANSI 色生效；CJK 根因、最终答复可见；所有视口行不破列 |
| 9 | 工具行按调用成行（v88） | 一条 assistant 消息内两个 `read_file` 调用（`README.md`/`package.json`） | 两条 pending 行各自独立、两条完成行各自带路径；无折叠、无 `+N more` |
| 10 | 旁白与最终回答分离（v84） | 一个 turn 内「旁白+工具」交错三轮后再给最终回答 | 三段旁白分别成行；`正在检查项目文件。同时读取种子数据。` 不出现为相邻粘连 |

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
| `FAKE_SCENARIO` | `default` | `plan-lifecycle` 走 P232 全生命周期脚本（只跑场景 4）；`tool-row-identity-v88` 只跑场景 9；`narration-separation-v84` 只跑场景 10 |
| `FAKE_LOG` | `$TMPDIR/tsdi-acceptance-fake-model.log` | 假模型请求侧记录。工具行静默不渲染时，这是唯一能区分「模型没发工具调用」与「TUI 没渲染」的证据 |

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

- [x] 暗色主题，80 列：真实 PTY 自动验收主题色、CJK 根因、最终答复与逐行显示宽度
- [x] 暗色主题，120 列：真实 PTY 自动验收主题色、CJK 根因、最终答复与逐行显示宽度
- [x] 亮色主题，80 列：真实 PTY 自动验收主题色、非颜色文本语义与逐行显示宽度
- [x] 亮色主题，120 列：真实 PTY 自动验收主题色、非颜色文本语义与逐行显示宽度

## 已知边界

- 场景 2 的 overlay 断言基于文案候选匹配；若面板标题文案变更，调整 `EXPECT_WHICHKEY`。
- 场景 3 依赖 `@tsdi/agent-tools` 的 `todo` 工具（`planning/todo.tool.ts`，入参
  `{todos:[{id,content,status}]}`）；若 schema 变更，同步修改 `fake_model_server.py::_turn`。
- 假模型按**最后一条 user 消息文案 + 本轮 tool 结果数**回放脚本（不再按请求序号，否则前置场景留下的
  tool 消息会污染后续路由），新增场景请扩展 `_default_turn`。
- 场景 9 只断言「每条调用各有其行、各自完成、无折叠」，**不**断言行数或「原地归并」：driver 只剥
  ANSI、不模拟屏幕，剥后的字节流横跨多帧，历史行仍在其中。数行会采样到历史而非屏幕；「是否原地
  归并」由 `agent-ui/test/turn-stream-tool-row-identity.spec.ts` 判定。已实测把 v88 的 per-invocation
  keying 还原成 v87 的 name-keyed 后本场景仍 PASS，故它是渲染冒烟，不是 v88 的回归门禁。
- 场景 10 断言用「两段旁白之间必须夹着工具行」这一间接证据（`_fused()` 去掉所有空白后查相邻粘连），
  对驱动端的重绘策略不敏感，且已在把 `sealStreamedNarration` 改成空操作后确认 FAIL。
- 场景 4（plan-lifecycle）使用 `TodoStatus`（`pending|in_progress|completed|cancelled|failed`）
  与 `dependsOn` 构造并行/失败/恢复/门禁剧本；假模型与驾驶员都需 `FAKE_SCENARIO=plan-lifecycle`，
  否则默认仍走 P200 三场景。
- 完整 PTY 端到端运行对终端与时序敏感，推荐在真实终端执行；自动化可验证假模型脚本、
  度量纯函数与 plan-eval 基线回归（agent-tools `test/plan-eval-bench.spec.ts`）。
