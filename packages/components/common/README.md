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
| `@tsdi/components/common` | `BaseComponentsModule`, `ThemeService`, display-width, shared input helpers, raw-element marker |
| `@tsdi/components/common/pager` | `ScrollBox`, `PagerBox`, `composePagerViewLines`, pager status copy |
| `@tsdi/components/common/syntax` | `tokenizeCodeLine`, `normalizeCodeLanguage`, `SyntaxToken` and state types |
| `@tsdi/components/common/<widget>` | one widget package: `alert`, `alert-notice`, `avatar`, `badge`, `breadcrumb`, `button`, `card`, `checkbox`, `data-table`, `dialog`, `divider`, `dynamic-form`, `empty-state`, `grid`, `icon`, `kbd`, `keymap`, `layout`, `list`, `markdown`, `menu-bar`, `pagination`, `panel`, `progress`, `radio-group`, `scrollbar`, `search-field`, `select`, `select-trigger`, `skeleton`, `stat`, `status-list`, `steps`, `switch`, `tab-bar`, `tabs`, `text-field`, `timeline`, `toast`, `toolbar`, `tree` |

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
| `list` | `ListComponent` / `ListModule` | Windowed list with paging. `items`, `cursor`, `hasMore`, `hasPrevious`, `loading`, `error`, `emptyLabel` (`empty` alias), labels (`loadingLabel`/`moreLabel`/`olderLabel`), `loadPage`/`loadPreviousPage`, `selectAction`/`selectValueAction`/`closeAction`, `visibleItems`, `windowOffset`, `showScrollbar`/`scrollbarLength` (TUI track), `maxHeight` (60vh scroll guard), detail props (`detailLines`, `contextLines`). |
| `select-list` | `SelectComponent` / `SelectModule` | Select menu overlay. `options` (`SelectOption[]`), `selectedIndex`, `visibleCount`, `title`, `hint`, `detailLines`, `suggestion`, `fitContent`, `maxWidth`/`minWidth`, `ariaLabel` (`accessibilityLabel` alias), `selectAction`, `closeAction`, `keydownAction`, `maxHeight` (60vh scroll guard). |
| `dialog-panel` | `DialogComponent` / `DialogModule` | Dialog chrome: `title`, `lines`, `hint`, `ariaLabel`, `closeLabel`, `closeAction`, `maxWidth`/`minWidth`, `horizontalChrome`. |
| `alert-dialog` | `AlertDialogComponent` / `AlertDialogModule` (`AlertModule` alias) | Dialog with semantic tone and primary action: adds `tone` (`info`/`success`/`warning`/`error`), `actionLabel`, `acceptAction`. |
| `toast-stack` | `ToastStackComponent` / `ToastModule` | Renders `ToastEntry[]`; the host provides `ToastService` (queue: `show`, `dismiss`, `clear`, `subscribe`) and feeds `items` to the stack. Derived `rows` carry the padded display text (`entries` alias). |
| `status-list` | `StatusListComponent` / `StatusListModule` | `title`, `hint`, `items` (`StatusListItem[]`) for compact key/value/status rows. |
| `keymap-panel` | `KeymapPanelComponent` / `KeymapPanelModule` (`KeymapModule` alias) | Keyboard help: `items` or `groups`, `grouped`, `title`, `hint`. |
| `tabs` | `TabsComponent` / `TabsModule` | Tab strip + content host driven by `TabsSource`; `stripOnly` renders only the bar, `activeId`, `select`/`create`/`close`. |
| `tab-bar` | `TabBarComponent` / `TabBarModule` | Shared strip only. Data comes from a `TabBarSource` attribute or the `TAB_BAR_SOURCE` token; `items` carry `active`, `showClose` (`true`/`false`/`'hover'`), `disabled`. |
| `menu-bar` | `MenuBarComponent` / `MenuBarModule` | Application menu with one level of flyout submenus. `groups` (`MenuBarGroup[]`), `label`, `icon`, `caret`, `align`, `open`, `selectAction`, `openChange` (`EventEmitter<boolean>`). |
| `workspace-layout` | `WorkspaceLayoutComponent` / `WorkspaceLayoutModule` (`LayoutModule` alias) | Left/center/right/bottom panes with draggable splitters. `leftRatio`/`rightRatio`/`bottomRatio`, `min*`, `resizable`, `*Collapsed`, `resizeAction`/`collapseAction`, `resizePane`/`togglePane` helpers. Style with `installWorkspaceLayoutStyles(document)`. |
| `grid-layout` / `grid-item` | `GridLayoutComponent` / `GridLayoutModule` | CSS-grid container. `columns`, `rows`, `gap`, `rowGap`, `columnGap`, `autoFit`, `minItemWidth`, `areas`, `flow`, `alignItems`, `justifyItems`, `fill`; items accept `span`, `rowSpan`, `start`, `end`, `rowStart`/`rowEnd`, `area`. |
| `markdown-table` / `markdown-code` | `MarkdownTableComponent` / `MarkdownModule` | Semantic table/code shells consumed by both renderers. Table cells are `MarkdownToken[]` + align; code lines are `MarkdownToken[][]` with tone classes. |
| `dynamic-form` | `DynamicFormComponent` / `DynamicFormModule` | JSON-schema form with shared validation. See the main `@tsdi/components` README for the full schema, validation and host API. |
| `icon` | `IconDirective` / `IconModule` | `<icon name="run" size="sm" label="…">` (or `icon` / `glyph`), registry lookups (`getIcon`, `resolveIcon`, `hasIcon`, `ICON_NAMES`), optional SVG helpers (`iconPathAttributes`, `iconGlyphText`). |
| `ui-button` | `ButtonComponent` / `ButtonModule` | Renderer-neutral action button. `label`, `icon`, `iconGlyph`, `tone`, `size` (`xs`/`sm`/`md`/`lg`), `variant` (`solid`/`outline`/`ghost`), `disabled`, `loading`, `pressed`, `block`, `action`. |
| `ui-badge` | `BadgeComponent` / `BadgeModule` | Status/count/filter pill. `label`, `icon`, `tone`, `size`, `variant`, `dot`, `active`, `disabled`, optional `action` (turns it into `role="button"`). |
| `ui-card` | `CardComponent` / `CardModule` | Surface card with optional title/subtitle/meta and an `actions` projection slot. `tone`, `dense`, `divider`; default projection is the body. |
| `ui-empty` | `EmptyStateComponent` / `EmptyStateModule` | Empty/search placeholder. `icon`, `title`, `hint`, `tone`, `actionLabel`, `action`; composes `ui-button` for the action. |
| `ui-divider` | `DividerComponent` / `DividerModule` | Separator with optional label; `orientation` (`horizontal`/`vertical`), `fill` renders a terminal-safe text rule. |
| `ui-stat` | `StatComponent` / `StatModule` | Compact metric tile. `label`, `value`, `hint`, `tone`, `trend` (`up`/`down`/`flat`), `trendLabel`. |
| `ui-progress` | `ProgressComponent` / `ProgressModule` | Progress indicator with a text bar (`█`/`░`) plus `role="progressbar"`/`aria-*`. `value`, `max`, `width`, `label`, `showValue`, `indeterminate`, `tone`. |
| `ui-breadcrumb` | `BreadcrumbComponent` / `BreadcrumbModule` | Flat breadcrumb trail. `items` (`BreadcrumbItem[]`), `separator`, `ellipsis`, `maxItems` collapse, `action`. |
| `ui-toolbar` | `ToolbarComponent` / `ToolbarModule` | Action strip with icon/label/separator items. `items` (`ToolbarItem[]`), `orientation`, `compact`, `ariaLabel`, `action`. |
| `ui-steps` | `StepsComponent` / `StepsModule` | Ordered steps/wizard header. `items` (`StepItem[]`), `current` (index or id), `orientation`, `connector`, `action`; explicit item status wins. |
| `ui-timeline` | `TimelineComponent` / `TimelineModule` | Vertical activity list. `items` (`TimelineItem[]`) with `title`/`label`, `detail`, `time`, `tone`, `status` (`pending`/`running`/`done`/`error`). |
| `ui-skeleton` | `SkeletonComponent` / `SkeletonModule` | Static loading placeholder. `lines`, `width`, `lineWidths`, `label`; uses `░` bars so TUI hosts render too. |
| `ui-search-field` | `SearchFieldComponent` / `SearchFieldModule` | Search/text field with leading icon, clear affordance and Enter submit. `value`, `label`, `placeholder`, `hint`, `clearable`, `disabled`, `readonly`, `changeAction`, `submitAction`, `clearAction`. |
| `ui-avatar` | `AvatarComponent` / `AvatarModule` | Person/entity avatar. `label` (initials), `icon`, `src`, `size`, `tone`, `shape` (`circle`/`square`), `status` (`online`/`offline`/`away`/`busy`). |
| `ui-pagination` | `PaginationComponent` / `PaginationModule` | Page selector. `total` (items), `pageSize`, `page`, `maxButtons`, `changeAction`; middle range collapses to an ellipsis. |
| `ui-data-table` | `DataTableComponent` / `DataTableModule` | Semantic columns/rows table. `columns` (`DataTableColumn[]`), `rows`, `rowKey`, `selectedKey`, `striped`/`bordered`/`dense`, `rowAction`, `emptyLabel`. |
| `ui-tree` | `TreeComponent` / `TreeModule` | Flattened hierarchical tree. `items` (`TreeNode[]`), `expandedIds`, `selectedId`, `indent`, `selectAction`, `toggleAction`. |
| `ui-text-field` | `TextFieldComponent` / `TextFieldModule` | Text/textarea field with label/hint/error, clear, Enter submit and blur. `value`, `type`, `multiline`, `rows`, `required`, `disabled`, `readonly`, `changeAction`, `submitAction`, `blurAction`. |
| `ui-checkbox` | `CheckboxComponent` / `CheckboxModule` | Semantic checkbox with visible `✓` state in DOM/TUI. `label`, `checked`, `disabled`, `changeAction`. |
| `ui-switch` | `SwitchComponent` / `SwitchModule` | On/off switch. `label`, `checked`, `onLabel`/`offLabel`, `disabled`, `changeAction`. |
| `ui-radio-group` | `RadioGroupComponent` / `RadioGroupModule` | Radio list with descriptions and keyboard navigation. `options` (`RadioOption[]`), `value`, `disabled`, `changeAction`. |
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
