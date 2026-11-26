# @tsdi/components/common

Renderer-neutral components and shared utilities for `@tsdi/components`.

This package is the layer between the reactive component core and the concrete
platform renderers. It contains widgets whose markup and behavior are identical
in a browser and in a terminal, plus the pure helpers both surfaces need
(display width, input handling, themes, paging, syntax tokens).

## Architecture

```
host application (agent-ui, workflow designer, admin UI, ...)
        │  @Component templates + imports
        ▼
@tsdi/components/common          ← this package (renderer-neutral)
        │  only depends on
        ▼
@tsdi/components                 ← reactive Proxy core, template compiler,
        │                          Renderer / TemplateParser abstractions
        ├── @tsdi/components/html      (real DOM)
        ├── @tsdi/components/console   (terminal grid)
        └── @tsdi/components/xml       (headless node tree)
```

Rules this layer must keep (see the root `AGENTS.md`):

- `common` may import `@tsdi/components`, `@tsdi/components/forms` and
  `@tsdi/ioc`, nothing else from the platform packages.
- It must never import `@tsdi/components/html` or `@tsdi/components/console`, and
  must not touch Node APIs (`node:`, `process`, `Buffer`, `fs`, ...).
- Platform differences are expressed through stable semantics — shared class
  names, `data-*` attributes and plain data props — not through per-platform
  branches or duplicated markup.
- Widgets receive everything they need as `@Attribute()` inputs/callbacks and
  expose only semantic state. The HTML renderer paints DOM, the console renderer
  paints terminal cells.
- `workspace-layout`, `grid-layout` and the DOM-only parts of `menu-bar` /
  `tabs` (pointer capture, document listeners) require a DOM document. They
  degrade to sequential/no-op rendering on the console renderer; do not add a
  second platform branch in the widget.

## Entry points

| Import | Contents |
| --- | --- |
| `@tsdi/components/common` | `BaseComponentsModule`, `ThemeService`, theme tokens/contrast, display-width, shared input helpers, raw-element marker |
| `@tsdi/components/common/pager` | `ScrollBox`, `PagerBox`, `composePagerViewLines`, pager status copy |
| `@tsdi/components/common/syntax` | `tokenizeCodeLine`, `normalizeCodeLanguage`, `SyntaxToken` and state types |
| `@tsdi/components/common/motion` | `Spring` (closed-form damped harmonic), `VelocityTracker`, `prefersReducedMotion`; hosts supply frame deltas. |
| `@tsdi/components/common` theme tokens | `THEME_TOKENS` / `themeTokens` / `contrastRatio` / `applyThemeTokens`; `ThemeService.tokens` exposes the current set, `applyTo(doc, { tokens: true })` mirrors it to `--ui-*` variables. |
| `@tsdi/components/common/<widget>` | one widget package: `accordion`, `alert`, `alert-notice`, `autocomplete`, `avatar`, `badge`, `breadcrumb`, `button`, `card`, `cascader`, `checkbox`, `chip`, `command-palette`, `data-table`, `descriptions`, `dialog`, `drawer`, `divider`, `dynamic-form`, `empty-state`, `field`, `grid`, `icon`, `image`, `inline-input`, `kbd`, `keymap`, `layout`, `list`, `markdown`, `menu-bar`, `pagination`, `panel`, `popover`, `progress`, `qr-code`, `radio-group`, `rate`, `result`, `scrollbar`, `search-field`, `search-list`, `segmented`, `select`, `select-trigger`, `skeleton`, `slider`, `space`, `spinner`, `stat`, `status-list`, `steps`, `switch`, `tab-bar`, `tabs`, `text-field`, `timeline`, `toast`, `toolbar`, `tooltip`, `transfer`, `tree`, `tree-select`, `typeahead`, `upload` |

## Naming conventions

- **Entry = feature slug** (`panel`, `list`, `dialog`, `alert`, `keymap`,
  `layout`, `toast`, ...). Widgets are imported from their own entry point, not
  from the root index.
- **Module = owning component + `Module`**: `PanelComponent` → `PanelModule`,
  `AlertDialogComponent` → `AlertDialogModule`, `KeymapPanelComponent` →
  `KeymapPanelModule`, `WorkspaceLayoutComponent` → `WorkspaceLayoutModule`.
  `AlertModule`, `KeymapModule` and `LayoutModule` are short compatibility
  aliases exported from the same entry points.
- **Component names name the feature**; the selector may add a role suffix to
  avoid native tags (`dialog-panel`, `select-list`). Selectors are kebab-case.
- **Canonical selector namespace is `ui-*`**. Every widget declares a `ui-`
  selector alias; existing short names (`panel`, `list`, `icon`, ...) remain in
  the same comma-separated selector for compatibility. New widgets must expose
  `ui-*`; the catalog spec enforces this.
- **Data types**: `*Item` for rendered rows (`ListItem`, `TabItem`,
  `MenuBarItem`), `*Option` for choices (`SelectOption`), `*Entry` for queue /
  persisted records (`ToastEntry`), `*Source` for injected providers
  (`TabBarSource`), `*Change` for `EventEmitter` outputs (`expandedChange`),
  `*Action` for callback inputs (`selectAction`, `closeAction`).
- **Deprecated aliases stay one minor version**: `ListEntry` → `ListItem`,
  `PanelLineItem` → `PanelItem`, `SelectComponent.accessibilityLabel` →
  `ariaLabel`, `ListComponent.empty` → `emptyLabel`,
  `ToastStackComponent.entries` → `rows`.

