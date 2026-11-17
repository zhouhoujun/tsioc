# @tsdi/components/console

Terminal renderer for `@tsdi/components`.

This package renders the same component templates as `@tsdi/components/html`,
but into a character grid. It owns three layers: the renderer-neutral **console
node tree**, the **TUI line layout** (styles, wrapping, regions, cursor, click
targets), and the **terminal surface** (alternate screen / native scrollback,
resize, mouse, selection, paging).

## Architecture

```
@Component template
        │
        ▼
ConsoleTemplateParser ──► ConsoleNode tree (virtual DOM, no browser)
        │
        ▼
TuiTemplateCompiler ──► binding factories → reactive effect.run(...)
        │
        ▼
TuiRenderer ──► styled lines + regions + cursor + click targets
        │
        ▼
TuiTerminalSurface ──► terminal output (ANSI, mouse, alt screen, scrollback)        ▲
        │ input events / resize / raw chunks
TerminalInputSequenceDecoder + ConsoleTerminalInputController
```

| Layer | File | Responsibility |
| --- | --- | --- |
| Console tree | `src/console.ts` | `ConsoleNode`/`ConsoleElement`/`ConsoleText`/`ConsoleDocument` mirror the DOM API (`attributes`, `classList`, `style`, `appendChild`, `querySelector`, events). Mutations bump `ConsoleNode.CHANGE_EVENT`, which bubbles to the root. `ConsoleRenderer` implements `Renderer` over this tree; it also provides `queryConsoleNode(s)` and attribute-sync helpers. |
| TUI layout | `src/tui.ts` | `TuiRenderer extends ConsoleRenderer`: turns the tree into styled lines, wraps text, applies the console stylesheet subset (block/inline layout, padding, borders, backgrounds, `max-width`, transitions, `@keyframes`), resolves hover, and records regions/cursor/click targets. `renderToTuiLayout(node, { width, dirty })` returns the frame layout. |
| Terminal surface | `src/terminal.ts` | `TuiTerminalSurface` owns the real terminal: writes frames, keeps the cursor, handles viewport vs native scrollback, mouse tracking (any-motion hover, clicks, wheel, touch drag), text selection/copy (OSC52), paging HUD, resize and footer regions. Also hosts `TerminalInputSequenceDecoder` and the input/lifecycle services. |
| Styling | `src/stylesheet.ts`, `src/animation.ts`, `src/default-styles.generated.ts` | Parses the console CSS subset, resolves `:hover`/variables, and evaluates CSS animations against the shared `AnimationClock`. `styles/console.scss` is the source; `npm run build:styles` regenerates `console.css` + `default-styles.generated.ts`. |
| Code highlighting | `src/syntax-highlight.ts` | `highlightTerminalCodeLine(line, language, theme, state)` maps shared `@tsdi/components/common/syntax` tokens to ANSI colors. |
| Text metrics | `src/display-width.ts` | Re-exports CJK/emoji-aware width/slice/pad helpers from `common` for terminal layout. |
| Input helpers | `src/input.ts` | Raw chunk decoding, grapheme/word navigation, selection windows, draft state, placeholder, history and duplicated-keypress rules used by `agent-ui` and terminal hosts. |

The package **must not** import `@tsdi/components/html` and must not touch Node
APIs directly. TTY access goes through injected `ConsoleTerminalInputLike` /
`ConsoleTerminalOutputLike` shapes; when it needs the ambient process it uses a
guarded `(globalThis as { process?: ... }).process` lookup.

## Module wiring

| Module / symbol | Contents |
| --- | --- |
| `TuiTemplateModule` (alias `ConsoleTemplateModule`) | `TuiRenderer`, `ConsoleTemplateParser`, `TuiTemplateCompiler`; binds `ConsoleRenderer`, `Renderer`, `TemplateParser`, `TemplateCompiler` and `CONSOLE_TEMPLATE` options. |
| `TuiConsoleModule` | `TuiTemplateModule` + `provideConsoleTerminalLifecycle()` (input/surface/application lifecycle services). Use it when the host wants the terminal lifecycle managed by DI. |
| `TuiRenderer` | The concrete renderer (`ctx.get(ConsoleRenderer)` returns it through the `useExisting` binding). |
| `CONSOLE_TEMPLATE` / `provideConsoleTemplateDefaults(options)` | Compiler options token and defaults (`delimiters: ['{{', '}}']`). |
| `ConsoleTemplateCompiler` / `ConsoleTemplateModule` | Backwards-compatible aliases for `TuiTemplateCompiler` / `TuiTemplateModule`. |

Minimal bootstrap:

```ts
import { Application } from '@tsdi/core';
import { ComponentsModule } from '@tsdi/components';
import { ConsoleTemplateModule, TuiRenderer } from '@tsdi/components/console';

const ctx = await Application.run(AppComponent, {
  deps: [ConsoleTemplateModule, ComponentsModule]
});

const renderer = ctx.get(TuiRenderer);
const lines = renderer.renderToTuiLines(appRef.hostView.rootNodes[0], { width: 100 });
```

Custom delimiters / options:

```ts
@Module({ imports: [TuiConsoleModule.withOptions({ delimiters: ['${', '}'] })] })
export class AppModule {}
```

## Terminal surface

