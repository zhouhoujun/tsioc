# TSDI Agent Desktop

Electron desktop shell for the TSDI Agent remote console (G21 remainder — native window + system tray).

## What it is

`@tsdi/agent-desktop` is a thin Electron host that opens the P91 web console bundle
(`agent-ui/web/dist/agent-console.js`) in a native `BrowserWindow` and connects it to a
running TSDI Agent gateway — the desktop counterpart of the VS Code extension (P93) and
the browser web console (P91). All three delivery surfaces share the same
`AgentConsoleComponent` render layer.

- Native window with sandboxed webPreferences (`contextIsolation`, `sandbox`, no `nodeIntegration`)
- System tray with Show/Hide, Refresh and Quit menu
- Close-to-tray behavior (configurable)
- Single-instance lock
- Nonce-guarded CSP host page with JSON-escaped `__TSDI_AGENT_WEB__` config injection

## Host abstraction

Every Electron API is described as a structural interface in `src/host.ts`
(`ElectronHost` / `FileSystemLike`). `src/main.ts` wires the real `require('electron')`
module onto those shapes; tests build fixture hosts so all window/tray/lifecycle logic
runs without Electron installed. Electron is an optional peer dependency — build and
test never require it.

## Run

```bash
# 1. build the package (runs agent-ui build-web first, bundles main.js, copies the web bundle)
npm run build

# 2. point it at a running gateway
TSDI_AGENT_GATEWAY_URL=http://127.0.0.1:3000 npm start
```

## Configuration

Precedence: CLI argv > environment > defaults.

| Flag | Env | Default |
|---|---|---|
| `--gateway-url` | `TSDI_AGENT_GATEWAY_URL` | `http://127.0.0.1:3000` |
| `--token` | `TSDI_AGENT_TOKEN` | *(empty)* |
| `--session-id` | `TSDI_AGENT_SESSION_ID` | *(empty → fresh session)* |
| `--workspace` | `TSDI_AGENT_WORKSPACE` | *(empty)* |
| `--width` / `--height` | `TSDI_AGENT_WIDTH` / `TSDI_AGENT_HEIGHT` | `1200` / `800` |
| `--title` | `TSDI_AGENT_TITLE` | `TSDI Agent` |
| `--tray=false` | `TSDI_AGENT_TRAY` | `true` |
| `--close-to-tray=false` | `TSDI_AGENT_CLOSE_TO_TRAY` | `true` |
| `--start-hidden` | `TSDI_AGENT_START_HIDDEN` | `false` |
| `--no-single-instance` | — | single instance enforced |

The host page is written to `~/.tsdi-agent/desktop/console.html` (override with
`TSDI_AGENT_USER_DATA`); the web bundle is loaded from `resources/agent-console.js`.

## License

Apache-2.0.