## Bootstrapping

`BaseComponentsModule` provides the renderer-neutral services (currently
`ThemeService`). Import it, plus the widget modules a component declares:

```ts
import { Component } from '@tsdi/components';
import { BaseComponentsModule } from '@tsdi/components/common';
import { PanelModule } from '@tsdi/components/common/panel';
import { ListModule } from '@tsdi/components/common/list';

@Component({
  selector: 'my-page',
  imports: [BaseComponentsModule, PanelModule, ListModule],
  template: `
    <panel :summary="summary" :items="detailItems"></panel>
    <list [items]="messages" :selectAction="select"></list>
  `
})
export class MyPageComponent {
  summary = '2 runs';
  detailItems = [{ lineNumber: '1', text: 'ready' }];
  messages = [{ id: 'm1', label: 'Hello' }];

  select = (item: { id: string }) => { /* ... */ };
}
```

Applications that mount a whole page pass the platform template module and the
core module; the shared modules come along through component `imports`:

```ts
const ctx = await Application.run(MyPageComponent, {
  deps: [HtmlTemplateModule, ComponentsModule]   // or XmlTemplateModule / ConsoleTemplateModule
});
```

## Services and helpers

### ThemeService

```ts
import { ThemeService, applyThemeToDocument } from '@tsdi/components/common';

const themes = new ThemeService();
themes.current;            // 'light' (default)
themes.available;          // ['light', 'dark', 'solarized', 'high-contrast']
themes.setTheme('dark');   // notifies subscribers
themes.subscribe(theme => { /* host: swap CSS variables */ });
applyThemeToDocument(document, 'high-contrast');
```

The service stores a theme name only. Renderers own the actual CSS variables
(`components/html` mirrors the theme onto document/data attributes, the console
renderer resolves its own variables from the active stylesheet).

### Display width

CJK/emoji-aware text metrics used by tables, braces and terminal layout:

```ts
getDisplayWidth('组件');          // 4
sliceByDisplayWidth(text, 20);    // cut without splitting wide glyphs
padByDisplayWidth(text, 20);      // right-pad to a column count
fitByDisplayWidth(text, 20);      // slice + pad
```

### Shared input helpers

Renderer-neutral state machines for prompts, select windows and history rules:
`clampSelectIndex`, `resolveSelectWindow` (`resolveListWindow`), `formatIndexedOptionLabel`,
`clampTextCursor`, `previousGraphemeIndex`/`nextGraphemeIndex`,
`previousWordStart`/`nextWordEnd`, `shouldSkipHistoryEntry`,
`processTextInputChunk`/`shouldSubmitTextInputChunk`, `resolveEnterAction`,
`buildBrandBlock`, `parseSlashCommandLine`. The browser and the terminal feed
the same helpers so keyboard behavior stays identical.

### Raw element refs

`markElementRefRaw(elementRef)` marks a renderer element ref so the reactive
proxy never wraps it. Widgets that hand their `ElementRef` to platform layout
code call it in the constructor; otherwise DOM/console nodes would be proxied
and compared/changed unexpectedly.

## Pager and scrolling model

`ScrollBox` is the unit-agnostic scroll/follow model; `PagerBox` adds find
matches over rendered lines; `composePagerViewLines` produces the HUD + visible
rows consumed by both surfaces.

```ts
import { PagerBox, composePagerViewLines } from '@tsdi/components/common/pager';
import { renderPagerView } from '@tsdi/components/html';       // DOM
// console: renderPrimaryTerminalScreen(...) paints the same lines

const pager = new PagerBox({ wheelStep: 3 });
pager.setContent(lines);
pager.search('error');
pager.visibleLines();
const view = composePagerViewLines(pager, viewportHeight);
```

- `ScrollBox`: `setContentHeight`, `setViewportHeight`, `setMetrics`, `scrollBy`,
  `scrollTo`, `scrollToEdge`, `handleKey`, `wheel`, `noteNewItems`,
  `resumeFollow`, `following`, `newItemCount`, `setSticky`.
- `PagerBox`: `open`/`close`, `setContent`, `search`, `nextMatch`/`prevMatch`,
  `visibleRange`/`visibleLines`, `matchesAtRow`, `scrollMatchIntoView`.
- DOM/terminal adapters live in `components/html` / `components/console`; they
  only mirror positions and paint segments (`match` / `current`).

## Syntax tokens

```ts
import { tokenizeCodeLine, normalizeCodeLanguage } from '@tsdi/components/common/syntax';

const state = {};
const tokens = tokenizeCodeLine('const x = 1;', 'ts', state); // [{ text, kind }, ...]
```

The tokenizer is shared by both renderers: DOM emits spans with `data-tone`,
the terminal maps token kinds to code-theme colors. Keep language profiles here
— never add a second tokenizer in a renderer or in agent-ui.

## Widget catalog

All widgets are renderer-neutral and expose their state through `@Attribute()`
fields. Actions are callback attributes (`selectAction`, `closeAction`,
`changeAction`, ...); value-change notifications use `EventEmitter` fields
(e.g. `panel.expandedChange`).

The selector column lists the legacy short name; every widget also accepts its
`ui-` alias (for example `panel` / `ui-panel`, `icon` / `ui-icon`).

