# agent-ui Dialog Audit Matrix (D1)

Status: baseline audit before the Dialog Stack / Route Registry migration.
Columns: entry -> current shell -> close/keys -> search/paging -> layout -> known issue.

## Command dialogs

| Entry | Current shell | Close / keys | Search / paging | Layout | Known issue |
|---|---|---|---|---|---|
| `/help` | `ctx.select` -> `openTextOverlay` | Esc/q/✕; arrows, PgUp/PgDn, Home/End on text | group list; text scroll | select above composer; text card centered | fixed: closing text returns to the group list |
| `/model` | `openSelectMenu` | Esc/q/✕; arrows/Enter/digits | provider/model lists, nested menus | select card above composer | nested menu Esc returns one level; no type-to-filter |
| `/provider` | select wizard + text | Esc/q/✕ | provider/auth/model steps | select card | async validation state can leave a stale menu |
| `/sessions` | select/list panel | Esc/q/✕ | input filter (in dialog) | select card | empty/async result can render a 0x0 menu |
| `/settings` | select + forms | Esc/q/✕ | section list | select card | form fields use custom shell, not DialogFrame |
| `/theme` | select | Esc/q/✕ | list | select card | no preview row |
| `/tools` | select/text | Esc/q/✕ | tool list | select card | no-arg vs arg paths differ |
| `/approvals` | custom approvals panel | `a/d/A/y`, arrows, Esc/✕ | list | custom panel | separate shell from DialogFrame |
| `/outputs` | command-output panel | arrows/Enter/Esc/✕ | filter mode | panel | close semantics differ from select |
| `/mcp` | select/text | Esc/q/✕ | server/tool lists | select card | nested async menu |
| `/skills` | select/text | Esc/q/✕ | list/search | select card | loader/permission state not in route |
| `/plugins` | select/text | Esc/q/✕ | list | select card | same |
| `/apps` | select/text | Esc/q/✕ | list | select card | same |
| `/ssh` | select/text | Esc/q/✕ | list | select card | same |
| `/permissions` | select + text | Esc/q/✕ | level list | select card | fixed: capability report uses a dedicated `Permissions` dialog |
| `/worktree` | none (notify) | - | - | - | no dialog at all |
| `/` menu | suggestion select | Esc/Tab/Enter | prefix filter | composer-attached | title/hint intentionally absent |
| @mention | suggestion select | Esc/Tab/Enter | file filter | composer-attached | shares suggestion shell |
| approval prompt | custom panel | `a/d/A/y`, Esc/✕ | list | custom panel | not on Dialog Stack |
| pending question | custom panel | digits/Enter/Esc/✕ | options | custom panel | not on Dialog Stack |

## Progress (2026-11)

- `/help` text detail now returns to the group list on Esc/✕.
- Transient panels are exclusive: opening a select/text/tools/sessions/approvals/jobs/tasks/toolRuns/review/outputs dialog dismisses the others.
- Command-outputs / which-key / health panels are anchored above the composer instead of rendering below the input.
- Text/select cards are centred inside the anchored overlay.

- ✅ R1 route catalog: `/dialog [id|path|group|alias|prefix]` lists and dispatches dialog routes; pending questions keep the focus stack (Esc restores the panel underneath).
- ✅ R1 discoverability: `/help dialogs` opens the route catalogue grouped by category, sharing the same builder as `/dialog`.
- ✅ R1 deep link: web `?dialog=<route>` resolves through the route table and dispatches the route's own command (transcript records `/theme`, not `/dialog theme`); unknown routes show a toast instead of an empty dialog.
- Remaining R work: `kind`/`priority`/`size`/`hidden`/`load()` route metadata, palette grouping, logical lazy loading (true chunks need ESM web build), route-level failure retry.

## Root causes

1. Two state families (`selectMenu` with parent chain; `textOverlay`/approval/question singletons) have no common stack.
2. `DialogComponent`, `SelectComponent`, approval/question/text panels each own title/close/hint/scroll.
3. Web `index.html` previously carried inline dialog colors; now removed, but `console.css` still mixes base chrome and business skin.
4. Key handling is split between `AgentConsoleOverlayController`, focus layers and component `@keydown`.
5. `/help` text overlay does not restore its parent group menu.

## Target contract (D2–D4)

- One `AgentConsoleDialogStack` for select/text/confirm/approval/question.
- One shell: title, ✕, body, footer hint, max height, scroll window (`1-12/N`).
- Keys: Esc closes top; ↑↓, PgUp/PgDn, Home/End, Enter, Tab, digits, type filter.
- Layout: composer-attached above footer in both renderers; free dialogs centered horizontally, bottom-aligned.
- Route registry (`R1`) drives group/title/loader/permissions; no per-command duplicate metadata.
