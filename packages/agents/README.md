# @tsdi agents packages

This directory groups the `@tsdi/agent*` subprojects published from this monorepo.

## License note

All packages in this repository, including `packages/agents/*`, are published under the **Apache-2.0** license.

This currently applies to:

- `@tsdi/agent`
- `@tsdi/agent-tools`
- `@tsdi/agent-gateway`
- `@tsdi/agent-channels`
- `@tsdi/agent-providers`
- `@tsdi/agent-cli`

## `@tsdi/agent-cli` model setup

Running `tsdi-agent` without arguments now defaults to `chat`.

- On chat startup, the CLI first checks the global workspace config.
- If a provider/model is already configured, or a matching API key environment variable is available, chat starts directly without prompting for model selection again.
- The interactive first-run setup is shown only when no global model config is available, and the result is written back to the default workspace config.

First-run setup supports four provider types:

1. `deepseek`
2. `openai`
3. custom OpenAI-compatible
4. custom Anthropic-compatible

For `deepseek`, the default built-in model choices are:

- `deepseek-v4-flash`
- `deepseek-v4-pro`

These are best treated as a default adaptive model split:

- `deepseek-v4-flash`: the fast model for normal chat, tool usage, and lightweight tasks
- `deepseek-v4-pro`: the strong model for complex reasoning, deep analysis, and higher-stakes generation

Default API key environment variable mapping:

- `deepseek` -> `DEEPSEEK_API_KEY`
- `openai` -> `OPENAI_API_KEY`
- `openai-compatible` -> `OPENAI_API_KEY`
- `anthropic` -> `ANTHROPIC_API_KEY`

Interactive commands:

- `/model`: switch provider/model in the current session and persist it to the default workspace config
- `/tools`: inspect the currently available tools

Recommended practice:

- keep the CLI default on the fast model
- switch to the strong model with `/model` when task complexity rises
- if you want automatic routing between `fast` and `strong`, configure `profiles` and `complexityRouting` in `@tsdi/agent`

Default config files:

- `~/.tsdi-agent/provider.json`
- `~/.tsdi-agent/settings.json`

## Maintainer guidance

When adding a new subproject under `packages/agents/`:

1. Set `"license": "Apache-2.0"` in its `package.json`
2. Add an explicit Apache 2.0 note in its README / localized README files
3. Keep this directory overview aligned with the published package list