| Selector | Component / module | Purpose and main attributes |
| --- | --- | --- |
| `panel` | `PanelComponent` / `PanelModule` | Collapsible detail panel. `summary`, `meta`, `selection`, `hint`, `items` (`PanelItem[]`), `expanded` + `expandedChange` (also emitted when a host writes `expanded`), `styles` per-part skin, `locale`, `expandText`/`collapseText`. Project slots with `<panel-header>`, `<panel-summary>`, `<panel-body>` children; clicking the header/summary/toggle flips `expanded`. |
| `ui-accordion` | `AccordionComponent` / `AccordionModule` | Generic collapsible section. `title`, `count`, `items` (`AccordionItem[]` with icon/label/description/badge/attrs/value), `expanded` + `expandedChange`, `toggleAction`, `selectAction`/`dragStartAction` (rows), `draggable`, `disabled`, `controlled`, `className`, `ariaLabel`; header tracks `aria-expanded`/`aria-controls` and the body is a labelled `role="region"`. The header is a real button (inline `data-plain` text in TUI) with Enter/Space toggling; item rows are `role="button"` with roving tabindex, `aria-disabled`, and Enter/Space select (disabled rows stay out of the tab order). Rows stay mounted while collapsed and a `<v-content>` outlet is kept for static content. Style with `installAccordionStyles(document)` / `--ui-accordion-*` variables. |
| `list` | `ListComponent` / `ListModule` | Windowed list with paging. `items`, `cursor`, `hasMore`, `hasPrevious`, `loading`, `error`, `emptyLabel` (`empty` alias), labels (`loadingLabel`/`moreLabel`/`olderLabel`), `loadPage`/`loadPreviousPage`, `selectAction`/`selectValueAction`/`closeAction`, `visibleItems`, `windowOffset`, `showScrollbar`/`scrollbarLength` (TUI track), `maxHeight` (60vh scroll guard), detail props (`detailLines`, `contextLines`). The listbox exposes `aria-busy`, the loading row is a polite live region, and load errors use `role="alert"`. |
| `select-list` | `SelectComponent` / `SelectModule` | Select menu overlay. `options` (`SelectOption[]`), `selectedIndex`, `visibleCount`, `title`, `hint`, `detailLines`, `suggestion`, `fitContent`, `maxWidth`/`minWidth`, `ariaLabel` (`accessibilityLabel` alias), `selectAction`, `closeAction`, `keydownAction`, `maxHeight` (60vh scroll guard). |
| `dialog-panel` | `DialogComponent` / `DialogModule` | Dialog chrome: `title`, `lines`, `hint`, `ariaLabel`/`ariaLabelledby`/`ariaDescribedby`, `modal`, `closable` (`closeLabel`, `closeAction`), `closeOnEscape`, `maxWidth`/`minWidth`, `horizontalChrome`; `overlayOpen` registers the shared overlay stack and `scrollLock` (default on) locks document scrolling while open. |
| `ui-tooltip` | `TooltipComponent` / `TooltipModule` | Trigger-anchored hint (Ant Design Tooltip). `content`, `visible`, `placement`, `disabled`, `focusable`, `openDelay`/`closeDelay`, `visibleChange`. Opens on hover/focus (browsers) and focus (TUI); hover intent delays are opt-in and Escape closes immediately, links through `aria-describedby` + `role="tooltip"`, closes on Escape, and paints the same text inline in terminal hosts. |
| `ui-popover` | `PopoverComponent` / `PopoverModule` | Host-controlled panel (Ant Design Popover). `visible`, `title`, `lines`, `placement`, `closable`, `closeLabel`, `closeAction`, `ariaLabel`, `className`, `overlayOpen`/`scrollLock`. Plain close button, `role="dialog"`, Escape handling; browsers position the panel above the anchor, terminal hosts paint title/lines inline. |
| `ui-drawer` | `DrawerComponent` / `DrawerModule` | Host-controlled side panel (Ant Design Drawer). `visible`, `title`, `lines`, `placement` (`left`/`right`/`bottom`), `size`, `closable`, `closeLabel`, `closeAction`, `ariaLabel`, `overlayOpen`/`scrollLock`. Fixed edge panel in browsers, inline panel in TUI; plain close button, `role="dialog"`, Escape close, projected body. |
| `ui-result` | `ResultComponent` / `ResultModule` | Operation result page (Ant Design Result). `status` (`success`/`error`/`info`/`warning`/`403`/`404`/`500`), `title`, `subTitle`, `lines`, `actionLabel`, `action`, `ariaLabel`. Status glyph/tone, focusable action with Enter/Space, identical text in DOM and TUI. |
| `ui-upload` | `UploadComponent` / `UploadModule` | Upload surface (Ant Design Upload) with host-owned file I/O. `label`, `hint`, `accept`, `multiple`, `files` (`{ name, size?, status? }` or strings), `pickAction`, `removeAction`, `removeLabel`, `disabled`, `ariaLabel`. Focusable trigger + Enter/Space, plain remove buttons, identical file list in DOM/TUI. |
| `ui-image` | `ImageComponent` / `ImageModule` | Image with caption (Ant Design Image / MUI Image). `src`, `alt`, `fallback`, `width`, `height`, `fit`, `className`. Browsers render `<img>` + caption; terminal hosts render the caption text. |
| `ui-qr-code` | `QrCodeComponent` / `QrCodeModule` | QR matrix display (host supplies the precomputed matrix). `matrix` (`boolean[][]` or `'1010'` rows), `on`/`off` module glyphs, `quietZone`, `ariaLabel`. Encoding stays host-side so common has no Node/QR dependency; browsers and TUI paint identical rows. |
| `alert-dialog` | `AlertDialogComponent` / `AlertDialogModule` (`AlertModule` alias) | Dialog with semantic tone and primary action: adds `tone` (`info`/`success`/`warning`/`error`), `actionLabel`, `acceptAction`, plus the same `ariaLabelledby`/`ariaDescribedby`, `modal`, `closable`, `closeOnEscape` contract. |
| `toast-stack` | `ToastStackComponent` / `ToastModule` | Renders `ToastEntry[]`; the host provides `ToastService` (queue: `show`, `dismiss`, `clear`, `invoke`, `subscribe`) and feeds `items` to the stack. Entries may carry `actionLabel`/`action` (for example Undo); the stack exposes the action as a focusable inline button and calls `actionAction(id)` (host runs `service.invoke`). Derived `rows` carry the padded display text (`entries` alias). |
| `status-list` | `StatusListComponent` / `StatusListModule` | `title`, `hint`, `items` (`StatusListItem[]`) for compact key/value/status rows. |
| `keymap-panel` | `KeymapPanelComponent` / `KeymapPanelModule` (`KeymapModule` alias) | Keyboard help: `items` or `groups`, `grouped`, `title`, `hint`. |
| `tabs` | `TabsComponent` / `TabsModule` | Tab strip + content host driven by `TabsSource`; `stripOnly` renders only the bar, `activeId`, `activationMode` (`automatic`/`manual`), `select`/`create`/`close`. Projected panes stay mounted and are exposed as `role="tabpanel"` with stable `id`/`aria-labelledby` and `aria-hidden`/`tabindex` following the active tab. |
| `tab-bar` | `TabBarComponent` / `TabBarModule` | Shared strip only. Data comes from a `TabBarSource` attribute or the `TAB_BAR_SOURCE` token; `items` carry `active`, `showClose` (`true`/`false`/`'hover'`), `disabled`. Roving `tabindex` (one reachable tab), Arrow/Home/End navigation, Enter/Space activation and Delete/Backspace close, plus `aria-orientation`; tabs/close/create/scroll targets are focusable in TUI, tab ids/`aria-controls` link to panes, and `activationMode="manual"` focuses without selecting until Enter/Space. |
| `menu-bar` | `MenuBarComponent` / `MenuBarModule` | Application menu with one level of flyout submenus. `groups` (`MenuBarGroup[]`), `label`, `icon`, `caret`, `align`, `open`, `selectAction`, `openChange` (`EventEmitter<boolean>`). Trigger ArrowDown/Up opens and focuses the menu; Arrow/Home/End rove, printable keys jump to the next matching enabled item (repeating one letter cycles), ArrowRight/Left enter/leave flyouts, Escape closes and returns focus, `aria-haspopup`/`aria-expanded` track flyouts. Opt-in `overlayEnabled` registers the open menu in `OverlayManager` so stacked overlays dismiss top-only and `beforeCloseAction` can veto. |
| `workspace-layout` | `WorkspaceLayoutComponent` / `WorkspaceLayoutModule` (`LayoutModule` alias) | Left/center/right/bottom panes with draggable splitters. `leftRatio`/`rightRatio`/`bottomRatio`, `min*`, `resizable`, `*Collapsed`, `resizeAction`/`collapseAction`, `resizePane`/`togglePane` helpers. Style with `installWorkspaceLayoutStyles(document)`. |
| `grid-layout` / `grid-item` | `GridLayoutComponent` / `GridLayoutModule` | CSS-grid container. `columns`, `rows`, `gap`, `rowGap`, `columnGap`, `autoFit`, `minItemWidth`, `areas`, `flow`, `alignItems`, `justifyItems`, `fill`; items accept `span`, `rowSpan`, `start`, `end`, `rowStart`/`rowEnd`, `area`. |
| `markdown-table` / `markdown-code` | `MarkdownTableComponent` / `MarkdownModule` | Semantic table/code shells consumed by both renderers. Table cells are `MarkdownToken[]` + align; code lines are `MarkdownToken[][]` with tone classes. |
| `data-table` | `DataTableComponent` / `DataTableModule` | Async `source(request, signal)`, column `filters`/`setFilter`/`clearFilters`, `column.render`, and opt-in `virtual` windowing (`scrollTop`/`viewportHeight` + row-height spacers). |
| `typeahead` | `TypeaheadComponent` / `TypeaheadModule` | Async combobox: `source(query, signal)` with loading/empty/error/retry; stale requests aborted. |
| `search-list` | `SearchListComponent` / `SearchListModule` | Searchable list/command-palette base: `items` or async `source(query, signal)`, local filtering, groups, `recentIds`, roving active row (`aria-activedescendant`) with Arrow/Home/End skipping disabled rows, loading/error/retry, `selectAction`/`closeAction`; controlled mode `showInput=false` + `selectedId` lets hosts own focus/query. |
| `command-palette` | `CommandPaletteComponent` / `CommandPaletteModule` | Overlay composed from `ui-search-list` + `OverlayManager`: `open`, `title`, `hint`, `items`/`source`, `recentIds`, `closable`, `beforeCloseAction`, `selectAction`/`closeAction`, `openChange`. Default-registers as a `palette` overlay with `overlayEnabled`/`scrollLock`; backdrop and Escape close when allowed. |
| `inline-input` | `InlineInputComponent` / `InlineInputModule` | Click/keyboard inline editor for tab/session/task titles: `value`, `editing`, `placeholder`, `maxLength`, `changeAction`/`submitAction`/`cancelAction`/`editAction`; Enter and blur commit, Escape cancels. |
| `field` | `FieldComponent` / `FieldModule` | `ui-field-group` wrapper: label/hint/error/required + `aria-describedby` linkage; project the control inside. |
| `dynamic-form` | `DynamicFormComponent` / `DynamicFormModule` | JSON-schema form with shared validation. Fields expose `aria-required`/`aria-invalid`; the live error (`role="alert"`) and description are linked through `aria-describedby` with stable per-field ids. See the main `@tsdi/components` README for the full schema, validation and host API. |
| `icon` | `IconDirective` / `IconModule` | `<icon name="run" size="sm" label="…">` (or `icon` / `glyph`), registry lookups (`getIcon`, `resolveIcon`, `hasIcon`, `ICON_NAMES`), optional SVG helpers (`iconPathAttributes`, `iconGlyphText`). |
| `ui-button` | `ButtonComponent` / `ButtonModule` | Renderer-neutral action button. `label`, `icon`, `iconGlyph`, `tone`, `size` (`xs`/`sm`/`md`/`lg`), `variant` (`solid`/`outline`/`ghost`), `shape` (`default`/`round`/`circle`), `iconOnly`, `disabled`, `loading`, `pressed`, `block`, `action`. |
| `ui-badge` | `BadgeComponent` / `BadgeModule` | Status/count/filter pill. `label`, `icon`, `tone`, `size`, `variant`, `dot`, `active`, `disabled`, optional `action` (turns it into a tabbable `role="button"`; Enter/Space activate in DOM and TUI). |
| `ui-chip` | `ChipComponent` / `ChipModule` | Removable/actionable compact entity (Ant Design Tag / MUI Chip). `label`, `avatar`, `icon`, `tone`, `size`, `variant`, `selected`, `disabled`, `closable`, `action`, `removeAction`, `closeLabel`, `ariaLabel`; `<chip-prepend>` projects leading content. The close affordance is a real `<button data-plain>` (inline `✕` in TUI); Enter/Space activate and remove in both renderers. |
| `ui-card` | `CardComponent` / `CardModule` | Surface card with optional title/subtitle/meta and an `actions` projection slot. `tone`, `dense`, `divider`; default projection is the body. |
| `ui-empty` | `EmptyStateComponent` / `EmptyStateModule` | Empty/search placeholder. `icon`, `title`, `hint`, `tone`, `actionLabel`, `action`; composes `ui-button` for the action. |
| `ui-divider` | `DividerComponent` / `DividerModule` | Separator with optional label; `orientation` (`horizontal`/`vertical`), `fill` renders a terminal-safe text rule. |
| `ui-stat` | `StatComponent` / `StatModule` | Compact metric tile. `label`, `value`, `hint`, `tone`, `trend` (`up`/`down`/`flat`), `trendLabel`. |
| `ui-progress` | `ProgressComponent` / `ProgressModule` | Progress indicator with a text bar (`█`/`░`) plus `role="progressbar"`/`aria-*`. `value`, `max`, `width`, `label`, `showValue`, `indeterminate`, `indeterminateLabel`, `interval`, `reduceMotion`, `tone`; `aria-busy` tracks the indeterminate state, custom labels stay localizable, and the sweep advances from the shared `AnimationClock` (or freezes with `reduceMotion`) while painting the same frames in DOM and TUI. |
| `ui-slider` | `SliderComponent` / `SliderModule` | Text-track slider with identical filled/thumb/empty glyphs in DOM and TUI. `value`, `min`, `max`, `step`, `width`, `label`, `unit`, `showValue`, `disabled`, `changeAction`; `role="slider"` + `aria-value*`, Arrow/PageUp/PageDown/Home/End keys and `setValue` for host pointer input. |
| `ui-spinner` | `SpinnerComponent` / `SpinnerModule` | Loading indicator (Ant Design Spin / MUI CircularProgress) driven by the shared `AnimationClock`. `label`, `ariaLabel`, `frames`, `interval`, `size`, `pause`; no component-owned timer, and DOM/TUI paint the same frame. |
| `ui-space` | `SpaceComponent` / `SpaceModule` | Inline/stack layout primitive (Ant Design Space / MUI Stack). `items` (strings or `{ label, icon?, iconGlyph? }`), `direction` (`horizontal`/`vertical`), `separator`, `size`, `wrap`, `itemsGap`, `ariaLabel`, optional `action`. Horizontal items join with the separator in both renderers; vertical items stack line by line; projected children remain supported. |
| `ui-descriptions` | `DescriptionsComponent` / `DescriptionsModule` | Read-only key/value detail list (Ant Design Descriptions). `items` (`{ label, value, hint?, span?, tone? }`), `groups` (`{ title?, extra?, items }[]` with separators), `title`/`extra`, `columns` (1–6, browser grid; terminal keeps one row per item), `layout` (`horizontal`/`vertical`), `separatorChar`/`separatorWidth`, `bordered`, `dense`, `size`, `emptyLabel`, `ariaLabel`. Both renderers paint headers, `label: value` and separators in the same order. |
| `ui-segmented` | `SegmentedComponent` / `SegmentedModule` | Single-choice segmented control (Ant Design Segmented / MUI ToggleButtonGroup). `options` (`{ label, value, icon?, iconGlyph?, disabled? }`), `value`, `size`, `disabled`, `ariaLabel`, `changeAction`; roving `tabindex`, Arrow/Home/End navigation, `role="radiogroup"`/`role="radio"`, shared selected skin and terminal separators hidden by the browser skin. |
| `ui-breadcrumb` | `BreadcrumbComponent` / `BreadcrumbModule` | Flat breadcrumb trail. `items` (`BreadcrumbItem[]`), `separator`, `ellipsis`, `maxItems` collapse, `action`. Ancestor crumbs are keyboard reachable (`tabindex=0`, Enter/Space) and the current crumb exposes `aria-current="page"`. |
| `ui-toolbar` | `ToolbarComponent` / `ToolbarModule` | Action strip with icon/label/separator items. `items` (`ToolbarItem[]`), `orientation`, `compact`, `ariaLabel`, `action`. Roving `tabindex` keeps one command reachable; Arrow/Home/End move focus and skip disabled items in DOM and TUI. |
| `ui-steps` | `StepsComponent` / `StepsModule` | Ordered steps/wizard header. `items` (`StepItem[]`), `current` (index or id), `orientation`, `connector`, `action`; explicit item status wins, the current step exposes `aria-current="step"`, and a supplied `action` turns steps into focusable buttons with Enter/Space (DOM and TUI). |
| `ui-timeline` | `TimelineComponent` / `TimelineModule` | Vertical activity list. `items` (`TimelineItem[]`) with `title`/`label`, `detail`, `time`, `tone`, `status` (`pending`/`running`/`done`/`error`). Running rows expose `aria-current` and `aria-live="polite"`; the root is a labelled list. |
| `ui-skeleton` | `SkeletonComponent` / `SkeletonModule` | Static loading placeholder. `lines`, `width`, `lineWidths`, `label`; uses `░` bars so TUI hosts render too. |
| `ui-search-field` | `SearchFieldComponent` / `SearchFieldModule` | Search/text field with leading icon, clear affordance and Enter submit. `value`, `label`, `placeholder`, `hint`, `error`, `inputId`/`name`, `clearable`, `disabled`, `readonly`, `changeAction`, `submitAction`, `clearAction`. Hint/error are wired through `aria-describedby`; the error is a `role="alert"`; Enter is ignored during IME composition; the clear affordance is a plain inline button in TUI. |
| `ui-avatar` | `AvatarComponent` / `AvatarModule` | Person/entity avatar. `label` (initials), `icon`, `src`, `size`, `tone`, `shape` (`circle`/`square`), `status` (`online`/`offline`/`away`/`busy`). |
| `ui-pagination` | `PaginationComponent` / `PaginationModule` | Page selector. `total` (items), `pageSize`, `page`, `maxButtons`, `pageLabel` (`{page}` placeholder), `changeAction`; middle range collapses to an ellipsis and the active page carries `aria-current="page"`. Optional `showSizeChanger` + `pageSizeOptions`/`pageSizeChangeAction` (cycles sizes in DOM/TUI) and `showQuickJumper` (Enter jumps). |
| `ui-data-table` | `DataTableComponent` / `DataTableModule` | Semantic columns/rows table. `columns` (`DataTableColumn[]`, optional `sortable`/`sortKey`), `rows`, `rowKey` (key or function), `selectedKey`, `selectable` + `selectedKeys`/`selectionAction` (tri-state `role="checkbox"` header and rows), `pagination` + `page`/`pageSize`/`pageChangeAction` (shared `ui-pagination` footer, sorting applies to the full set before slicing), `expandable` + `expandedKeys`/`expandAction`/`detailLines` (roving `▸`/`▾` expander and detail rows), `keyboardNavigation` (grid cell roving with Arrow/Home/End/PageUp/PageDown, Enter/Space), column `fixed`/`resizable` + `resizableColumns` (sticky left/right edges with stacked offsets, pointer column resizing), `striped`/`bordered`/`dense`, `stickyHeader`, `loading` + `loadingLabel`, `caption`, `emptyLabel`, `ariaLabel`, `sortKey`/`sortDirection`, `sortAction`, `rowAction`. Sortable headers expose `aria-sort` and toggle on click/Enter/Space. Async `source(request, signal)` adds loading/error/retry/paging; `filters`/`setFilter`/`clearFilters` and `column.render` are host-driven; `virtual` + `scrollTop`/`viewportHeight` renders a row window with spacers and reports `windowAction(start,end,total)`. |
| `ui-tree` | `TreeComponent` / `TreeModule` | Flattened hierarchical tree. `items` (`TreeNode[]`), `expandedIds`, `selectedId`, `indent`, `selectionFollowsFocus` (default on), `selectAction`, `toggleAction`. `role="tree"`/`treeitem` with `aria-level`/`expanded`/`selected`, one active row (`is-active`/tab stop), and shared Arrow/Home/End/Enter navigation that also works on a focused TUI row; with `selectionFollowsFocus=false`, arrows rove without committing and Enter/click activate. |
| `ui-transfer` | `TransferComponent` / `TransferModule` | Two-pane transfer list (Ant Design Transfer). `items` (`{ key, label, description?, disabled? }`), `targetKeys`, `sourceTitle`/`targetTitle`, `emptyLabel`, move labels, `disabled`, `changeAction(next, direction, moved)`. Selection supports click and Enter/Space; browsers show side-by-side panes, terminal hosts stack source/actions/target with the same state. |
| `ui-autocomplete` | `AutoCompleteComponent` / `AutoCompleteModule` | Combobox with host-filtered suggestions (Ant Design AutoComplete). `value`, `options` (`{ label, value, description?, disabled? }`), `placeholder`, `emptyLabel`, `loading`, `ariaLabel`, `changeAction(value)`, `selectAction(value)`. Arrow keys and Home/End rove enabled options (skipping disabled), Enter selects, Escape closes; `aria-controls`/`aria-activedescendant` track the panel, and the input/panel work in DOM and TUI. |
| `ui-cascader` | `CascaderComponent` / `CascaderModule` | Hierarchical path picker (Ant Design Cascader). `options` (`{ label, value, children?, disabled? }`), `value` (`string[]`), `placeholder`, `ariaLabel`, `disabled`, `changeAction(path, nodes)`. Branch clicks append a column; leaf clicks commit the path; ArrowUp/Down + Home/End rove enabled options, ArrowRight enters/expands branches, ArrowLeft collapses a level (or closes at the root), Enter commits and Escape closes, returning focus to the trigger. Browsers show columns side by side, terminal hosts stack the same columns. |
| `ui-tree-select` | `TreeSelectComponent` / `TreeSelectModule` | Tree-backed single selection (Ant Design TreeSelect). `items` (`TreeNode[]`), `selectedId`, `expandedIds`, `placeholder`, `ariaLabel`, `disabled`, `changeAction(node)`. Trigger opens the shared tree panel (inline in TUI, anchored panel in browsers); Enter/Space/ArrowDown opens, Arrow/Home/End rove inside the tree, Enter or click commits, and Escape closes and returns focus to the trigger. |
| `ui-text-field` | `TextFieldComponent` / `TextFieldModule` | Text/textarea field with label/hint/error, clear, Enter submit and blur. `value`, `type`, `multiline`, `rows`, `required`, `disabled`, `readonly`, `inputId`/`name`, `prefix`/`suffix`/`addonBefore`/`addonAfter`, `maxLength`, `showCount` (character counter, code-point aware), `inputMode`/`autocomplete`/`enterKeyHint`, `revealable` + password labels/glyphs, `changeAction`, `submitAction`, `blurAction`. Ctrl/Cmd+Backspace clears when clearable; Enter/Escape shortcuts are ignored during IME composition; clear/reveal are plain inline buttons in TUI. Label/hint/error keep `for`/`aria-describedby`/`role="alert"`. |
| `ui-checkbox` | `CheckboxComponent` / `CheckboxModule` | Semantic checkbox with visible `✓` state in DOM/TUI. `label`, `checked`, `disabled`, `changeAction`. Space/Enter toggle and the control is focusable in both renderers. |
| `ui-switch` | `SwitchComponent` / `SwitchModule` | On/off switch. `label`, `checked`, `onLabel`/`offLabel`, `disabled`, `changeAction`. Space/Enter toggle and the control is focusable in both renderers. |
| `ui-radio-group` | `RadioGroupComponent` / `RadioGroupModule` | Radio list with descriptions and keyboard navigation. `options` (`RadioOption[]`), `value`, `disabled`, `changeAction`. Roving tabindex keeps one radio tabbable; Arrow/Space/Enter and click share the same selection path in DOM and TUI. |
| `ui-rate` | `RateComponent` / `RateModule` | Star rating (Ant Design Rate / MUI Rating). `value`, `count` (1–10), `character`/`emptyCharacter`, `size`, `allowClear`, `readonly`, `disabled`, `ariaLabel`, `changeAction`. `role="slider"` + `aria-value*`; arrows/Home/End/Enter/Space and star clicks share one update path, and both renderers paint the same glyphs. |
| `ui-alert` | `AlertNoticeComponent` / `AlertNoticeModule` | Inline alert/callout (not a modal). `title`, `lines`, `tone`, `icon`, `actionLabel`/`action`, `dismissible`/`closeAction`; error tones use `role="alert"`. |
| `ui-select-trigger` | `SelectTriggerComponent` / `SelectTriggerModule` | Combobox trigger for a host-owned dropdown. `value`/`label`, `placeholder`, `icon`, `open`, `disabled`, `clearable`, `action`, `clearAction`. |
| `ui-kbd` | `KbdComponent` / `KbdModule` | Keyboard shortcut hint. `keys` (`string[]`), `separator`, `size`, `tone`, `ariaLabel`; DOM renders `<kbd>` boxes. |
| `ui-scrollbar` | `ScrollbarComponent` / `ScrollbarModule` | Renderer-neutral scrollbar track. `offset`, `visible`, `total`, `length`, `orientation` (`vertical`/`horizontal`), `trackChar`/`thumbChar`; vertical emits one cell per line for TUI. |

