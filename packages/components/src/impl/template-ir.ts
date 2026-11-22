import { RElement, RNode, NodeType } from '../renderer/Node';
import { Renderer } from '../renderer/Renderer';

export type TemplateIRNode =
    | { kind: 'text'; value: string }
    | { kind: 'comment'; value: string }
    | {
        kind: 'element';
        tag: string;
        namespace?: string;
        attrs: Array<[string, string, string?]>;
        children: TemplateIRNode[];
    };

export function nodesToIR(nodes: RNode[], renderer: Renderer): TemplateIRNode[] | null {
    const result: TemplateIRNode[] = [];
    for (const node of nodes) {
        if (node.nodeType === NodeType.Text) {
            result.push({ kind: 'text', value: (node as any).textContent ?? '' });
            continue;
        }
        if (node.nodeType === NodeType.Comment) {
            result.push({ kind: 'comment', value: (node as any).textContent ?? '' });
            continue;
        }
        if (node.nodeType !== NodeType.Element) {
            return null;
        }
        const element = node as RElement;
        const attrs = (renderer.getAttributes(element) || []).map(attr =>
            [attr.name, attr.value, attr.namespace] as [string, string, string?]
        );
        // Renderers may expose framework attributes (`v-for`, `:prop`,
        // `@event`, `*if`) as element properties. `getAttributes` normally
        // reports them already; keep this guard for renderers that do not.
        for (const key of Object.keys(element as any)) {
            if (key.startsWith('@') || key.startsWith(':') || key.startsWith('v-') || key.startsWith('*')) {
                if (!attrs.some(attr => attr[0] === key)) {
                    attrs.push([key, String((element as any)[key])]);
                }
            }
        }
        const children = nodesToIR(
            (element as any).content ? (element as any).content.childNodes : (element.childNodes || []),
            renderer
        );
        if (!children) {
            return null;
        }
        const namespace = (element as any).namespaceURI;
        result.push({
            kind: 'element',
            tag: String((element as any).localName || element.tagName || ''),
            namespace: namespace && namespace !== 'http://www.w3.org/1999/xhtml' ? namespace : undefined,
            attrs,
            children
        });
    }
    return result;
}

export function irToNodes(ir: TemplateIRNode[], renderer: Renderer): RNode[] {
    return ir.map(item => {
        if (item.kind === 'text') {
            return renderer.createText(item.value);
        }
        if (item.kind === 'comment') {
            return renderer.createComment(item.value);
        }
        const element = renderer.createElement(item.tag, item.namespace);
        for (const [name, value, namespace] of item.attrs) {
            // Parser nodes carry framework attributes (`v-for`, `:prop`, ...)
            // as real DOM attributes. Recreate them the same way so
            // `renderer.getAttributes()` sees them during binding generation.
            const target = element as any;
            try {
                if (namespace) {
                    target.setAttributeNS(namespace, name, value);
                } else {
                    target.setAttribute(name, value);
                }
            } catch {
                renderer.setAttribute(element, name, value, namespace);
            }
        }
        const target: any = element;
        const content = item.tag.toLowerCase() === 'template' ? target.content : undefined;
        for (const child of irToNodes(item.children, renderer)) {
            if (content) {
                content.appendChild(child as any);
            } else {
                element.appendChild(child);
            }
        }
        return element;
    });
}

function sameIR(left: TemplateIRNode[], right: TemplateIRNode[]): boolean {
    if (left.length !== right.length) {
        return false;
    }
    for (let i = 0; i < left.length; i++) {
        const a = left[i];
        const b = right[i];
        if (a.kind !== b.kind) {
            return false;
        }
        if (a.kind === 'text' || a.kind === 'comment') {
            if (a.value !== (b as any).value) {
                return false;
            }
            continue;
        }
        const other = b as any;
        if (String(a.tag).toLowerCase() !== String(other.tag).toLowerCase()
            || a.namespace !== other.namespace
            || a.attrs.length !== other.attrs.length) {
            return false;
        }
        for (let j = 0; j < a.attrs.length; j++) {
            if (a.attrs[j][0] !== other.attrs[j][0] || a.attrs[j][1] !== other.attrs[j][1]) {
                return false;
            }
        }
        if (!sameIR(a.children, other.children)) {
            return false;
        }
    }
    return true;
}

export function sameTemplateIR(left: TemplateIRNode[], right: TemplateIRNode[]): boolean {
    return sameIR(left, right);
}

/**
 * Build IR only when reconstruction is provably tree-equivalent, so renderer
 * specific parser semantics are never replaced by a lossy copy.
 */
export function buildVerifiedTemplateIR(nodes: RNode[], renderer: Renderer): TemplateIRNode[] | null {
    const ir = nodesToIR(nodes, renderer);
    if (!ir) {
        return null;
    }
    try {
        const rebuilt = irToNodes(ir, renderer);
        const rebuiltIR = nodesToIR(rebuilt, renderer);
        return rebuiltIR && sameIR(ir, rebuiltIR) ? ir : null;
    } catch {
        return null;
    }
}

const templateIRCache = new WeakMap<object, Map<string, TemplateIRNode[] | null>>();

export function getCachedTemplateIR(parser: object, template: string): TemplateIRNode[] | null | undefined {
    const cache = templateIRCache.get(parser);
    return cache?.has(template) ? cache.get(template) : undefined;
}

export function setCachedTemplateIR(parser: object, template: string, ir: TemplateIRNode[] | null): void {
    if (!parser) {
        return;
    }
    let cache = templateIRCache.get(parser);
    if (!cache) {
        cache = new Map();
        templateIRCache.set(parser, cache);
    }
    cache.set(template, ir);
}
