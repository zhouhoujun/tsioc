# packaged @tsdi/components

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/tsioc).

`@tsdi/components`： components framewroks. base on AOP, Ioc container, via `@tsdi/core`.


# Install

```shell

npm install @tsdi/components

```

## components
*  `@Component`  Component decorator,  use to defaine class as component with template.
*  `@Input` Input decorator, use to define property or param as component binding field or args.
*  `@Output` Output decorator, use to define property or param as component output field or args.
*  `@RefChild` RefChild decorator, use to select child element and inject to the property in component.
*  `@Pipe` Pipe decorator, use to define class type as pipe transform.

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
export { Component, Input, Output, RefChild, Pipe, Directive }

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