### Projection example (`panel`)

```html
<panel :items="detailItems">
  <panel-header>{{summary}}</panel-header>
  <panel-summary>
    <label v-for="line in summaryLines">{{line}}</label>
  </panel-summary>
  <panel-body>
    <label v-for="line in bodyLines">{{line}}</label>
  </panel-body>
</panel>
```

The slotted tags are resolved through `@ContentChildren(...)` (the renderers keep
the projected nodes in `PROJECTION_NODES`), so dynamic `v-for` / `v-if` content
is reflected without a platform flag. Query refreshes after structural changes
land in a microtask.

## Base UI primitives

`ui-button`, `ui-badge`, `ui-card`, `ui-empty`, `ui-divider`, `ui-stat`,
`ui-progress`, `ui-breadcrumb`, `ui-toolbar`, `ui-steps`, `ui-timeline`,
`ui-skeleton`, `ui-search-field`, `ui-avatar`, `ui-pagination`,
`ui-data-table`, `ui-tree`, `ui-text-field`, `ui-checkbox`, `ui-switch`,
`ui-radio-group`, `ui-alert`, `ui-select-trigger`, `ui-kbd` and
`ui-scrollbar` form the shared base layer. They use the same
contract:

- `tone` (`default` / `info` / `success` / `warning` / `danger` / `error` /
  `accent` / `muted`) and `size` (`xs` / `sm` / `md` / `lg`) are normalized by
  `normalizeTone` / `normalizeSize` into safe `is-*` classes and `data-tone`.
