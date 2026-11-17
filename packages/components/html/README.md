# @tsdi/components/html

Browser renderer for `@tsdi/components`.

`@tsdi/components` compiles templates into a renderer-neutral node tree. This
package supplies the **DOM implementation** of the renderer ports
(`Renderer`, `TemplateParser`, `TemplateCompiler`) plus the browser-side helpers
a console-style host needs: the animation clock, transcript scrolling/follow,
pager painting, overlay anchoring and markdown width measurement.

## Architecture

```
@Component template
        │
        ▼
HtmlTemplateParser  ──►  RNode tree (real DOM nodes)
        │
        ▼
HtmlTemplateCompiler ──► binding factories (interpolation, :prop, v-for, v-if, @click, ...)
        │
        ▼
reactive effect.run(binding)  ──►  HtmlRenderer (DOM API)  ──►  browser paint
```

- `HtmlRenderer` implements `Renderer` on top of a real `Document`: element /
  text / comment creation, attribute + property writes, class/style helpers,
  `querySelector`/`querySelectorAll` (native DOM queries with attribute
  fallbacks).
- Structural directives (`v-for`/`v-if`/`v-switch`) are anchored on a
  `<v-container>` element. `HtmlRenderer` installs a single global rule
  `v-container { display: contents; }` so the anchor never consumes a
  grid/flex slot.
- `BrowserAnimationClock` implements the shared `AnimationClock`; it is bound to
  `AnimationClock` in the module so directives such as hover fades and elapsed
  time advance from one real clock.
- The package is **DOM-only**: it must not import `@tsdi/components/console`,
  and the console renderer must not import this package. Shared markup lives in
  `@tsdi/components/common`.

## Module wiring

`HtmlTemplateModule` imports `BaseComponentsModule` and provides:

| Provider | Implementation |
| --- | --- |
| `HtmlRenderer` | `Renderer` (also exposed as the default `Renderer`) |
| `HtmlTemplateParser` | `TemplateParser` (default) |
| `HtmlTemplateCompiler` | `TemplateCompiler` (default) |
| `BrowserAnimationClock` | `AnimationClock` |
| `HTML_COMPILER_OPTIONS` | `{ delimiters: ['{{', '}}'] }` by default |

```ts
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentsModule } from '@tsdi/components';
import { HtmlTemplateModule } from '@tsdi/components/html';

const ctx = await Application.run(AppComponent, {
  deps: [HtmlTemplateModule, ComponentsModule]
});
```

Custom delimiters/options:

```ts
@Module({ imports: [HtmlTemplateModule.withOptions({ delimiters: ['${', '}'] })] })
export class AppModule {}
```

Component-level imports are enough for a page that only uses shared widgets:

```ts
@Component({
  selector: 'dashboard-page',
  imports: [BaseComponentsModule, GridLayoutModule, PanelModule],
  template: `<grid-layout columns="2"><panel :items="items"></panel></grid-layout>`
})
export class DashboardPageComponent { /* ... */ }
```

In a browser host the `DOCUMENT` token (from `@tsdi/common`) is injected into
`HtmlRenderer`. When no document is provided (unit tests, non-browser hosts), the
renderer falls back to a JSDOM document so templates can still be compiled.

## DOM helpers

| Export | Purpose |
| --- | --- |
| `BrowserAnimationClock` | `AnimationClock` backed by `requestAnimationFrame`; one real clock drives hover fades and elapsed time (it never starts a private interval). |
| `DomScrollBox` | DOM adapter for the renderer-neutral `ScrollBox` from `@tsdi/components/common/pager`: mirrors `scrollTop`/`scrollHeight`/`clientHeight` and keeps follow/new-item state. |
| `DomTranscriptFollower` | Binds a transcript element (+ optional "N new messages" indicator) to `DomScrollBox`: locks reading position while new rows arrive, counts them, reveals the jump-to-latest affordance, resumes following at the bottom, reports `onReachTop` for older-page loading. |
| `renderPagerView(doc, container, lines)` | Paints `composePagerViewLines` output (HUD + highlighted rows) into a DOM container; matches the TUI pager exactly. |
| `measureDomConsoleColumns(element)` | Measures the transcript's real character grid so markdown tables/prose wrap to the browser width instead of a terminal default. |
| `DomOverlayAnchors` | Measures the footer height into a CSS variable and positions floating chrome (indicator) against the composer; observes resize/resize-observer and cleans up with `dispose()`. |

Transcript scroll wiring:

```ts
const follower = new DomTranscriptFollower(transcriptEl, indicatorEl, {
  labels: { newMessages: '{count} 条新消息', jumpToBottom: '回到最新' },
  onReachTop: () => void loadOlderPage()
});
follower.attach();
follower.wheel(deltaY);          // wheel → viewport scroll (returns handled)
follower.page(-1);               // PageUp
follower.notifyPrepend();        // older page prepended
follower.onContentGrew();        // streaming append
follower.resumeFollow();         // jump to latest
follower.detach();
```

Overlay/counter anchoring:

```ts
const anchors = new DomOverlayAnchors({
  document,
  container: rootEl,
  footer: composerFooterEl,
  composer: composerEl,
  indicator: backToLatestEl,
  footerVariable: '--console-footer-height'
});
anchors.attach();
// ...
anchors.dispose();
```

## Styling and theming

- Rendered markup keeps the semantic class names emitted by shared widgets
  (`console-panel`, `dialog-panel`, `list-panel`, `markdown-table`,
  `tab-bar`, ...) and `data-*` attributes. Style them from the host stylesheet;
  never fork widget markup.
- Apply a theme from `@tsdi/components/common`:

  ```ts
  import { ThemeService, applyThemeToDocument } from '@tsdi/components/common';
  applyThemeToDocument(document, 'dark');   // mirrors data-theme / data-agent-theme
  ```

  Renderers own the CSS variables; the browser skin must define light, dark,
  solarized and high-contrast variants rather than hard-coding one palette.
- `HtmlRenderer` only injects the structural-anchor rule; all product styling
  belongs to the host (`web/console.css`, workflow styles, ...).

## Testing

```bash
cd packages/components/html
npm run test
```

The package test runner must set `platform: 'browser'`:

```ts
runTest('./test/**/*.ts', { baseURL: __dirname, platform: 'browser' });
```

Specs mount real components through `Application` with `HtmlTemplateModule`
and assert DOM output (attributes, text, classes). When changing shared markup,
also run `@tsdi/components/common` and the consuming host (agent-ui) suites.
