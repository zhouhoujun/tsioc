# TSDI Agent for VS Code

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/tsioc).

`@tsdi/agent-vscode` provides a VS Code extension that embeds the TSDI Agent
console as a webview panel, connecting to a running TSDI Agent gateway via
HTTP JSON-RPC.

## Install

```shell
npm install @tsdi/agent-vscode
```

Or install from the VS Code marketplace.

## Build

```shell
npm run build
```

## Test

```shell
npm test
```

## Setup

1. Start a TSDI Agent gateway (`@tsdi/agent-gateway`)
2. Set `tsdiAgent.gatewayUrl` in VS Code settings to the gateway URL
3. Optionally set `tsdiAgent.bearerToken` for authenticated gateways
4. Run `TSDI Agent: Open Console` from the command palette

## Features

- **Webview panel**: Embeds the agent-ui web bundle with CSP (nonce + JSON escape) and theme variable injection
- **AgentConsolePanel**: Reusable webview panel manager with open/refresh/reuse lifecycle
- **VsCodeHost**: VS Code-specific host integration (active editor context, theme sync)
- **Gateway connection**: HTTP JSON-RPC with Bearer token auth and NDJSON streaming
- **Theme support**: Syncs VS Code theme variables to the webview

## Configuration

| Setting | Type | Description |
|---|---|---|
| `tsdiAgent.gatewayUrl` | string | URL of the running TSDI Agent gateway |
| `tsdiAgent.bearerToken` | string | Optional Bearer token for gateway auth |

## Commands

| Command | Description |
|---|---|
| `TSDI Agent: Open Console` | Open or focus the agent console webview |
| `TSDI Agent: Refresh` | Reload the webview content |

## Architecture

- `AgentConsolePanel`: Manages the webview panel lifecycle (create, reuse, dispose)
- `VsCodeHost`: Bridges VS Code API to the agent-ui console (editor context, theme)
- `webview-html.ts`: Generates the webview HTML with CSP and injected config
- `extension.ts`: Extension activation and command registration

## License

This package is published under the Apache License 2.0.

Apache License 2.0 © [Houjun](https://github.com/zhouhoujun/)
