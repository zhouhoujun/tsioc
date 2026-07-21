# packaged @tsdi/agent-cli

这个目录用于发布 `npm` 包，源码位于
[主仓库](https://github.com/zhouhoujun/tsioc)。

`@tsdi/agent-cli` 提供 `@tsdi/agent` 的命令行入口。它负责单次命令执行、供 Agent UI 使用的 stdio RPC bridge，以及一个不在 CLI 内持有 TUI 状态的薄 `chat` 启动入口。

## 推荐使用方式：快速模型 + 强模型

`@tsdi/agent-cli` 的重点不是只配置一个 provider，而是先建立一套清晰的日常模型分层：

- `fast`：用于日常对话、工具调用、轻量代码修改、快速反馈
- `strong`：用于复杂推理、长上下文分析、困难问题排查、关键生成任务

推荐的默认组合：

- `fast` -> `deepseek-v4-flash`
- `strong` -> `deepseek-v4-pro`

这样做的好处是：

- 普通请求默认保持快速响应
- 复杂任务可通过 agent 配置路由到强模型
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

## 模型配置

CLI 在执行命令前会读取默认工作区配置：

- 如果已经存在 provider / model 配置，则直接使用。
- 如果对应 provider 的 API Key 环境变量可用，也会自动解析。
- TUI 交互由 Agent UI 负责，不再由 CLI 侧状态机负责。

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
- `tsdi-agent chat`：以 TUI 模式启动 Agent UI
- `tsdi-agent tools list`：查看解析后的工具配置
- `tsdi-agent rpc-stdio`：通过 stdio 暴露 JSON-RPC 2.0 JSONL 接口，供 Agent UI 或其他客户端接入

## UI 集成

- CLI 不再管理 TUI 状态、终端输入状态或 UI 交互流程。
- 交互式 UI 应通过 `tsdi-agent rpc-stdio` 接入。
- `tsdi-agent chat` 只是启动 Agent UI 的入口。
- 会话切换、审批、输入行为、光标行为和终端渲染应统一由 Agent UI 负责。

## 备注

- 自定义兼容 OpenAI 使用 `provider: "openai-compatible"` 和自定义 `baseUrl`
- 自定义兼容 Anthropic 使用 `provider: "anthropic"` 和自定义 `baseUrl`
- 模型配置从 `settings.json` 的 `model` 节点读取
- `terminal`、`write_file`、`delete_file` 等敏感本地操作仍会在 agent 层要求显式审批

## 自适应模型配置建议

如果你的目标是“默认快，复杂时强”，建议按下面的方式使用：

1. 在 `settings.json` 里把默认模型配置成 `deepseek-v4-flash`
2. 在 `settings.json` 里把 `deepseek-v4-pro` 配成 `strong` profile
3. 如果要进一步自动化，再在 `@tsdi/agent` 里配置：
   - `fast` profile
   - `strong` profile
   - `complexityRouting.simple/moderate/complex`

也就是说：

- `agent-cli` 更偏向“显式命令执行 + RPC 暴露”
- `@tsdi/agent` 更偏向“基于复杂度的自动路由”