- Boolean attributes accept `true`, `""`, `"true"` and `"false"` via
  `normalizeBoolean`.
- The widgets are skin-agnostic: emit stable `ui-*` classes and semantic ARIA,
  then call `installUiStyles(document)` for the neutral default skin. Every
  color is a `--ui-*` variable, so hosts keep their own theme.
- `ui-progress` uses block characters (`█`/`░`) so terminal and DOM hosts share
  the same value rendering; DOM skins can style over the text or hide it.

```html
<ui-card title="Routes" subtitle="2 staged" meta="v1" divider>
  <ui-button slot="actions" label="Apply" tone="accent"></ui-button>
  <ui-breadcrumb :items="trail" :maxItems="4"></ui-breadcrumb>
  <ui-progress label="Load" :value="load" :max="100"></ui-progress>
</ui-card>
<ui-empty icon="search" title="Nothing found" hint="Try another query"
  actionLabel="Clear" :action="clear"></ui-empty>
```

### Popup viewport guard

`select-list` and `list` apply an inline `max-height: 60vh` + `overflow-y: auto`
scroll box to their option/row area, so a long menu never grows past the
viewport in a DOM host. Set `maxHeight=""` to let the host own the constraint,
or pass a different value (`40vh`, `18rem`, ...). Terminal hosts keep their
existing windowing/`visibleCount` behavior.