```ts
import { ConsoleAnimationClock, TuiTerminalSurface } from '@tsdi/components/console';

const surface = new TuiTerminalSurface({
  renderer,                          // TuiRenderer (or ConsoleRenderer)
  root: appRef.hostView.rootNodes[0],// attach() is called automatically
  output: process.stdout,            // ConsoleTerminalOutputLike
  width: () => process.stdout.columns,
  height: () => process.stdout.rows,
  footerRegionId: 'composer',
  scrollRegionId: 'transcript',
  nativeScrollback: () => false,     // viewport mode; true = native scrollback
  scrollViewport: () => true,        // surface owns the transcript scroll region
  footerBottomMargin: 0,
  placeCursor: () => true,
  touchMode: () => false,
  animationClock: new ConsoleAnimationClock(),
  onViewportTop: () => void loadOlderPage(),
  viewportNotice: () => 'N 条新消息 · 回到最新',
  onViewportResume: () => { /* following resumed */ },
  onTextCopied: text => { /* toast */ },
  onBackgroundClick: () => { /* close overlay */ }
});

surface.render();        // force a frame
surface.requestRender(); // coalesced render (microtask / optional scheduler)
surface.destroy();
```

If the root is not known at construction time, omit `root` and call
`surface.attach(root)` later; it subscribes to `ConsoleNode.CHANGE_EVENT` and
requests the first render.

Key surface behavior:

- **Viewport mode** keeps a scrollable transcript region sized to the terminal,
  clamps long tool/event output to one summary row, and shows a floating
  "back to latest" affordance while scrolled up. **Native scrollback** appends
  frames and keeps the reading position; long replies must not move more than
  one viewport.
- Mouse tracking is any-motion: hover targets, wheel scrolling, clicks, nested
  click targets (e.g. a tab and its `✕`), touch drag scrolling and text selection
  are resolved from laid-out click targets. Hover fades use the shared
  `AnimationClock`.
- `scrollViewport(deltaRows)`, `scrollViewportToEdge`, `scrollViewportToOffset`,
  `getViewportScrollOffset`, `isViewportFollowing`, `notifyViewportPrepend`,
  `dispatchClickAt`, `dispatchMouse`, `dispatchKey` are available to hosts and
  tests.
- Paging (`openPagerFromLastRender`, `closePager`, `pagerHandleKey`,
  `pagerSearch`, `pagerWheel`, `pagerTypeChar`, `pagerBackspace`) uses the shared
  `PagerBox` model and paints the same HUD as the browser.

Input plumbing:

```ts
const decoder = new TerminalInputSequenceDecoder();
const controller = new ConsoleTerminalInputController({
  input: process.stdin,
  decoder,
  onChunk: (decoded, chunk) => { /* route to the screen */ }
});
controller.start();
```

`ConsoleTerminalInputLifecycle`, `ConsoleTerminalSurfaceLifecycleService`,
`ConsoleTerminalApplicationLifecycleService` and
`provideConsoleTerminalLifecycle()` supply DI-managed raw-mode, resize and
cleanup handling. Use `resolveConsoleTranscriptLayoutFlags()` when a host needs
to know whether the surface keeps its own viewport or the app owns scrollback.

## Styling

`styles/console.scss` is compiled into `console.css` and
`src/default-styles.generated.ts` by `npm run build:styles`. The terminal
renderer supports a deliberate CSS subset: blocks/inline text, padding, borders,
backgrounds, colors, `max-width`, transitions and keyframes; it does not parse
arbitrary web layout. Theme variables (`--console-*`, `--agent-theme-*`) are
resolved from the active stylesheet, so a host can call
`renderer.setStyleSheet(css)` to install its own compiled skin.

The default stylesheet includes stable rules for the shared widgets
(`console-panel`, `list-panel`, `dialog-panel`, `select-list`, `tab-bar`,
`markdown-*`, ...). Keep semantic class names in `common`; add terminal-only
tweaks here, never in the HTML renderer or agent-ui.

## Formatting and terminal helpers

`terminal.ts` exports the pure helpers used by hosts and tests:
`buildClearScreenSequence`, `buildTerminalCleanupSequence`,
`buildTerminalCursorSequence`, `buildTerminalCursorStyleSequence`,
`resolveTerminalSize`, `shouldUseAlternateScreen`, `wrapTerminalText`,
`wrapPrefixedText`, `renderTerminalBlock`, `composePrimaryTerminalScreen`,
`renderPrimaryTerminalScreen`, `renderSelectMenu`, `parseTerminalMouseEvent`,
`buildOsc52ClipboardSequence`, `formatClockTime`, `renderToolRunLine`,
`renderActivityLine`, markdown-to-terminal (`renderTerminalMarkdownLines`),
and prompt helpers (`resolveInputSuggestions`, `applySuggestionToInput`,
`extractMentions`, `enrichPromptWithMentions`, `shouldAcceptSuggestionOnEnter`).

## Testing

```bash
cd packages/components/console
npm run test
npm run build:styles   # after editing styles/console.scss
```

Baseline suites cover the console tree, layout, stylesheet, animations, pager,
input decoding and the surface. When touching shared behavior, also run
`@tsdi/components`, `@tsdi/components/common`, `@tsdi/components/html` and the
agent-ui test suite; terminal behavior needs the real PTY gate in `agent-ui`
(`harness/run-tui-gate.ts`).
