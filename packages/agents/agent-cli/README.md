# packaged @tsdi/agent-cli

This directory is published to `npm`. The source lives in the
[main repo](https://github.com/zhouhoujun/tsioc).

`@tsdi/agent-cli` provides the command-line entrypoint for `@tsdi/agent`. It exposes one-shot commands, the stdio RPC bridge used by Agent UI, and a thin `chat` launcher that boots Agent UI TUI without owning TUI state in CLI.

## Recommended usage: fast model + strong model

The main goal of `@tsdi/agent-cli` is to establish a practical day-to-day model split:

- `fast`: for normal chat, tool calls, lightweight code edits, and quick feedback
- `strong`: for complex reasoning, long-context analysis, difficult debugging, and high-stakes generation

Recommended default pairing:

- `fast` -> `deepseek-v4-flash`
- `strong` -> `deepseek-v4-pro`

Benefits:

- normal requests stay fast by default
- complex tasks can route to the stronger model through agent configuration
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

## Model setup

The CLI reads the default workspace config before executing commands:

- If a provider / model is already configured, commands use it directly.
- If a matching provider API key environment variable is available, it is resolved automatically.
- TUI interaction is owned by Agent UI instead of CLI-side state handling.

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
- `tsdi-agent chat`: start Agent UI in TUI mode
- `tsdi-agent tools list`: inspect resolved tool configuration
- `tsdi-agent rpc-stdio`: expose the agent through JSON-RPC 2.0 JSONL over stdio for Agent UI or other clients

## UI integration

- CLI no longer owns TUI state, terminal input state, or UI interaction flow.
- Interactive UI should connect through `tsdi-agent rpc-stdio`.
- `tsdi-agent chat` is only a startup entry that boots Agent UI.
- Agent UI is expected to manage session switching, approvals, input behavior, cursor behavior, and terminal rendering.

## Notes

- custom OpenAI-compatible uses `provider: "openai-compatible"` with a custom `baseUrl`
- custom Anthropic-compatible uses `provider: "anthropic"` with a custom `baseUrl`
- model configuration is read from the `model` section of `settings.json`
- sensitive local actions such as `terminal`, `write_file`, and `delete_file` still require explicit approval at the agent layer

## Adaptive model configuration guidance

If your target behavior is “fast by default, strong when needed”, the recommended flow is:

1. Set `deepseek-v4-flash` as the default model in `settings.json`
2. Set `deepseek-v4-pro` as the `strong` profile in `settings.json`
3. If you want this to become automatic, configure the following in `@tsdi/agent`:
   - a `fast` profile
   - a `strong` profile
   - `complexityRouting.simple/moderate/complex`

In short:

- `agent-cli` is optimized for explicit command execution and RPC exposure
- `@tsdi/agent` is where automatic complexity-based routing is configured
