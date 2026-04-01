import { Inject, Injectable, isArray, Module, ModuleWithProviders, token, Optional } from '@tsdi/ioc';
import { DOCUMENT, PLATFORM_ID  } from '@tsdi/common';
import {
    TemplateParser, Renderer, RendererStyleFlags2, AbstractTemplateCompiler,
    RComment, RElement, RNode, RText, RAttr,
    TemplateCompiler, TemplateCompilerOptions, noReact
} from '@tsdi/components';

@Injectable()
export class HtmlRenderer implements Renderer {

    private document: Document;

    [noReact] = true;

    destroyNode?: ((node: RNode) => void) | null;

    constructor(
        @Optional() @Inject(DOCUMENT) doc: Object | null,
        @Optional() @Inject(PLATFORM_ID) private platformId: Object | null
    ) {
        if (doc) {
            this.document = doc as Document;
        } else {
            const { JSDOM } = require('jsdom');
            const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
                runScripts: 'dangerously',
                resources: 'usable'
            });
            this.document = dom.window.document;
        }
    }

    createComment(value: string): RComment {
        return this.document.createComment(value) as unknown as RComment;
    }

    createElement(name: string, namespace?: string | null): RElement {
        if (namespace) {
            return this.document.createElementNS(namespace, name) as unknown as RElement;
        }
        return this.document.createElement(name) as unknown as RElement;
    }

    createText(value: string): RText {
        return this.document.createTextNode(value) as unknown as RText;
    }

    appendChild(parent: RNode, newChild: RNode): void {
        (parent as unknown as Element).appendChild(newChild as unknown as Node);
    }

    insertBefore(parent: RNode, newChild: RNode, refChild: RNode | null): void {
        (parent as unknown as Node).insertBefore(newChild as unknown as Node, refChild as unknown as Node);
    }

    removeChild(parent: RNode | null, oldChild: RNode, isHostElement?: boolean): void {
        (parent as unknown as Element | null)?.removeChild(oldChild as unknown as Node);
    }

    querySelector(node: RNode | RNode[], selector: string): RNode | null {
        const nodes = isArray(node) ? node : [node];
        for (const n of nodes) {
            const el = n as unknown as Element;
            if (el.querySelector) {
                try {
                    const found = el.querySelector(selector);
                    if (found) return found as unknown as RNode;
                } catch {
                    // Fallback to attribute query for non-standard selectors
                    if (selector.startsWith('[') && selector.endsWith(']')) {
                        const attr = selector.slice(1, -1);
                        const results = this.queryByAttribute(n, attr);
                        return results?.[0] ?? null;
                    }
                }
            }
        }
        return null;
    }

    querySelectorAll(node: RNode | RNode[], selector: string): RNode[] | null {
        const nodes = isArray(node) ? node : [node];
        const results: RNode[] = [];

        for (const n of nodes) {
            const el = n as unknown as Element;
            if (el.querySelectorAll) {
                try {
                    const found = el.querySelectorAll(selector);
                    results.push(...Array.from(found).map(e => e as unknown as RNode));
                } catch {
                    // Fallback to attribute query for non-standard selectors
                    if (selector.startsWith('[') && selector.endsWith(']')) {
                        const attrResults = this.queryByAttribute(n, selector.slice(1, -1));
                        if (attrResults) results.push(...attrResults);
                    } else if (selector.includes(',')) {
                        // Handle multiple selectors like "[v-for],[*for]"
                        const selectors = selector.split(',').map(s => s.trim());
                        for (const s of selectors) {
                            if (s.startsWith('[') && s.endsWith(']')) {
                                const attrResults = this.queryByAttribute(n, s.slice(1, -1));
                                if (attrResults) results.push(...attrResults);
                            }
                        }
                    }
                }
            }
        }
        return results.length ? results : null;
    }

    queryByAttribute(node: RNode | RNode[], attrName: string, attrValue?: string): RNode[] | null {
        const nodes = isArray(node) ? node : [node];
        const results: RNode[] = [];

        const walk = (n: RNode) => {
            const el = n as unknown as Element;
            if (el.hasAttribute) {
                if (attrValue !== undefined) {
                    if (el.getAttribute(attrName) === attrValue) {
                        results.push(n);
                    }
                } else if (el.hasAttribute(attrName)) {
                    results.push(n);
                }
                if (el.children) {
                    const children = Array.from(el.children);
                    for (const child of children) {
                        walk(child as unknown as RNode);
                    }
                }
            }
        };

        for (const n of nodes) {
            walk(n);
        }
        return results.length ? results : null;
    }

    queryByTagName(node: RNode | RNode[], tagName: string): RNode[] | null {
        const nodes = isArray(node) ? node : [node];
        const results: RNode[] = [];
        const lowerTagName = tagName.toLowerCase();

        const walk = (n: RNode) => {
            const el = n as unknown as Element;
            if (el.tagName) {
                if (el.tagName.toLowerCase() === lowerTagName) {
                    results.push(n);
                }
                if (el.children) {
                    const children = Array.from(el.children);
                    for (const child of children) {
                        walk(child as unknown as RNode);
                    }
                }
            }
        };

        for (const n of nodes) {
            walk(n);
        }
        return results.length ? results : null;
    }

    queryByComponent(node: RNode | RNode[], componentSelector: string): RNode[] | null {
        return this.querySelectorAll(node, componentSelector);
    }

    getAncestors(node: RNode): RNode[] {
        const ancestors: RNode[] = [];
        let parent = (node as unknown as Node).parentNode as unknown as RNode | null;

        while (parent && parent !== (this.document as unknown as RNode)) {
            ancestors.push(parent);
            parent = (parent as unknown as Node).parentNode as unknown as RNode | null;
        }

        return ancestors;
    }

    getDescendants(node: RNode): RNode[] {
        const descendants: RNode[] = [];

        const walk = (n: RNode) => {
            const el = n as unknown as Element;
            if (el.childNodes) {
                const children = Array.from(el.childNodes);
                for (const child of children) {
                    descendants.push(child as unknown as RNode);
                    walk(child as unknown as RNode);
                }
            }
        };

        walk(node);
        return descendants;
    }

    matchesSelector(node: RNode, selector: string): boolean {
        const el = node as unknown as Element;
        if (el.matches) {
            return el.matches(selector);
        }
        return false;
    }

    parentNode(node: RNode): RNode | null {
        return (node as unknown as Node).parentNode as unknown as RNode | null;
    }

    nextSibling(node: RNode): RNode | null {
        return (node as unknown as Node).nextSibling as unknown as RNode | null;
    }

    setAttribute(el: RNode, name: string, value: string, namespace?: string | null): void {
        const element = el as unknown as Element;
        if (name.startsWith('@') || name.startsWith(':') || name.startsWith('v-') || name.startsWith('*')) {
            (element as any)[name] = value;
            return;
        }
        if (namespace) {
            element.setAttributeNS(namespace, name, value);
        } else {
            try {
                element.setAttribute(name, value);
            } catch {
                (element as any)[name] = value;
            }
        }
    }

    getAttributes(el: RNode): RAttr[] {
        const element = el as unknown as Element;
        if (!element.attributes) return [];
        return Array.from(element.attributes).map(attr => ({
            name: attr.name,
            value: attr.value,
            namespace: attr.namespaceURI ?? undefined
        }));
    }

    removeAttribute(el: RNode, name: string, namespace?: string | null): void {
        const element = el as unknown as Element;
        if (namespace) {
            element.removeAttributeNS(namespace, name);
        } else {
            element.removeAttribute(name);
        }
    }

    addClass(el: RNode, name: string): void {
        (el as unknown as Element).classList.add(name);
    }

    removeClass(el: RNode, name: string): void {
        (el as unknown as Element).classList.remove(name);
    }

    setStyle(el: RNode, style: string, value: any, flags?: RendererStyleFlags2): void {
        const element = el as unknown as HTMLElement;
        element.style.setProperty(style, value);
    }

    removeStyle(el: RNode, style: string, flags?: RendererStyleFlags2): void {
        (el as unknown as HTMLElement).style.removeProperty(style);
    }

    setProperty(el: RNode, name: string, value: any): void {
        (el as unknown as any)[name] = value;
    }

    setValue(node: RNode, value: string): void {
        (node as unknown as Text | Comment).textContent = value;
    }

    click(node: RNode): void {
        (node as unknown as HTMLElement).click();
    }

}