## Styling

Widgets emit stable class names (`console-panel`, `dialog-panel`, `list-panel`,
`select-shell`, `tab-bar`, `markdown-table`, ...) and semantic attributes
(`data-tone`, `data-status`, `data-selected`, `aria-*`). DOM hosts install the
shared skins with the exported helpers — `installDynamicFormStyles`,
`installGridLayoutStyles`, `installIconStyles`, `installMenuBarStyles`,
`installTabBarStyles`, `installWorkspaceLayoutStyles`, `installUiStyles` — while the console
renderer resolves the same class names through the compiled console stylesheet
(`components/console/styles/console.scss`, shipped as
`default-styles.generated.ts`). All installers go through the shared
`installStyleSheet(doc, id, css)` helper and are idempotent. Widgets without an
`install*Styles` helper (`panel`, `list`, `select`, `dialog`, `alert`,
`toast-stack`, `status-list`, `keymap-panel`, `markdown`) only emit structure
classes; the host skin owns their colors. Do not hard-code colors in widget
templates — use the theme variables documented under each widget's styles
module.

Semantic buttons that must read as inline text (the dialog `✕`, inline
acknowledgements) add `data-plain="true"` and the `ui-plain-button` class. The
console renderer paints those labels inline instead of the standalone `[ label ]`
affordance, and the shared `installUiStyles` skin strips native browser button
chrome while keeping the element a real `<button>` for focus and assistive
technology.

