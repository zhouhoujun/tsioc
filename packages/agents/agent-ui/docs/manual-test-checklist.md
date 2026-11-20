# Agent UI 手测清单（P4）

日期：2026-11-20。覆盖本轮新增的 LSP、权限规则、队列、默认 profile、release highlights 与
持久化 turn 撤销。PTY 与浏览器都必须验证；不能用单元测试代替用户可见行为。

## 1. 前置

- 使用独立临时 HOME/workspace，避免触碰 `~/.tsdi-agent/agent.db`：
  ```bash
  export HOME=$(mktemp -d)
  cd $(mktemp -d)
  ```
- 至少配置一个 LSP server（例如 TypeScript）：
  ```json
  { "agentTools": { "lsp": { "servers": { ".ts": { "command": "typescript-language-server", "args": ["--stdio"] } } } } }
  ```
  同时验证未配置 server 的扩展名（如 `.py`）。

## 2. TUI / PTY

### 2.1 LSP 诊断与格式化

1. 运行 `/check src/a.ts`：
   - 有 server：显示 `N errors · M warnings`，行号为 `file:line:col`；
   - 无 server：显示安装提示，不崩溃；
   - 多文件时一个失败不影响其它文件。
2. `/lsp src/a.ts` 与 `/check` 等价。
3. `/format src/a.ts --check`：只预览，文件内容不变。
4. `/format src/a.ts`：文件被格式化；再运行一次显示 `already formatted`。
5. 无参数 `/check` / `/format` 只显示用法，不扫描工作区。

### 2.2 Release highlights

1. 全新 workspace：首次启动不自动弹窗；`/highlights` 可打开并记录版本。
2. 手动改小 `settings.json` 的 `highlightsSeenVersion` 后重启：自动展示一次。
3. 设置页 General 关闭 “Release highlights” 后，改小版本并重启：不再自动展示；`/highlights` 仍可手动打开。
4. `/whatsnew` 与 `/highlights` 等价。

### 2.3 Agent 默认 profile

1. `/agents default` 显示当前默认（默认 build）。
2. `/agents default plan` 后新建会话（`+` 或 `/new`）：composer 显示 `agent plan`。
3. 重启 TUI：默认仍为 plan；恢复旧会话不强制覆盖其显式 profile。
4. `/agents default missing` 拒绝并提示未知 profile。

### 2.4 权限规则

1. `/permissions rules` 列出现有规则（默认含 `shell.exec`、`fs.write`）。
2. `/permissions rules add allow sandbox "git status*"` 后：
   - `/permissions rules` 最后一条为 `allow sandbox git status*`；
   - `/permissions inspect terminal "git status"` 显示 `Approval rule: ALLOW` 与规则序号；
   - 真实触发 `terminal`（git status）不再询问；其它 shell 命令仍询问。
3. `/permissions rules add deny fs` 后写文件被拒绝/询问（按 deny 语义）。
4. `/permissions rules remove <n>` 删除指定规则；删除最后一条回到默认规则。
5. `/permissions rules clear` 不发 `confirm` 时只提示；`clear confirm` 重置默认规则。
6. 重启 TUI 后规则仍在；Web/attach 下通过 `/permissions rules` 修改后，浏览器与终端看到同一规则。

### 2.5 队列管理

1. turn 运行中按 Tab 排入 3 条 prompt。
2. `/queue manage`：选中第 1 条 → `Move down`，`/queue` 顺序变化且计数不变。
3. 选中条目 → `Edit prompt`：条目移出队列并回到输入框（附件保留）。
4. 选中条目 → `Remove`；顶部执行 `Move up`、底部执行 `Move down` 有边界提示。
5. `/queue move 1 3` 与面板结果一致。

### 2.6 Turn 撤销跨重启

1. 让 agent 修改一个文件，记下改动。
2. 退出 TUI 并重新启动同一 workspace/session。
3. `/undo`：prompt 回到输入框，消息回退，文件恢复到修改前。
4. `/redo`：消息与文件改动恢复。
5. 会话删除后再次启动：不应出现已删除会话的撤销历史。

## 3. 浏览器 / Web

1. `tsdi-agent serve`（或 TUI `/web`）打开 console。
2. 依次执行 `/check`、`/format --check`、`/highlights`、`/permissions rules`、`/queue manage`、
   `/agents default`，确认与 TUI 行为一致。
3. 在浏览器修改权限规则/默认 profile 后刷新页面：
   - `settings.json` 保持修改；
   - 终端 attach 的同一 session 也生效。
4. 队列面板在窄屏（移动端抽屉）可操作，不遮挡输入框。
5. `/format` 写入受 workspace trust 保护：未信任 workspace 应拒绝并给出 trust 指引。

## 4. 数据与门禁

- 旧数据库升级启动后 session/message/memory 完整保留；新增 `AgentTurnHistoryEntity` 表不影响旧数据。
- 不允许删库迁移；测试必须使用临时 HOME/DB。
- 收尾命令：
  ```bash
  bash scripts/agents-gate.sh tsc-agent tsc-agent-tools tsc-agent-ui tsc-agent-gateway \
    source-size diff-check production-db-integrity
  git diff --check
  ```
- 涉及 components 的改动另跑 components ×4 + bench；本轮 agent-ui/agent 改动不需要改 components。
- Web 预算：`npm run build:web` 必须通过 `web-size-baseline.json` 回归检查；
  需要目标模式时运行 `AGENT_UI_WEB_BUDGET_STRICT=1 npm run build:web`。
