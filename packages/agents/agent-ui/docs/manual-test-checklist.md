# Agent UI 手测清单（P4）

日期：2026-11-22。覆盖 LSP、权限规则、队列、默认 profile、release highlights、持久化 turn 撤销，
以及本轮的 per-session 权限、规则图形化新增、TUI 通知、`/delete`、`/import`、`/export html`、
`/remotes`、`/work all`、`/msg`（opt-in）与远程 cancel。PTY 与浏览器都必须验证；不能用单元测试代替用户可见行为。

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

### 2.7 会话删除 / 导入 / HTML 导出

1. `/delete`：弹确认框；选 Cancel 会话仍在；选 Delete 后当前会话切换到相邻会话。
2. turn 运行中对当前会话 `/delete`：拒绝并提示 busy；`/delete <其它 id> confirm` 不切换当前 tab。
3. `/export html`：默认写入 `.tsdi-agent/exports/*.html`；用浏览器打开，内容转义、无脚本、
   跟随系统深浅色；Web/attach 下只显示文件名与字节数预览。
4. `/import <该 html 同目录的 .json>`：创建**新会话**并打开；消息 id 已重新生成；
   导入一个普通文本文件提示 "No messages found"。

### 2.8 跨会话消息（agent teams v0）

1. 默认 `/msg <session> hello`：被拒绝并提示在 `/settings → Agents` 开启。
2. 打开 Cross-session messages 后：
   - `/msg <其它会话> hello` 投递；切到目标会话看到 `↩ <来源> · hello`；
   - `/msg --wake <其它会话> run tests` 启动目标 turn；
   - `/msg <当前会话> x` 拒绝（不能发给自己）；
   - `/msg list` 打开只读快照（来源/目标/内容/计数），无消息时显示空提示。
3. 重启后开关与消息仍在。

### 2.9 远程中心 / 混合 Work / 远程 cancel

1. `/remotes add laptop http://127.0.0.1:3200 <token>`；`/remotes` 选中 laptop 看到会话快照，
   快照与提示中不出现 token。
2. `/work`：末尾出现 `Remote centers (1)`，选择后打开同一 `/remotes`。
3. `/work remote`：只显示 gateway 与会话；`/work all`：本地 delegation 行在前、远程行在后；
   选择远程会话显示只读详情。
4. 在 laptop 上启动一个 turn，然后本机 `/remotes cancel laptop <session 前缀>`：
   确认后目标 turn 停止；再次 cancel 提示没有运行中的 turn。
5. 断网/关掉 gateway：`/remotes` 标记 unreachable，其它 gateway 仍可用。
6. `/remotes spawn laptop <session> <goal>` 默认拒绝并提示 `allow-spawn`；执行
   `/remotes allow-spawn laptop` 后再次 spawn，确认框通过后远端出现 worker；
   远端 workspace 未信任时应原样返回 trust 错误。

## 3. 浏览器 / Web

1. `tsdi-agent serve`（或 TUI `/web`）打开 console。
2. 依次执行 `/check`、`/format --check`、`/highlights`、`/permissions rules`、`/queue manage`、
   `/agents default`、`/import`、`/remotes`、`/work all`，确认与 TUI 行为一致。
3. 侧栏底部 **Teams** 按钮打开 `/msg list` 面板；开启跨会话消息后投递一条并在目标会话看到 `↩` 标记。
3. 在浏览器修改权限规则/默认 profile 后刷新页面：
   - `settings.json` 保持修改；
   - 终端 attach 的同一 session 也生效。
4. 队列面板在窄屏（移动端抽屉）可操作，不遮挡输入框。
5. `/format` 写入受 workspace trust 保护：未信任 workspace 应拒绝并给出 trust 指引。
6. `/work spawn --worktree feature <goal>`：
   - 父会话 workspace 不变；
   - worker session 的 workspace 指向 worktree；
   - 同名 worktree 已存在时复用而不是重复创建；
   - 任务完成后 `/work` → task → View worker report 可查看报告。
   命名形式使用 `--worktree=feature`；裸 `--worktree` 会打开现有 worktree 选择菜单（含“创建新的”）。

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
- 测试墙钟预算（opt-in）：
  ```bash
  cd packages/agents/agent-ui
  AGENT_UI_TEST_WALL_BUDGET=180 npm run test
  ```
  超出预算时 `unit.ts` 以非零退出；默认不启用，避免宿主机负载导致 flaky。
- 1k 切换预算（opt-in）：
  ```bash
cd packages/agents/agent-ui
cat > run-switch.tmp.ts <<'EOF'
import { runTest } from '@tsdi/unit';
runTest('./test/tab-switch-long-session.spec.ts', { baseURL: __dirname })
    .catch((err: Error) => { console.error('RUNNER-FAIL', err); process.exit(1); });
EOF
AGENT_UI_SWITCH_BUDGET=1 npx ts-node --transpile-only -r tsconfig-paths/register run-switch.tmp.ts
rm -f run-switch.tmp.ts
  ```
  预算：p50 ≤120ms、p95 ≤200ms（负载需 ≤3）。
