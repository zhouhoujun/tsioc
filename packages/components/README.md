# packaged @tsdi/components

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/tsioc).

`@tsdi/components`： components framewroks. base on AOP, Ioc container, via `@tsdi/core`.

It is a **reactive UI framework**: component state is wrapped in an ES `Proxy`,
and template bindings observe property changes automatically (no manual
subscriptions, notifications or re-renders). Lists are updated by replacing the
array reference. See [Reactivity (Proxy-based)](#reactivity-proxy-based) below.


## Packages

| Package | Role | Docs |
| --- | --- | --- |
| `@tsdi/components` | Reactive core, template compiler, renderer ports | this README |
| `@tsdi/components/common` | Renderer-neutral widgets (panel, list, select, dialog, tabs, menu, layout, grid, dynamic-form, markdown, icons, ...) and shared helpers (theme, display width, pager, syntax tokens) | [common](common/README.md) |
| `@tsdi/components/html` | DOM renderer plus browser helpers (scroll follow, overlay anchors, pager, animation clock) | [html](html/README.md) |
| `@tsdi/components/console` | Terminal renderer (console tree, TUI layout, terminal surface, input/paging) | [console](console/README.md) |
| `@tsdi/components/xml` | Headless XML node-tree renderer for server/CLI and tests | [xml](xml/README.md) |
| `@tsdi/components/router` | Angular-style routes, guards, lazy loading, outlets and links | [router](router/README.md) |

Platform packages are siblings: `common` depends only on the core, `html` and
`console` never import each other, and `xml` is a third, DOM-free renderer. Hosts
pick one renderer module and reuse the same component templates and shared
widgets.

# Install

```shell

npm install @tsdi/components

```

## Reactivity (Proxy-based)

`@tsdi/components` is a reactive framework. Component instances, objects passed
in through template bindings (`:prop` / `[prop]`), DI-shared state, and any
nested plain objects/arrays they expose are lazily wrapped in an ES `Proxy`
(`src/reactive.ts`). Every property read inside a template binding is tracked by
the shared `ReactiveEffect` (`src/impl/effect.ts`), and every write re-runs
exactly the bindings that read that property.

**Template bindings are the listeners.** Every binding form below is evaluated
inside `effect.run(...)` while the view is created or refreshed (an event
handler body runs later, when the event fires). Whatever the expression reads
becomes a dependency; event handlers only need to write state. There is nothing
to subscribe to and nothing to refresh manually.

### Template binding syntax

```html
<!-- 1. Text interpolation: any expression, pipes allowed -->
<h1>{{title}}</h1>
<p>{{user.name}} · {{count + 1}} · {{today | date-format:'yyyy-MM-dd'}}</p>

<!-- 2. Interpolation inside attribute values -->
<span class="tone-{{tone}}" title="Hello {{user.name}}">…</span>

<!-- 3. Property binding: `:prop` and `[prop]` are equivalent -->
<input :disabled="busy" [value]="query" />
<div :class="{active: isActive}" :style="{color: color}"></div>

<!-- 4. Two-way binding: writes back on the `input` event -->
<input v-model="query" />

<!-- 5. Events: arguments are evaluated when the event fires -->
<button @click="save">Save</button>
<button @click="pick(item.id)">Pick</button>
<form @submit="submit($event)">…</form>

<!-- 6. Structural directives -->
<p v-if="loading">Loading…</p>
<p v-else-if="error">Failed</p>
<p v-else>Ready</p>
<div v-show="expanded">…</div>
<li v-for="item in items">{{item.text}}</li>
<li v-for="(item, index) in items">{{index}}: {{item.text}}</li>
<li v-for="let item of items">{{item.text}}</li>
<div v-switch="mode">
  <span v-case="'edit'">Editing</span>
  <span v-default>Viewing</span>
</div>

<!-- 7. Object attribute spread / event map -->
<path v-bind="edge.attrs"></path>
<button v-on="{ click: save, dblclick: reset }">…</button>

<!-- 8. Child component inputs / outputs (declared with @Attribute) -->
<status-bar :state="state" @select="onSelect"></status-bar>
```

- `{{ expr }}` delimiters are configurable through the compiler
  (`delimiters: ['{{', '}}']`).
- `:prop` / `[prop]` / `v-for` evaluate arbitrary expressions (`:value="user.name"`,
  `v-for="row in rows.filter(r => r.visible)"`); `v-model` writes `context[prop]`
  directly, so its target must be a plain field name (`v-model="query"`, not
  `v-model="user.name"`).
- `v-for` scopes expose the declared names plus `$implicit`, `$index`, `$first`,
  `$last`, `$even`, `$odd`, `$key` and `$count`. Event arguments such as
  `@click="pick(item.id)"` resolve against the current loop scope when the event
  fires.
- Child components receive values through `:attr="expr"` (plain `attr="text"`
  passes a literal string) and callbacks through `@event="handler"`; the names
  must match an `@Attribute()` declared by the child (alias allowed).
- `v-templateOutlet` + `:templateOutletContext` render a `TemplateRef` with a
  context object, and `v-bind="obj"` sets string attributes from an object.
- Structural directives compose with the other bindings on the same element:
  `<button v-for="x in xs" @click="pick(x)">`.

### Which writes re-run bindings

- object fields at any depth: `state.title = 'x'`,
  `state.settings.theme = 'dark'`, `delete state.temp` — yes
- whole replacement: `state.session = other`, `state.items = next` — yes
- array element / index writes: `arr[i] = v` — yes for bindings that read that
  index (and for `v-for` content when the item fields are written, e.g.
  `items[0].text = 'done'`)
- **array structural mutation is not detected**: `push` / `pop` / `shift` /
  `unshift` / `splice` / `sort` / `reverse` keep the same array reference, so
  `v-for` and `{{items.length}}` do **not** update. Replace the reference
  instead: `state.items = [...state.items, item]`,
  `state.items = state.items.filter(...)`.

```typescript
@Component({
  selector: 'todo-list',
  template: `
    <h2>{{state.title}} ({{state.items.length}})</h2>
    <ul><li v-for="item in state.items">{{item.text}}</li></ul>
    <button @click="update">Update</button>
  `
})
export class TodoListComponent {
  state = { title: 'Todos', items: [{ text: 'Write docs' }] };

  update() {
    this.state.title = 'Updated';            // plain field
    this.state.items[0].text = 'Done';       // field of a list item
    // list changes must replace the array reference:
    this.state.items = [...this.state.items, { text: 'Ship' }];
  }
}
```

Rules and limits:

- **Do not** add `subscribe()` / `listeners` / `notify()` / `forceUpdate()` /
  manual `render()` / `setInterval` polling to keep the view in sync. The proxy
  layer already owns dependency tracking and triggering.
- Writes with the same value (`===`) are short-circuited and do not re-render.
  Mutate the proxied object directly; do not clone state just to force an
  update.
- `Date`, `Map`, `Set`, `WeakMap`, `WeakSet` and `Promise` are **not** proxied
  (`isNative`). In-place changes such as `map.set(...)` or
  `date.setTime(...)` are invisible; assign a new instance instead
  (`state.byId = new Map(state.byId)`).
- Derived values: use `@Computed(['a', 'b'])`; the cache is invalidated when a
  dependency changes.
- Bulk writes: wrap them in `batchReactiveUpdates(() => { ... })` so bindings
  re-run once (used for whole-screen swaps such as tab switches).
- `@NoReactive()` marks a property/accessor/method (or a whole class) as
  "do not track". Only use it for internals that must not drive the view.
- Proxies are cached **per raw object + effect**, so one state object can be
  shared by more than one application/root; writes notify every active effect.
  `getReactiveProxy(raw, effect)` returns the proxy for a specific effect.
- Computed properties collect their dependencies dynamically, including nested
  fields and array indices; the cache stores a dependency value snapshot and is
  invalidated when any of them changes.
- Bindings created for an embedded view are owned by a view scope. Destroying
  the view removes exactly those dependency functions; a branch that stops
  reading a key also drops it on the next run.
- Helpers `reactive()`, `isReactive()` and `canReactive()` are exported from
  `@tsdi/components` for debugging why a binding did or did not update.

Animations and elapsed time are not data state: subscribe to the shared
`AnimationClock` instead of starting a private timer.

## View queries, refs and containers

### `@ViewChild` / `@ViewChildren`

```typescript
export class PanelComponent {
  @ViewChild('editor') editor?: EditorComponent;
  @ViewChild('editor', ElementRef) editorElement?: ElementRef;
  @ViewChild(EditorComponent) firstEditor?: EditorComponent;
  @ViewChild({ selector: 'editor', static: true }) staticEditor?: EditorComponent;
  @ViewChild({ selector: 'required', required: true }) requiredChild?: ChildComponent;
  @ViewChildren('row') rows?: QueryList<RowComponent>;
}
```

- Selectors: `#name` / `name` local ref, component/directive type, tag and
  CSS/attribute selectors. Local refs are indexed per view; duplicate refs keep
  document order (`ViewChild` takes the first, `ViewChildren` sees all).
- `read` accepts `ElementRef`, `TemplateRef`, `ComponentRef`, `DirectiveRef`,
  `ViewContainerRef`, or a provider token; without `read`, component/directive
  types resolve to the **instance**, and plain elements fall back to
  `ElementRef`.
- `required: true` throws a descriptive error when the query is empty.
- `static: true` resolves on the initial pass and keeps that value; later
  structural changes do not refresh it (if the initial pass found nothing it may
  fill once on the next change). The default is dynamic.
- Queries update after `v-if` / `v-for` structural changes in a microtask.
  Tests should await a microtask before asserting on a changed query.
- `QueryList` contents (`length`, `first`, `last`, `toArray()`, iteration) update
  immediately; `changes` is coalesced to one notification per microtask.
- Child/embedded view refs inside a child component are not visible to the
  parent's `ViewChild`; each component has its own query scope.

### `@ContentChild` / `@ContentChildren`

```typescript
@ContentChild('pc') item?: ProjectedItem;
@ContentChildren(ProjectedItem) items?: QueryList<ProjectedItem>;
```

- Queries run against the nodes exposed through `PROJECTION_NODES`; they never
  enter the child component's own template scope.
- Projected structure changes (`v-if` / `v-for` in projected content) refresh
  content queries in a microtask.
- `required: true` throws when no projected match exists.

### Projection: `<v-content>`

```html
<div class="panel-header"><v-content slot="header"></v-content></div>
<div class="panel-body">
  <v-content select=".body-item"></v-content>
  <v-content></v-content> <!-- default: leftover content -->
</div>
```

- Outlets are registered first and flushed after the host view is created, so
  outlet order does not matter.
- Matching order: `slot`, then `select` (CSS/attribute), then the default outlet
  receives leftovers. If no default outlet exists, the first outlet receives
  leftovers so content is not silently dropped.
- HTML uses native `matches`; the console renderer supports tag/class/attribute
  and comma lists (descendant combinators are not supported there).
- Projected nodes stay in `PROJECTION_NODES`, so `ContentChild` queries keep
  working after the content has been moved into an outlet.
- Root-level structural directives in multi-root component templates are
  supported by replacing the root node with its container anchor.

### `ViewContainerRef` / `ContainerRef`

```typescript
@ViewChild('anchor', ViewContainerRef) vcr?: ViewContainerRef;
```

- `indexOf` is O(1); `insert`, `remove`, `move`, `detach`, `reattach`,
  `getHostElement` keep the internal view index and DOM order aligned.
- `createComponent` clamps stale insertion indexes, destroys the ref when the
  container disappears, and cleans up after render failures.
- `ContainerRef` is an exported alias for `ViewContainerRef`.
- Declarative child `render()` promises are tracked by the parent; a child
  render failure rejects the parent render and therefore `Application.run`.

### `v-for` updates

- Default `trackBy` is the item index: appends/removals and contiguous
  insert/remove at the middle update only the affected range; equal-length
  reorder/scattered edits update row fields in place.
- `trackBy="id"` (custom identity) reuses views by key and reorders the
  container to match the new list.
- Root-level `v-if` / `v-for` and multi-root templates are supported.

### Performance harness

```bash
cd packages/components
npm run bench         # local measurements
npm run bench:check   # budgets (proxy/get, computed, v-for, ViewChild)
```

The query index is only created for components that actually declare view or
content queries. `ViewChild` uses first-match lookups, so large `v-for` lists do
not collect every row on each query.

## components
*  `@Component`  Component decorator, define a class as a component with a template.
*  `@Directive`  Directive decorator, define attribute / structural / custom-element directives (see below).
*  `@Attribute`  Attribute decorator, define a property or param as a component/directive binding field (input).
*  `@Computed`  Computed decorator, define a derived property with dependencies and cache.
*  `@NoReactive`  NoReactive decorator, mark a member or class as not tracked by the reactive proxy.
*  `@ViewChild`  ViewChild decorator, select a child component/element/template/container and inject it to the property in component.
*  `@ViewChildren`  Query all matching view descendants as a `QueryList`.
*  `@ContentChild` / `@ContentChildren`  Query projected content (`PROJECTION_NODES`), optionally required.

## @Directive decorator

The `@Directive` decorator supports three types of selectors:

### Attribute Selector
```typescript
@Directive({ selector: '[myAttr]' })
class MyAttrDirective {}
// or without brackets (auto-wrapped):
@Directive({ selector: 'myAttr' })
class MyAttrDirective {}
```

### Structural Directive
```typescript
@Directive({ selector: '*if', dirType: DirectiveType.Conditional })
class IfDirective {}
```

### SVG Templates

Templates keep the SVG namespace when cloning nodes and when creating
`v-for` / `v-if` anchors. SVG elements can use the same directives and bindings
as HTML:

```html
<svg width="200" height="120">
    <path v-for="edge in edges" v-bind="edge.attrs"></path>
    <g v-if="draft">
        <path v-bind="draft.attrs"></path>
    </g>
</svg>
```

Structural directives use an SVG `<g data-v-container>` anchor (instead of the
HTML `<v-container>` anchor), so generated SVG nodes remain renderable.

### Custom Element Selector
```typescript
@Directive({ selector: 'my-button' })
class MyButtonDirective {}
// or with hyphen (recommended for custom elements)
```

### Selector Classification Rules
- Starts with `*` → structural directive (auto-wrapped: `[*if]`)
- Contains `[]` → attribute directive (stays as-is)
- Contains `-` (hyphen) → custom element (stays as-is)
- Plain text → attribute directive (auto-wrapped: `[plainText]`)
- Common HTML elements (`button`, `input`, etc.) → custom element

The `@Directive` decorator automatically exports to:
- `DIRECTIVES` token: attribute and structural directives
- `CUSTOM_ELEMENTS` token: custom element directives

Custom elements are compiled into templates via `CompilerOptions.customElements`.

## Build pipeline

`@tsdi/compiler` drives the package build. The pipeline includes an
`aop-compile` pass that scans `@Aspect` classes for pointcuts/advices and writes
an AOP manifest, and it supports ES module output so browser hosts can
tree-shake unused exports and drop Node-only renderer leaves.

The browser designer build additionally minifies, code-splits lazy editors and
enforces an initial-payload budget. See `packages/workflow-admin/README.md`
for the production build and verification commands.

## Layout components

### `workspace-layout`

Left / center / right / bottom layout with draggable splitters and ratio-based
sizes. Every pane has its own scroll container.

```html
<workspace-layout [leftRatio]="0.2" [rightRatio]="0.24" [bottomRatio]="0.26">
  <workspace-left>Menu</workspace-left>
  <workspace-center>Canvas</workspace-center>
  <workspace-right>Inspector</workspace-right>
  <workspace-bottom>Status / output</workspace-bottom>
</workspace-layout>
```

- ratios keep the layout responsive on window resize
- drag splitters to adjust proportions
- collapse/expand left, right and bottom panes from the splitter buttons
- `togglePane('left'|'right'|'bottom')`, `collapsePane`, `expandPane`,
  `setCollapsed` and `isCollapsed` are available to hosts/tests
- `leftCollapsed` / `rightCollapsed` / `bottomCollapsed` attributes provide
  initial state
- `resizePane('left'|'right'|'bottom', ratio)` is available to hosts/tests
- install styles with `installWorkspaceLayoutStyles(document)`
- the layout is themeable through inherited custom properties:
  `--workspace-splitter`, `--workspace-splitter-hover`, `--workspace-pane-bg`,
  `--workspace-collapse-bg`, `--workspace-collapse-color`,
  `--workspace-collapse-border`, `--workspace-collapse-hover-color`,
  `--workspace-collapse-shadow`, `--workspace-scrollbar-size`,
  `--workspace-scrollbar-track`, `--workspace-scrollbar-thumb` and
  `--workspace-scrollbar-thumb-hover`. Hosts set them on an ancestor theme
  scope; the layout no longer overrides inherited values.

### `menu-bar`

Renderer-neutral application menu. Items can declare `checked`, `disabled`,
`shortcut`, `danger` and one level of `children`; children render as a flyout
submenu and receive their own ids through `selectAction`. Parent items with
`children` are not actionable.

### `grid-layout`

Generic CSS grid container with `v-for`-friendly projection:

```html
<grid-layout columns="3" gap="16" autoFit minItemWidth="220">
  <grid-item span="2">Wide card</grid-item>
  <grid-item>Card</grid-item>
</grid-layout>
```

- `columns` accepts a count or any `grid-template-columns` value
- `rows`, `gap`, `rowGap`, `columnGap`, `areas`, `flow`, `fill`
- `grid-item` supports `span`, `rowSpan`, `start`, `end`, `area`
- install styles with `installGridLayoutStyles(document)`

### `dynamic-form`

JSON-configurable form with the shared `@tsdi/components/forms` validation
engine. The schema is plain data, so it can come from a literal, a file or an
HTTP response.

```typescript
const schema = {
  fields: [
    { key: 'name', type: 'text', label: 'Name', required: true },
    { key: 'mode', type: 'radio', label: 'Mode', defaultValue: 'basic',
      options: [{ label: 'Basic', value: 'basic' }, { label: 'Advanced', value: 'advanced' }] },
    { key: 'target', type: 'text', label: 'Target',
      visibleWhen: { key: 'mode', equals: 'advanced' } },
    { key: 'retries', type: 'number', label: 'Retries', defaultValue: 1, min: 0, max: 5 },
    { key: 'enabled', type: 'checkbox', label: 'Enabled', defaultValue: false }
  ],
  messages: { required: 'Required' },
  submitLabel: 'Apply'
};
```

```html
<dynamic-form :schema="schema" :value="value"
  :changeAction="onFieldChange" :submitAction="onSubmit">
</dynamic-form>
```

- field types: text/password/email/url/tel/search/date/time/month/week/color,
  number/range, textarea, json, code, checkbox/switch, select/radio, hidden
- validation rules: `required`, `requiredTrue`, `email`, `url`, `min`, `max`,
  `minLength`, `maxLength`, `pattern`, `json`, `number`, `integer` (rules can be
  declared as `rules: ['required', { type: 'pattern', value: '^[A-Z]+$' }]` or
  via field conveniences such as `required`, `min`, `max`, `pattern`)
- `visibleWhen` supports `equals`, `notEquals`, `in`, `truthy` and `falsy`
- `group` renders section headers; `defaultValue` enables per-field reset
- `field.errorMessages` and the top-level `messages` localize validation text
- `submit()`, `validate()`, `getValue()`, `setValue()`, `patchValue()`, `reset()`
  and `resetField()` are available to hosts
- JSON and code fields keep the value as text for editing; `getValue()` parses
  JSON on submit and code fields expose `data-dynamic-code` / `data-code-suggestions`
  so an HTML host can attach a code editor and workflow-aware completions (see
  `@tsdi/activities/web` CodeMirror integration)
- install base styles with `installDynamicFormStyles(document)`; hosts can set
  `classPrefix` to reuse their own skin (the workflow inspector uses `workflow`)

### Themes

`ThemeService` is renderer-neutral and available from `BaseComponentsModule`:

```typescript
import { ThemeService, applyThemeToDocument } from '@tsdi/components/common';

const themes = new ThemeService();
themes.setTheme('dark');
themes.applyTo(document);

// or directly:
applyThemeToDocument(document, 'high-contrast');
```

Built-in themes: `light`, `dark`, `solarized`, `high-contrast`.
The service mirrors the theme to `data-theme`, `data-agent-theme` and
`data-workspace-theme` on the document root; renderers own the CSS variables.

## Exports

```typescript
// Decorators
export { Component, Directive, Attribute, Computed, NoReactive, ViewChild }

// Reactivity
export { reactive, isReactive, canReactive, getReactiveProxy, batchReactiveUpdates, AnimationClock }

// Tokens
export { DIRECTIVES, CUSTOM_ELEMENTS, COMPONENTS }

// Types
export { ComponentDef, DirectiveDef, DirectiveType }
```

see [ activity build boot simple](https://github.com/zhouhoujun/tsioc/blob/master/packages/activities/taskfile.ts)


## Documentation
Documentation is available on the
* [@tsdi/ioc document](https://github.com/zhouhoujun/tsioc/tree/master/packages/ioc).
* [@tsdi/aop document](https://github.com/zhouhoujun/tsioc/tree/master/packages/aop).
* [@tsdi/logger document](https://github.com/zhouhoujun/tsioc/tree/master/packages/logger).
* [@tsdi/common document](https://github.com/zhouhoujun/tsioc/tree/master/packages/common).
* [@tsdi/core document](https://github.com/zhouhoujun/tsioc/tree/master/packages/core).
* [@tsdi/endpoints document](https://github.com/zhouhoujun/tsioc/tree/master/packages/transport).
* [@tsdi/amqp document](https://github.com/zhouhoujun/tsioc/tree/master/packages/amqp).
* [@tsdi/coap document](https://github.com/zhouhoujun/tsioc/tree/master/packages/coap).
* [@tsdi/http document](https://github.com/zhouhoujun/tsioc/tree/master/packages/http).
* [@tsdi/kafka document](https://github.com/zhouhoujun/tsioc/tree/master/packages/kafka).
* [@tsdi/mqtt document](https://github.com/zhouhoujun/tsioc/tree/master/packages/mqtt).
* [@tsdi/nats document](https://github.com/zhouhoujun/tsioc/tree/master/packages/nats).
* [@tsdi/redis document](https://github.com/zhouhoujun/tsioc/tree/master/packages/redis).
* [@tsdi/tcp document](https://github.com/zhouhoujun/tsioc/tree/master/packages/tcp).
* [@tsdi/udp document](https://github.com/zhouhoujun/tsioc/tree/master/packages/udp).
* [@tsdi/ws document](https://github.com/zhouhoujun/tsioc/tree/master/packages/ws).
* [@tsdi/swagger document](https://github.com/zhouhoujun/tsioc/tree/master/packages/swagger).
* [@tsdi/repository document](https://github.com/zhouhoujun/tsioc/tree/master/packages/repository).
* [@tsdi/typeorm-adapter document](https://github.com/zhouhoujun/tsioc/tree/master/packages/typeorm-adapter).
* [@tsdi/boot document](https://github.com/zhouhoujun/tsioc/tree/master/packages/boot).
* [@tsdi/components document](https://github.com/zhouhoujun/tsioc/tree/master/packages/components).
* [@tsdi/compiler document](https://github.com/zhouhoujun/tsioc/tree/master/packages/compiler).
* [@tsdi/activities document](https://github.com/zhouhoujun/tsioc/tree/master/packages/activities).
* [@tsdi/pack document](https://github.com/zhouhoujun/tsioc/tree/master/packages/pack).
* [@tsdi/unit document](https://github.com/zhouhoujun/tsioc/tree/master/packages/unit).
* [@tsdi/unit-console document](https://github.com/zhouhoujun/tsioc/tree/master/packages/unit-console).
* [@tsdi/cli document](https://github.com/zhouhoujun/tsioc/tree/master/packages/cli).



### packages
[@tsdi/cli](https://www.npmjs.com/package/@tsdi/cli)
[@tsdi/ioc](https://www.npmjs.com/package/@tsdi/ioc)
[@tsdi/aop](https://www.npmjs.com/package/@tsdi/aop)
[@tsdi/logger](https://www.npmjs.com/package/@tsdi/logger)
[@tsdi/common](https://www.npmjs.com/package/@tsdi/common)
[@tsdi/core](https://www.npmjs.com/package/@tsdi/core)
[@tsdi/endpoints](https://www.npmjs.com/package/@tsdi/endpoints)
[@tsdi/amqp](https://www.npmjs.com/package/@tsdi/amqp)
[@tsdi/coap](https://www.npmjs.com/package/@tsdi/coap)
[@tsdi/http](https://www.npmjs.com/package/@tsdi/http)
[@tsdi/kafka](https://www.npmjs.com/package/@tsdi/kafka)
[@tsdi/mqtt](https://www.npmjs.com/package/@tsdi/mqtt)
[@tsdi/nats](https://www.npmjs.com/package/@tsdi/nats)
[@tsdi/redis](https://www.npmjs.com/package/@tsdi/redis)
[@tsdi/tcp](https://www.npmjs.com/package/@tsdi/tcp)
[@tsdi/udp](https://www.npmjs.com/package/@tsdi/udp)
[@tsdi/ws](https://www.npmjs.com/package/@tsdi/ws)
[@tsdi/swagger](https://www.npmjs.com/package/@tsdi/swagger)
[@tsdi/repository](https://www.npmjs.com/package/@tsdi/repository)
[@tsdi/typeorm-adapter](https://www.npmjs.com/package/@tsdi/typeorm-adapter)
[@tsdi/boot](https://www.npmjs.com/package/@tsdi/boot)
[@tsdi/components](https://www.npmjs.com/package/@tsdi/components)
[@tsdi/compiler](https://www.npmjs.com/package/@tsdi/compiler)
[@tsdi/activities](https://www.npmjs.com/package/@tsdi/activities)
[@tsdi/pack](https://www.npmjs.com/package/@tsdi/pack)
[@tsdi/unit](https://www.npmjs.com/package/@tsdi/unit)
[@tsdi/unit-console](https://www.npmjs.com/package/@tsdi/unit-console)


## License

Apache License 2.0 © [Houjun](https://github.com/zhouhoujun/)