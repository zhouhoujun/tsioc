# Agent TUI · PTY 三场景验收（P200 / G123）

针对 P190 遗留的三个人工验收场景提供可复用脚手架：真实 PTY 内驱动 `tsdi-agent` chat，
用**假模型**（本地 OpenAI 兼容服务）注入脚本化回复，自动断言界面表现。

## 场景覆盖

| # | 场景 | 注入内容 | 自动断言 |
|---|------|----------|----------|
| 1 | 长回复尾部问询可见 | 120 行长回复，结尾"是否继续？" | 流式结束后问询出现在视口底部附近 |
| 2 | keymap overlay | 按键 `Ctrl+Alt+K`（which-key-toggle） | overlay 文案出现（候选词可用 env 调整） |
| 3 | plan 实时勾选 | 两次 `todo` 工具调用：pending → completed | `[ ] 计划项 A` 出现后翻转为 `[x]` |

## 运行

```bash
# 前置：agent-cli 已构建（bin/tsdi-agent.js 存在）
cd packages/agents/agent-cli && npm run build   # 如未构建

# 全量三场景
python3 packages/agents/acceptance/run_acceptance.py
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

依赖：Python 3 标准库（pty/http.server），Linux/macOS 可用；Windows 不支持。

## 人工验收清单（自动化之外仍需目检）

- [ ] 场景 1：滚动过程中**不闪跳**、无重影；问询行始终贴底不被截半
- [ ] 场景 2：overlay 打开/关闭各一次；布局切换（layout-toggle）后对齐正常；关闭后焦点回到输入框
- [ ] 场景 3：勾选翻转**由数据变化驱动**（无定时器轮询痕迹）；pending→completed 颜色/删除线符合主题
- [ ] 三场景全程状态栏（statusline）与终端标题随运行状态更新
- [ ] `Ctrl+C` 中断流式回复后界面恢复干净、可继续输入

## 已知边界

- 场景 2 的 overlay 断言基于文案候选匹配；若面板标题文案变更，调整 `EXPECT_WHICHKEY`。
- 场景 3 依赖 `@tsdi/agent-tools` 的 `todo` 工具（`planning/todo.tool.ts`，入参
  `{todos:[{id,content,status}]}`）；若 schema 变更，同步修改 `fake_model_server.py::_turn`。
- 假模型按请求序号回放脚本（长文 → pending → completed → 收尾语），新增场景请扩展 `_turn`。
