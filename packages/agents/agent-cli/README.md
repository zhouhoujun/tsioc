# packaged @tsdi/agent-cli

This directory is published to `npm`. The source lives in the
[main repo](https://github.com/zhouhoujun/tsioc).

`@tsdi/agent-cli` provides the command-line entrypoint for `@tsdi/agent`, including one-shot prompts, interactive chat, first-run model setup, and in-session model switching.

## Recommended usage: fast model + strong model

The main goal of `@tsdi/agent-cli` is not just picking a provider once, but establishing a practical day-to-day model split:

- `fast`: for normal chat, tool calls, lightweight code edits, and quick feedback
- `strong`: for complex reasoning, long-context analysis, difficult debugging, and high-stakes generation

Recommended default pairing:

- `fast` -> `deepseek-v4-flash`
- `strong` -> `deepseek-v4-pro`

Benefits:

- chat stays responsive by default
- complex tasks can switch to the stronger model quickly via `/model`
- the setup stays easy to migrate later to OpenAI or custom compatible providers

## Install

```shell
npm install @tsdi/agent-cli
```

## Start

```shell
tsdi-agent
```

Running `tsdi-agent` with no arguments defaults to:

```shell
tsdi-agent chat
```

## First-run model setup

When chat starts, the CLI first checks the default workspace config:

- If a provider / model is already configured, chat starts directly.
- If a matching provider API key environment variable is already available, chat also starts directly.
- The interactive setup flow is shown only when no global model config is available.

First-run setup supports four provider types:

1. `deepseek`
2. `openai`
3. custom OpenAI-compatible
4. custom Anthropic-compatible

### Default DeepSeek models

- `deepseek-v4-flash`
- `deepseek-v4-pro`

For most CLI workflows, it is best to think of them as:

- `deepseek-v4-flash`: the default fast model
- `deepseek-v4-pro`: the default strong model

### Default API key environment variables

- `deepseek` -> `DEEPSEEK_API_KEY`
- `openai` -> `OPENAI_API_KEY`
- `openai-compatible` -> `OPENAI_API_KEY`
- `anthropic` -> `ANTHROPIC_API_KEY`

## Default config files

The CLI writes configuration to:

- `~/.tsdi-agent/settings.json`

Recommended full adaptive `settings.json` example:

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

Field notes:

- `session`: default session id
- `workspace`: default workspace directory, relative to `~/.tsdi-agent`
- `model.defaultProfile`: default model profile
- `model.profiles.fast`: fast model config
- `model.profiles.strong`: strong model config
- `model.complexityRouting`: automatic routing between `fast` and `strong`
- `tools.root`: tools root directory, relative to `workspace`
- `tools.values`: default enabled tool groups or tool names
- `tools.defaultEnabled`: whether the default tool preset is enabled
- `skills.roots`: skill directories, relative to `workspace`
- `channels.values`: default channel list
- `channels.defaultEnabled`: whether the default channel preset is enabled

Multi-provider `fast / strong` adaptive configuration example:

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
            "design",
            "architecture",
            "analysis",
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

Behavior of this example:

- defaults to `fast -> deepseek-v4-flash`
- keeps normal tasks on the fast model
- automatically switches high-complexity work to `strong -> gpt-4.1`
- prioritizes `analysis -> claude-sonnet-4-20250514` when the input contains keywords such as `design`, `architecture`, `analysis`, or `review`

## Common commands

- `tsdi-agent run "your prompt"`: execute a single prompt
- `tsdi-agent chat`: start an interactive session
- `tsdi-agent tools list`: inspect resolved tool configuration

## Built-in chat commands

- `/model`: switch provider / model and persist it to the default workspace config
- `/tools`: inspect the currently available tools
- `/help`: show command help
- `/multiline`: toggle multiline input
- `/send`: send the buffered draft
- `/cancel`: clear the buffered draft
- `/sessions`: focus the on-screen session list, then use `up/down`, `pgup/pgdn`, `home/end`, `enter`, `y`, and `esc`
- `/messages`: focus the on-screen message list, then use `up/down`, `pgup/pgdn`, `home/end`, `enter`, `y`, and `esc`; in detail view, use `left/right` to pan long lines
- `/session [id]`: switch to an existing session, or choose one interactively when `id` is omitted
- `/new [id]`: create and switch to a new session, with an optional custom id
- `/approvals`: list pending approval requests
- `/approve [id]`: approve a pending request, or choose one interactively when `id` is omitted
- `/deny [id]`: deny a pending request, or choose one interactively when `id` is omitted
- `/copy [last|screen|input|selected]`: copy text through OSC52 clipboard, defaulting to the latest assistant message
- `/quit`, `/exit`: leave the session

## Notes

- custom OpenAI-compatible uses `provider: "openai-compatible"` with a custom `baseUrl`
- custom Anthropic-compatible uses `provider: "anthropic"` with a custom `baseUrl`
- the model chosen during first-run setup or `/model` is persisted into the `model` section of `settings.json`
- API key prompts in chat are masked
- sensitive local actions such as `terminal`, `write_file`, and `delete_file` now require explicit approval in chat
- the chat loop stays keyboard-first and does not keep terminal mouse capture enabled during normal editing

## Adaptive model configuration guidance

If your target behavior is “fast by default, strong when needed”, the recommended flow is:

1. Set `deepseek-v4-flash` as the default model on first launch
2. Switch to `deepseek-v4-pro` with `/model` when the task becomes complex
3. If you want this to become automatic, configure the following in `@tsdi/agent`:
   - a `fast` profile
   - a `strong` profile
   - `complexityRouting.simple/moderate/complex`

In short:

- `agent-cli` is optimized for quick setup and in-session switching
- `@tsdi/agent` is where automatic complexity-based routing is configured
