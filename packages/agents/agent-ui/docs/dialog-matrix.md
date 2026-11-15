# agent-ui Dialog Audit Matrix (D1)

Status: baseline audit before the Dialog Stack / Route Registry migration.
Columns: entry -> current shell -> close/keys -> search/paging -> layout -> known issue.

## Command dialogs

| Entry | Current shell | Close / keys | Search / paging | Layout | Known issue |
|---|---|---|---|---|---|
| `/help` | `ctx.select` -> `openTextOverlay` | Esc/q/✕; arrows, PgUp/PgDn, Home/End on text | group list; text scroll | select above composer; text card centered | fixed: closing text returns to the group list |
| `/model` | `openSelectMenu` | Esc/q/✕; arrows/Enter/digits; type-to-filter | provider/model lists, nested menus | select card above composer | nested menu Esc returns one level |
| `/provider` | select wizard + text | Esc/q/✕; type-to-filter on lists | provider/auth/model steps | select card | async validation state can leave a stale menu |
| `/sessions` | select/list panel | Esc/q/✕ | input filter (in dialog) | select card | empty/async result can render a 0x0 menu |
| `/settings` | select + forms | Esc/q/✕; type-to-filter | section list | select card | form fields use custom shell, not DialogFrame |
| `/theme` | select | Esc/q/✕; type-to-filter | list | select card | no preview row |
| `/tools` | select/text | Esc/q/✕ | tool list | select card | no-arg vs arg paths differ |
| `/approvals` | custom approvals panel | `a/d/A/y`, arrows, Esc/✕ | list | custom panel | separate shell from DialogFrame |
| `/review` | text dialog | Esc/q/✕ | scroll | text card | fixed: summary/export/risk use titled `Review …` dialogs |
| `/outputs` | command-output panel | arrows/Enter/Esc/✕ | filter mode | panel | close semantics differ from select |
| `/mcp` | select/text | Esc/q/✕ | server/tool lists | select card | nested async menu |
| `/skills` | select/text | Esc/q/✕ | list/search | select card | loader/permission state not in route |
| `/plugins` | select/text | Esc/q/✕ | list | select card | same |
| `/apps` | select/text | Esc/q/✕ | list | select card | same |
| `/ssh` | text dialog (list) | Esc/q/✕ | - | text card | fixed: host list opens a titled `SSH hosts` dialog; connect/forward stay toasts |
| `/permissions` | select + text | Esc/q/✕ | level list | select card | fixed: capability report uses a dedicated `Permissions` dialog |
| `/worktree` | text dialog (list) | Esc/q/✕ | - | text card | fixed: `list` opens a titled `Worktrees` dialog instead of a generic notice |
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
- ✅ D3 shell semantics: approval and question panels carry the shared `dialog-panel` / `dialog-title` / `dialog-hint` / `dialog-close` hooks (JSDOM mount test), so one skin can target every modal.
- ✅ Real PTY: acceptance scenario 12 drives `/theme` → type `sol` → Backspace → Esc, asserting the filtered rows and closed dialog in a real terminal.
- ✅ Web wheel (select): a blocking select dialog moves its selection with the wheel instead of scrolling the transcript.
- ✅ Web wheel: an open text dialog owns the wheel (scrolls its own page) instead of scrolling the transcript underneath; covered by a JSDOM mount test.
- ✅ R1 route kind: every route declares `select` / `panel` / `wizard` / `text`; `/dialog` shows `group · kind` and `/help dialogs` appends the kind, so the catalogue classifies dialogs, not just commands.
- ✅ R1 interactive routes: `/dialog` without arguments opens the route catalogue as a select dialog (type-to-filter on id/title/path, Enter dispatches the route's command); `/help dialogs` keeps the read-only text view.
- ✅ R1 discoverability: `/help dialogs` opens the route catalogue grouped by category, sharing the same builder as `/dialog`.
- ✅ D4 type-to-filter: blocking select dialogs (`/model`, `/theme`, `/provider`, `/settings`, `/tools`, `/mcp`, `/skills`, `/plugins`, `/apps`, `/ssh`, `/help` groups) accept typed text as a live filter; the title shows `· <filter>`, Backspace edits it, digits keep numbered selection only while the filter is empty, and suggestion (`/`, `@`) menus keep filtering the composer. TUI filters through the shared focus layer; web routes textarea keys into the same layer.
- ✅ R1 discoverability: `/help` group menu carries a `Dialogs` row (route count) that opens the route catalogue; Esc/✕ returns to the group list (web Esc used to close everything).
- ✅ Web approval keys: while an approval is focused, `a`/`A`/`d` (and Esc = reject) act immediately from the browser composer through the shared focus layer.
- ✅ Web question keys: with a pending question, Enter answers the custom draft (or the highlighted option) and digits with an empty draft pick the numbered option — browser no longer starts a chat turn instead of answering.
- ✅ D2 question priority: an incoming pending question cancels an open select/text dialog (its select promise resolves `undefined`) so the turn's question owns the keyboard and custom-answer input.
- ✅ D4 no layout shift: filtered select cards keep the unfiltered title/option width (shared `select-list` width inputs), so typing never resizes or re-centres the dialog.
- ✅ Web focus: the composer is focused after mount on fine pointers, so `?dialog=` deep links are keyboard-operable without clicking; touch/coarse pointers keep the on-screen keyboard closed.
- ✅ D4 palette/dialog keys: Esc on the command palette now closes it in one press (its parent chain was its own query history, not a nested dialog).
- ✅ D4 empty results: Enter with zero matches keeps the dialog open instead of closing it with an undefined answer.
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
