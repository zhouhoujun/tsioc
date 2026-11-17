# @tsdi/components/xml

Headless XML renderer for `@tsdi/components`.

This package compiles the same component templates into a plain node tree with
no browser and no terminal. It is the default renderer for server-side/CLI
usage (`bootstrapComponent(..., { renderer: 'xml' })`), for templates that are
inspected or transformed programmatically, and for unit tests that only need
the compiled structure.

## Architecture

```
@Component template string
        │
        ▼
XmlTemplateParser (fast-xml-parser + block transform)
        │   maps `@_attr`, `:@`, `#text`, `#comment`, `v-*` into nodes
        ▼
XmlNode tree: XmlElement / XmlText / XmlComment
        │
        ▼
XmlTemplateCompiler ──► binding factories → reactive effect.run(...)
        │
        ▼
XmlRenderer ──► attribute / text / style mutations on the node tree
```

| Piece | Responsibility |
| --- | --- |
| `XmlNode` | Minimal `RNode`: `parentNode`/`childNodes`/`nextSibling`, `attributes: Map`, event emitter (`events`), attribute get/set helpers, namespaced variants. |
| `XmlElement` | `RElement` with `tagName`, `style` (`XmlCssStyleDeclaration`), `classList` (`XmlDomTokenList`), recursive `textContent`, and `setProperty` (routes to inline style). |
| `XmlText` / `XmlComment` | `RText` / `RComment` nodes. |
| `XmlRenderer` | `Renderer` implementation: node creation/insertion/removal, attributes, properties, classes/styles, `querySelector`/`querySelectorAll` (via `css-select`) and `queryByAttribute`. |
| `XmlTemplateParser` | Parses the template with `fast-xml-parser` after `transformBlocks` (so fragment/`v-*` templates keep their structure) and converts the JSON shape to nodes. |
| `XmlTemplateCompiler` | Compiles the tree with `XML_COMPILER_OPTIONS` (default delimiters `{{ }}`). |
| `XmlTemplateModule` | DI module wiring (`Renderer`, `TemplateParser`, `TemplateCompiler` defaults) with `withOptions(options)`. |

Because the renderer is DOM-free, it works in Node, workers and non-DOM test
environments. It carries no platform skin: styling is stored on the node
(`style`, `classList`, attributes) for hosts to read or post-process.

## Usage

### Bootstrapping an application

```ts
import { Application } from '@tsdi/core';
import { ComponentsModule } from '@tsdi/components';
import { XmlTemplateModule, XmlRenderer, XmlNode } from '@tsdi/components/xml';

const ctx = await Application.run(AppComponent, {
  deps: [XmlTemplateModule, ComponentsModule]
});

const renderer = ctx.get(XmlRenderer);
const root = ctx.runners.getRef(AppComponent).hostView.rootNodes[0] as XmlNode;

renderer.querySelector(root, 'button.primary')?.getAttribute('class');
```

### Via the generic bootstrap helper

```ts
import { bootstrapComponent } from '@tsdi/components';

const ctx = await bootstrapComponent(AppComponent, { renderer: 'xml' });
```

`bootstrapComponent` imports `XmlTemplateModule` lazily based on
`options.renderer` (`xml` is the default) and adds `ComponentsModule`, so the
caller does not need to list them.

### Custom compiler options

```ts
@Module({
  imports: [XmlTemplateModule.withOptions({ delimiters: ['${', '}'] })]
})
export class AppModule {}
```

## Node model notes

- Attributes are stored in a `Map<string, RAttr>`; namespaced attributes use the
  key `` `${localName}:${namespace}` `` and are read with
  `getAttributeNS`/`setAttributeNS`.
- `textContent` on an element concatenates descendant text nodes; setting it
  replaces children with a single text node.
- CSS selectors (`css-select` adapter) support tag/class/attribute queries. Custom
  renderer-specific selectors fall back to `queryByAttribute(node, name, value?)`.
- `XmlElement.setProperty(name, value)` writes inline style (there are no DOM
  properties such as `value`/`disabled`); use `setAttribute` for attributes.
- Structural directives still use the shared `<v-container>` anchor; it is a
  normal element in the tree and can be filtered by tag name.
- There is no built-in serializer: walk `childNodes` and read `tagName` /
  `attributes` / `textContent` for your own output format.

## Testing

```bash
cd packages/components/xml
npm run test
```

The XML package is also the renderer used by several core component specs
(`packages/components/test/*.spec.ts`) because it needs no DOM. When you change
template parsing or binding behavior, run the components core suite as well.