@Injectable()
export class HtmlTemplateParser implements TemplateParser {
    [noReact] = true;

    constructor(
        private renderer: HtmlRenderer
    ) { }

    parse(template: string): RNode[] {
        const doc = (this.renderer as any).document as Document;
        const container = doc.createElement('div');
        container.innerHTML = template.trim();
        return Array.from(container.childNodes).map(n => n as unknown as RNode);
    }

}

const htmlDefaultOptions = {
    delimiters: ['{{', '}}'],
} as TemplateCompilerOptions;

export const HTML_COMPILER_OPTIONS = token<TemplateCompilerOptions>('HTML_COMPILER_OPTIONS');

@Injectable()
export class HtmlTemplateCompiler extends AbstractTemplateCompiler {

    constructor(
        readonly renderer: HtmlRenderer,
        readonly parser: HtmlTemplateParser,
        @Inject(HTML_COMPILER_OPTIONS, { defaultValue: htmlDefaultOptions }) protected options: TemplateCompilerOptions) {
        super()
    }
}

@Module({
    providers: [
        HtmlRenderer,
        HtmlTemplateParser,
        HtmlTemplateCompiler,
        { provide: Renderer, useClass: HtmlRenderer, asDefault: true },
        { provide: TemplateParser, useClass: HtmlTemplateParser, asDefault: true },
        { provide: TemplateCompiler, useClass: HtmlTemplateCompiler, asDefault: true }
    ]
})
export class HtmlTemplateModule {
    static withOptions(options: TemplateCompilerOptions): ModuleWithProviders<HtmlTemplateModule> {
        return {
            module: HtmlTemplateModule,
            providers: [
                { provide: HTML_COMPILER_OPTIONS, useValue: options }
            ]
        }
    }
}