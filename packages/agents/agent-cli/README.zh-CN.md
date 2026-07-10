# packaged @tsdi/agent-cli

这个目录用于发布 `npm` 包，源码位于
[主仓库](https://github.com/zhouhoujun/tsioc)。

`@tsdi/agent-cli` 提供 `@tsdi/agent` 的命令行入口，支持单次 prompt 执行、交互式 chat、模型配置初始化，以及会话内模型切换。

## 推荐使用方式：快速模型 + 强模型

`@tsdi/agent-cli` 的重点不是只配置一个 provider，而是先建立一套清晰的日常模型分层：

- `fast`：用于日常对话、工具调用、轻量代码修改、快速反馈
- `strong`：用于复杂推理、长上下文分析、困难问题排查、关键生成任务

推荐的默认组合：

- `fast` -> `deepseek-v4-flash`
- `strong` -> `deepseek-v4-pro`

这样做的好处是：

- 日常 chat 默认保持响应速度
- 复杂任务时可通过 `/model` 快速切到强模型
- 配置语义清晰，后续替换到 OpenAI 或自定义兼容 provider 时也容易迁移

## 安装

```shell
npm install @tsdi/agent-cli
```

## 启动

```shell
tsdi-agent
```

`tsdi-agent` 不带参数时默认等价于：

```shell
tsdi-agent chat
```

## 首次模型配置

启动 `chat` 时，CLI 会先检查默认工作区配置：

- 如果已经存在 provider / model 配置，则直接进入 chat。
- 如果对应 provider 的 API Key 环境变量可用，也会直接进入 chat。
- 只有在全局配置缺失时，才会进入首次模型配置流程。

首次配置支持以下 4 类 provider：

1. `deepseek`
2. `openai`
3. 自定义兼容 OpenAI
4. 自定义兼容 Anthropic

### DeepSeek 默认模型

- `deepseek-v4-flash`
- `deepseek-v4-pro`

对于大多数本地命令行使用场景，建议把它们理解为：

- `deepseek-v4-flash`：默认快速模型
- `deepseek-v4-pro`：默认强模型

### 默认 API Key 环境变量

- `deepseek` -> `DEEPSEEK_API_KEY`
- `openai` -> `OPENAI_API_KEY`
- `openai-compatible` -> `OPENAI_API_KEY`
- `anthropic` -> `ANTHROPIC_API_KEY`

## 默认配置文件

默认写入到：

- `~/.tsdi-agent/settings.json`

推荐的完整 `settings.json` 自适应模型配置示例：

```json
{
  "session": "default",
  "workspace": "workspace",
  "model": {
    "defaultProfile": "fast",
    "profiles": {
      "fast": {
        "provider": "deepseek",
        "model": "deepseek-v4-flash",
        "baseUrl": "https://api.deepseek.com",
        "apiKeyEnv": "DEEPSEEK_API_KEY",
        "timeoutMs": 120000
      },
      "strong": {
        "provider": "deepseek",
        "model": "deepseek-v4-pro",
        "baseUrl": "https://api.deepseek.com",
        "apiKeyEnv": "DEEPSEEK_API_KEY",
        "timeoutMs": 120000
      }
    },
    "complexityRouting": {
      "simple": "fast",
      "moderate": "fast",
      "complex": "strong"
    }
  },
  "tools": {
    "root": "tools",
    "values": [
      "filesystem",
      "http_fetch"
    ],
    "defaultEnabled": true
  },
  "skills": {
    "roots": [
      "skills",
      "custom-skills"
    ]
  },
  "channels": {
    "values": [
      "local"
    ],
    "defaultEnabled": true
  }
}
```

字段说明：

- `session`：默认会话 ID
- `workspace`：默认工作区目录，相对于 `~/.tsdi-agent`
- `model.defaultProfile`：默认模型档位
- `model.profiles.fast`：快速模型配置
- `model.profiles.strong`：强模型配置
- `model.complexityRouting`：按复杂度在 `fast` / `strong` 间自动路由
- `tools.root`：工具根目录，相对于 `workspace`
- `tools.values`：默认启用的工具组或工具名
- `tools.defaultEnabled`：是否启用默认工具集
- `skills.roots`：技能目录列表，相对于 `workspace`
- `channels.values`：默认通道列表
- `channels.defaultEnabled`：是否启用默认通道集

多 provider 的 `fast / strong` 自适应配置示例：

```json
{
  "session": "default",
  "workspace": "workspace",
  "model": {
    "defaultProfile": "fast",
    "profiles": {
      "fast": {
        "provider": "deepseek",
        "model": "deepseek-v4-flash",
        "baseUrl": "https://api.deepseek.com",
        "apiKeyEnv": "DEEPSEEK_API_KEY",
        "timeoutMs": 120000
      },
      "strong": {
        "provider": "openai",
        "model": "gpt-4.1",
        "baseUrl": "https://api.openai.com",
        "apiKeyEnv": "OPENAI_API_KEY",
        "timeoutMs": 120000
      },
      "analysis": {
        "provider": "anthropic",
        "model": "claude-sonnet-4-20250514",
        "baseUrl": "https://api.anthropic.com",
        "apiKeyEnv": "ANTHROPIC_API_KEY",
        "timeoutMs": 120000
      }
    },
    "complexityRouting": {
      "simple": "fast",
      "moderate": "fast",
      "complex": "strong"
    },
    "routes": [
      {
        "name": "analysis-route",
        "profile": "analysis",
        "when": {
          "containsAny": [
            "设计",
            "架构",
            "分析",
            "review"
          ]
        }
      }
    ]
  },
  "tools": {
    "root": "tools",
    "values": [
      "filesystem",
      "http_fetch"
    ],
    "defaultEnabled": true
  },
  "skills": {
    "roots": [
      "skills",
      "custom-skills"
    ]
  },
  "channels": {
    "values": [
      "local"
    ],
    "defaultEnabled": true
  }
}
```

这个示例的行为是：

- 默认走 `fast -> deepseek-v4-flash`
- 普通任务保持快速响应
- 高复杂度任务自动切到 `strong -> gpt-4.1`
- 包含“设计 / 架构 / 分析 / review”等关键词时，优先切到 `analysis -> claude-sonnet-4-20250514`

## 常用命令

- `tsdi-agent run "your prompt"`：执行单次 prompt
- `tsdi-agent chat`：启动交互式会话
- `tsdi-agent tools list`：查看解析后的工具配置

## Chat 内置命令

- `/model`：切换 provider / model，并更新默认工作区配置
- `/tools`：查看当前可用工具
- `/help`：查看命令帮助
- `/multiline`：切换多行输入
- `/send`：发送多行草稿
- `/cancel`：取消多行草稿
- `/sessions`：聚焦界面上的会话列表，可直接用上下键、`PgUp/PgDn`、`Home/End`、回车、`y`、`Esc`
- `/messages`：聚焦界面上的消息列表，可直接用上下键、`PgUp/PgDn`、`Home/End`、回车、`y`、`Esc`；进入详情后可用左右键横向查看长行
- `/session [id]`：切换到指定会话；不传 `id` 时进入交互选择
- `/new [id]`：创建并切换到一个新会话；可选自定义 `id`
- `/approvals`：查看待处理审批
- `/approve [id]`：批准待处理审批；不传 `id` 时进入交互选择
- `/deny [id]`：拒绝待处理审批；不传 `id` 时进入交互选择
- `/copy [last|screen|input|selected]`：通过 OSC52 复制文本，默认复制最近一条 assistant 回复
- `/quit`、`/exit`：退出会话

## 备注

- 自定义兼容 OpenAI 使用 `provider: "openai-compatible"` 和自定义 `baseUrl`
- 自定义兼容 Anthropic 使用 `provider: "anthropic"` 和自定义 `baseUrl`
- 用户在首次配置或 `/model` 中选择的当前模型会直接写入 `settings.json` 的 `model` 节点
- Chat 中输入 API key 时会自动掩码显示
- `terminal`、`write_file`、`delete_file` 等敏感本地操作现在会在 Chat 内显式请求审批
- Chat 现在默认运行在终端主屏幕，保留原生 scrollback 和终端滚动条；如需切回全屏 buffer，可设置 `TSDI_AGENT_ALT_SCREEN=1`
- 自定义 transcript 滚动条保持关闭；mouse capture 只会在交互式选择菜单打开时临时启用

## 自适应模型配置建议

如果你的目标是“默认快，复杂时强”，建议按下面的方式使用：

1. 首次启动 `tsdi-agent` 时，把默认模型配置成 `deepseek-v4-flash`
2. 遇到复杂任务时，通过 `/model` 切换到 `deepseek-v4-pro`
3. 如果要进一步自动化，再在 `@tsdi/agent` 里配置：
   - `fast` profile
   - `strong` profile
   - `complexityRouting.simple/moderate/complex`

也就是说：

- `agent-cli` 更偏向“快速初始化 + 会话内切换”
- `@tsdi/agent` 更偏向“基于复杂度的自动路由”