## Exports

```ts
// core helpers
export { BaseComponentsModule, ThemeService, applyThemeToDocument }
export { getDisplayWidth, sliceByDisplayWidth, padByDisplayWidth, fitByDisplayWidth }
export * from './input'          // shared prompt/select/history helpers
export { markElementRefRaw }
export { installStyleSheet }
export { installUiStyles, UI_CSS, UI_STYLE_ID }
export { normalizeTone, normalizeSize, normalizeBoolean, iconSizeFor }

// widgets are imported from their own entry points
export * from '@tsdi/components/common/panel'   // etc.
```

## Testing

```bash
cd packages/components/common
npm run test      # ts-node -r tsconfig-paths/register unit.ts
```

Widget specs live in `test/`; they mount real components through `Application`
and assert the rendered DOM/console output. Keep new widgets covered by a
spec that mounts them with a real renderer instead of only calling methods.

## Bench and catalog

`npm run bench` exercises the data-table filter/sort/format hot paths and the
spring integration loop with CPU timing. Compare before/after numbers rather
than using them as absolute budgets.

`npm run bench:check` applies calibration-scaled budgets. The unified gate can
run it with `RUN_COMMON_BENCH=1 bash scripts/agents-gate.sh components-common-bench`.

`npm run catalog` writes a static HTML catalog (attributes, keyboard contract,
surface notes and examples) to `docs/catalog.html`; pass a path as the first
argument to write it elsewhere.

## Design plans

- `docs/component-optimization.md` — Node-RED parity for dynamic-form/config.
- `docs/opencode-alignment-plan-2026-11.md` — quality alignment with latest
  opencode (catalog, a11y, overlays, motion, theme, bench).
