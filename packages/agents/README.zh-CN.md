# @tsdi agents 子项目

这个目录汇总了从本 monorepo 发布的 `@tsdi/agent*` 系列子项目。

## 许可证说明

本仓库以及 `packages/agents/*` 下的所有包统一采用 **Apache-2.0** 许可证发布。

当前包括：

- `@tsdi/agent`
- `@tsdi/agent-tools`
- `@tsdi/agent-gateway`
- `@tsdi/agent-channels`
- `@tsdi/agent-providers`
- `@tsdi/agent-cli`

## `@tsdi/agent-cli` 模型配置

`tsdi-agent` 不带参数时默认进入 `chat`。

- 启动 `chat` 时会先检查全局配置。
- 如果默认工作区里已经存在 provider/model 配置，或者对应的 API Key 环境变量可用，则直接进入会话，不会重复要求选择大模型。
- 只有在全局配置缺失时，才会进入首次模型配置流程，并把结果写入默认工作区配置。

首次配置支持以下 4 类 provider：

1. `deepseek`
2. `openai`
3. 自定义兼容 OpenAI
4. 自定义兼容 Anthropic

其中 `deepseek` 默认提供两个模型档位：

- `deepseek-v4-flash`
- `deepseek-v4-pro`

建议把这两个档位作为一套默认的自适应模型分层：

- `deepseek-v4-flash`：快速模型，适合日常 chat、工具调用、轻量任务
- `deepseek-v4-pro`：强模型，适合复杂推理、深度分析和关键生成任务

默认 API Key 环境变量规则：

- `deepseek` -> `DEEPSEEK_API_KEY`
- `openai` -> `OPENAI_API_KEY`
- `openai-compatible` -> `OPENAI_API_KEY`
- `anthropic` -> `ANTHROPIC_API_KEY`

交互命令说明：

- `/model`：在会话内切换 provider / model，并更新默认工作区配置
- `/tools`：查看当前可用工具

推荐实践：

- CLI 默认先落到快速模型
- 当任务复杂度升高时，用 `/model` 切到强模型
- 如果需要自动在 `fast` / `strong` 间路由，则继续在 `@tsdi/agent` 里配置 `profiles` 与 `complexityRouting`

默认配置文件位于：

- `~/.tsdi-agent/provider.json`
- `~/.tsdi-agent/settings.json`

## 维护建议

当你在 `packages/agents/` 下新增子项目时：

1. 在 `package.json` 中设置 `"license": "Apache-2.0"`
2. 在 README / 本地化 README 中显式写明 Apache 2.0
3. 保持本目录总览与实际发布包列表一致
