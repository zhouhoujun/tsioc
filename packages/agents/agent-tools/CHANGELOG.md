# Changelog

All notable changes to this package will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- v6 gap analysis (G79–G84) identified 2026-08-17 (auto-approve, half-page scroll, which-key enhancements, PDF attachments, JSON export)
- Performance baseline: 2135 tests, 62K LOC, 3.3MB web bundle

### Changed
- Documentation audit completed: README and CHANGELOG coverage across all packages

## [6.0.31] - 2026-08-17

### Added
- P157: GitHub/GitLab external trigger idempotency (source/externalId dedup)
- P156: Hidden automation session role (sessionRole: automation)
- P155: Connector authorization host hook (/apps OAuth boundary)
- P154: Mobile PWA remote console (manifest, service worker, safe-area)
- P153: Layered persistent project memory (G78, namespace isolation, TTL, conflict strategies)
- P152: ACP client adapter (G77, JSONL transport, session lifecycle, streaming updates)
- P151: mDNS service discovery (G76, DNS-SD broadcast, CLI attach --mdns)
- P150: Cloud task execution (G75, headless queue, submit/list/cancel/apply RPC)
- P149: /apps connectors command (G72, GitHub/GitLab/IM catalog, $app insert)
- P148: Plan mode draft nudge (G69, intent heuristic, /plan prompt)
- P147: /approve retry auto-review rejection (G68, rejected_actions + retry RPC)
- P146: /skills /mcp /plugins browse commands (G67)
- P145: /share session sharing (G66, redacted snapshot, token URL, revoke)
- P144: Display toggle cluster (G73+G74, timestamps/tool output/username/timeline)
- P143: Health status popover (G61, Ctrl+X H, gateway/MCP/LSP health)
- P142: Unified settings dialog (G60, General/Keybinds/Providers tabs)
- P141: tui.json enhanced fields (G65, diffStyle/cursor/scrollAcceleration/attention)
- P140: Thinking/reasoning toggle (G62, /thinking + Ctrl+X T)
- P139: Terminal window title (G51, OSC 0 + document.title + action_required prefix)

## [6.0.30] - 2026-08-14

### Added
- P138: Queued slash commands (G71, Tab-queued /cmds drain after turn)
- P137: Which-key overlay (G59, Ctrl+Alt+K toggle, Esc close)
- P136: Model favorites/recent/variant cycle (G57, Ctrl+F/F2/Ctrl+T)
- P135: Message navigation keys (G63, PageUp/PageDown/Home/End/Shift+G)
- P134: Sub-agent thread keyboard navigation (G58, ↓→←↑)
- P133: Context-scoped keymaps (G56, 5 contexts + conflict detection + v2 schema)
- P132: Draft stash (G64, /stash push/pop/rm, .tsdi-agent/stash.json)
- P131: /raw scrollback mode (G52, raw text rendering, ui.rawMode persist)
- P130: Esc,Esc edit previous message + context branch (G55+G70)
- P129: External editor / Ctrl+G (G53, $VISUAL/$EDITOR/vim/nano/code spawn)
- P128: Run-time steer + Tab queue dual mode (G54, Enter=steer, Tab=queue)

## [6.0.20] - 2026-08-12

### Added
- P127: TUI config layer (G50, tui.json schema, merge priority)
- P126: Command cluster (G49, 9 new commands registered)
- P125: Configurable statusline (G48, /statusline set/unset)
- P124: Session lifecycle commands (G47, /resume /archive /fork /side)
- P123: /theme command (G46, 4 themes + Ctrl+X T + persist)
- P122: /diff working tree view (G45, 4 scopes + untracked)
- P121: Esc interrupt + Enter queue (G44, FIFO + count)
- P120: Global keymap system (G43, Ctrl+X leader + Ctrl+P panels)

## [6.0.10] - 2026-08-08

### Added
- P118: Manual /compact (G41)
- P119: ! shell bang prefix (G42)
- P107: Thread sections + paginated history (G24)
- P106: Agent Plugins portable + marketplace (G27)
- P105: Windows native sandbox (G23)
- P103: Reasoning effort passthrough (G32)
- P102: Project trust gate (G31)
- P101: Indexed web search (G30)
- P98: Token budget (G25)
- P95: MCP 2026-07-28 protocol (G28)

## [6.0.0] - 2026-07-20

### Added
- P0–P66: Initial feature set
  - Turn loop (run/streaming), multi-model (Echo/Anthropic/OpenAI/Routed)
  - Context engineering (prompt cache, compaction replay, AGENTS.md chain)
  - Compensation/rollback (LIFO + file snapshots + Git step snapshots)
  - 40+ tool groups (files/git/terminal/browser/lsp/memory/skills/mcp)
  - Audit/stats/compaction-history/turn-diagnostics/delegation
  - Hooks (before/afterTurn, before/afterTool, pre/post-compaction)
  - Gateway (JSON-RPC/HTTP/SSE/NDJSON/WS + OpenAPI 3.1)
  - Console TUI (~20 panels, ~70 commands, vim mode, Ctrl+X leader)

### Changed
- P67: LSP diagnostic feedback loop (edit -> didChange -> diagnostics)
- P68: Compaction replay + media placeholders
- P69: Prompt cache request-side + system prompt segmentation
- P70: Declarative agent archetypes (plan/build/review + tool gating)
- P71: Git step snapshots + revert/unrevert
- P72: AGENTS.md instruction chain upgrade
- P73: Semantic memory retrieval
- P74: Auto title/summary
- P75: Gateway OpenAPI spec
- P76: Model request retry/backoff classification
