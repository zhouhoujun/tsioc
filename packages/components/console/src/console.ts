import { Inject, Injectable, isArray, Module, ModuleWithProviders, token } from '@tsdi/ioc';
import { XMLParser } from 'fast-xml-parser';
import {
    AbstractTemplateCompiler,
    noReact,
    NodeType,
    RAttr,
    RComment,
    RCssStyleDeclaration,
    RDomTokenList,
    RElement,
    Renderer,
    RendererStyleFlags2,
    RNode,
    RText,
    TemplateCompiler,
    TemplateCompilerOptions,
    TemplateParser
} from '@tsdi/components';
export class ConsoleCssStyleDeclaration implements RCssStyleDeclaration {
    protected styles: Record<string, string> = {};

    constructor(protected onChange?: () => void) {
    }

    setChangeListener(onChange?: () => void): void {
        this.onChange = onChange;
    }

    removeProperty(propertyName: string): string {
        const value = this.styles[propertyName];
        if (Object.prototype.hasOwnProperty.call(this.styles, propertyName)) {
            delete this.styles[propertyName];
            this.onChange?.();
        }
        return value;
    }

    setProperty(propertyName: string, value: string | null): void {
        if (value == null) {
            this.removeProperty(propertyName);
            return;
        }
        if (this.styles[propertyName] === value) {
            return;
        }
        this.styles[propertyName] = value;
        this.onChange?.();
    }

    getProperties(): Record<string, string> {
        return { ...this.styles };
    }

    applyCssText(value: string): void {
        value.split(';')
            .map(item => item.trim())
            .filter(Boolean)
            .forEach(entry => {
                const index = entry.indexOf(':');
                if (index === -1) {
                    return;
                }
                const name = entry.slice(0, index).trim();
                const cssValue = entry.slice(index + 1).trim();
                if (!name) {
                    return;
                }
                this.setProperty(name, cssValue);
            });
    }
}

export class ConsoleDomTokenList implements RDomTokenList {
    protected tokens = new Set<string>();

    add(token: string): void {
        this.tokens.add(token);
    }

    remove(token: string): void {
        this.tokens.delete(token);
    }

    values(): string[] {
        return Array.from(this.tokens.values());
    }

    reset(tokens: string[]): void {
        this.tokens.clear();
        tokens.forEach(token => this.tokens.add(token));
    }
}

export class ConsoleNode implements RNode {
    static readonly CHANGE_EVENT = 'console:change';

    protected readonly eventListeners = new Map<string, EventListener[]>();
    readonly attributes = new Map<string, RAttr>();

    constructor(
        public nodeType: number,
        public parentNode: ConsoleNode | null = null,
        public childNodes: ConsoleNode[] = [],
        public nextSibling: ConsoleNode | null = null
    ) {
    }

    get parentElement(): ConsoleElement | null {
        return this.parentNode instanceof ConsoleElement ? this.parentNode : null;
    }

    protected detachFromParent(node: ConsoleNode): void {
        if (node.parentNode && node.parentNode !== this) {
            node.parentNode.removeChild(node);
        }
    }

    removeChild(child: ConsoleNode): ConsoleNode {
        const index = this.childNodes.indexOf(child);
        if (index >= 0) {
            this.childNodes.splice(index, 1);
            child.parentNode = null;
            child.nextSibling = null;
            this.syncSiblings();
            this.notifyChanged();
        }
        return child;
    }

    replaceChild(node: ConsoleNode, child: ConsoleNode): ConsoleNode {
        const index = this.childNodes.indexOf(child);
        if (index >= 0) {
            this.detachFromParent(node);
            node.parentNode = this;
            this.childNodes[index] = node;
            child.parentNode = null;
            child.nextSibling = null;
            this.syncSiblings();
            this.notifyChanged();
        }
        return child;
    }

    insertBefore(newChild: ConsoleNode, refChild: ConsoleNode | null): void {
        this.detachFromParent(newChild);
        newChild.parentNode = this;
        if (!refChild) {
            this.childNodes.push(newChild);
        } else {
            const index = this.childNodes.indexOf(refChild);
            if (index >= 0) {
                this.childNodes.splice(index, 0, newChild);
            } else {
                this.childNodes.push(newChild);
            }
        }
        this.syncSiblings();
        this.notifyChanged();
    }

    appendChild(newChild: ConsoleNode): ConsoleNode {
        this.detachFromParent(newChild);
        newChild.parentNode = this;
        this.childNodes.push(newChild);
        this.syncSiblings();
        this.notifyChanged();
        return newChild;
    }

    querySelector(selector: string): ConsoleNode | null {
        return this.querySelectorAll(selector)?.[0] || null;
    }

    querySelectorAll(selector: string): ConsoleNode[] | null {
        const results: ConsoleNode[] = [];
        const matchers = selector
            .split(',')
            .map(item => item.trim())
            .filter(Boolean);
        const matches = (node: ConsoleElement, matcher: string): boolean => {
            if (matcher.startsWith('.')) {
                const className = matcher.slice(1);
                return node.classList.values().includes(className);
            }
            if (matcher.startsWith('[') && matcher.endsWith(']')) {
                const attrName = matcher.slice(1, -1).trim();
                return attrName ? node.hasAttribute(attrName) : false;
            }
            return node.tagName === matcher;
        };
        const walk = (node: ConsoleNode) => {
            if (node instanceof ConsoleElement) {
                if (matchers.some(matcher => matches(node, matcher))) {
                    results.push(node);
                }
            }
            node.childNodes.forEach(child => walk(child));
        };
        walk(this);
        return results.length ? results : null;
    }

    addEventListener(type: string, listener: EventListener): void {
        const listeners = this.eventListeners.get(type) || [];
        listeners.push(listener);
        this.eventListeners.set(type, listeners);
    }

    hasEventListener(type: string): boolean {
        return !!this.eventListeners.get(type)?.length;
    }

    dispatchEvent(event: Event): boolean {
        const listeners = this.eventListeners.get(event.type);
        if (!listeners?.length) {
            return false;
        }
        listeners.slice().forEach(listener => listener.call(this, event));
        return true;
    }

    removeEventListener(type: string, listener?: EventListener): void {
        if (!listener) {
            this.eventListeners.delete(type);
            return;
        }
        const listeners = this.eventListeners.get(type);
        const index = listeners?.lastIndexOf(listener) ?? -1;
        if (listeners && index >= 0) {
            listeners.splice(index, 1);
            if (!listeners.length) {
                this.eventListeners.delete(type);
            }
        }
    }

    protected syncSiblings(): void {
        this.childNodes.forEach((child, index) => {
            child.parentNode = this;
            child.nextSibling = this.childNodes[index + 1] || null;
        });
    }

    protected notifyChanged(): void {
        this.dispatchEvent({ type: ConsoleNode.CHANGE_EVENT, target: this } as unknown as Event);
        this.parentNode?.notifyChanged();
    }
}

export class ConsoleText extends ConsoleNode implements RText {
    protected value = '';

    constructor(textContent: string) {
        super(NodeType.Text);
        this.value = textContent;
    }

    get textContent(): string {
        return this.value;
    }

    set textContent(value: string) {
        const next = String(value ?? '');
        if (this.value === next) {
            return;
        }
        this.value = next;
        this.notifyChanged();
    }
}

export class ConsoleComment extends ConsoleNode implements RComment {
    protected value = '';

    constructor(textContent: string) {
        super(NodeType.Comment);
        this.value = textContent;
    }

    get textContent(): string {
        return this.value;
    }

    set textContent(value: string) {
        const next = String(value ?? '');
        if (this.value === next) {
            return;
        }
        this.value = next;
        this.notifyChanged();
    }
}

export type ConsoleElementAttributeValue = string | number | boolean | null | undefined;

export function queryConsoleNode(root: RNode | RNode[] | null | undefined, selector: string): ConsoleNode | null {
    const nodes = isArray(root) ? root : (root ? [root] : []);
    for (const node of nodes) {
        const result = (node as ConsoleNode)?.querySelector?.(selector);
        if (result) {
            return result;
        }
    }
    return null;
}

export function queryConsoleNodes(root: RNode | RNode[] | null | undefined, selector: string): ConsoleNode[] {
    const nodes = isArray(root) ? root : (root ? [root] : []);
    const results: ConsoleNode[] = [];
    nodes.forEach(node => {
        const found = (node as ConsoleNode)?.querySelectorAll?.(selector);
        if (found?.length) {
            results.push(...found);
        }
    });
    return results;
}

export function syncConsoleElementAttributes(
    root: RNode | RNode[] | null | undefined,
    selector: string,
    attributes: Record<string, ConsoleElementAttributeValue>
): ConsoleElement | null {
    const element = queryConsoleNode(root, selector) as ConsoleElement | null;
    if (!element?.setAttribute) {
        return null;
    }
    Object.entries(attributes).forEach(([name, value]) => {
        if (value == null) {
            element.removeAttribute?.(name);
            return;
        }
        element.setAttribute(name, String(value));
    });
    return element;
}

export function syncConsoleElementsAttributes(
    root: RNode | RNode[] | null | undefined,
    selector: string,
    attributes: Record<string, ConsoleElementAttributeValue>
): ConsoleElement[] {
    const elements = queryConsoleNodes(root, selector).filter((node): node is ConsoleElement => !!(node as ConsoleElement)?.setAttribute);
    elements.forEach(element => {
        Object.entries(attributes).forEach(([name, value]) => {
            if (value == null) {
                element.removeAttribute?.(name);
                return;
            }
            element.setAttribute(name, String(value));
        });
    });
    return elements;
}

export class ConsoleElement extends ConsoleNode implements RElement {
    firstChild: RNode | null = null;
    style: RCssStyleDeclaration = new ConsoleCssStyleDeclaration(() => this.notifyChanged());
    classList = new ConsoleDomTokenList();

    constructor(
        readonly tagName: string,
        readonly className: string = '',
        nodeType: number = NodeType.Element,
        parentNode: ConsoleNode | null = null,
        childNodes: ConsoleNode[] = [],
        nextSibling: ConsoleNode | null = null
    ) {
        super(nodeType, parentNode, childNodes, nextSibling);
        if (className) {
            className.split(/\s+/).filter(Boolean).forEach(token => this.classList.add(token));
        }
    }

    get textContent(): string | null {
        const text = this.childNodes.map(child => {
            if (child instanceof ConsoleText || child instanceof ConsoleComment) {
                return child.textContent;
            }
            if (child instanceof ConsoleElement) {
                return child.textContent || '';
            }
            return '';
        }).join('');
        return text || null;
    }

    hasAttribute(name: string): boolean {
        return this.resolveAttribute(name) != null;
    }

    getAttribute(name: string): string | null {
        return this.resolveAttribute(name)?.value ?? null;
    }

    protected resolveAttribute(name: string): RAttr | undefined {
        const direct = this.attributes.get(name);
        if (direct) {
            return direct;
        }
        const lowered = name.toLowerCase();
        if (lowered !== name) {
            const lower = this.attributes.get(lowered);
            if (lower) {
                return lower;
            }
        }
        for (const [key, attr] of this.attributes.entries()) {
            if (key.toLowerCase() === lowered) {
                return attr;
            }
        }
        return undefined;
    }

    setAttribute(name: string, value: string): void {
        const next = String(value ?? '');
        const previous = this.attributes.get(name)?.value;
        this.attributes.set(name, { name, value: next });
        if (name === 'class') {
            this.classList.reset(next.split(/\s+/).filter(Boolean));
        } else if (name === 'style') {
            const styles = new ConsoleCssStyleDeclaration();
            styles.applyCssText(next);
            styles.setChangeListener(() => this.notifyChanged());
            this.style = styles;
        }
        if (previous !== next) {
            this.notifyChanged();
        }
    }

    removeAttribute(name: string): void {
        const hadAttribute = this.attributes.delete(name);
        if (name === 'class') {
            this.classList.reset([]);
        } else if (name === 'style') {
            this.style = new ConsoleCssStyleDeclaration(() => this.notifyChanged());
        }
        if (hadAttribute) {
            this.notifyChanged();
        }
    }

    hasAttributeNS(namespace: string, localName: string): boolean {
        return this.attributes.has(`${localName}:${namespace}`);
    }

    getAttributeNS(namespace: string | null, localName: string): string | null {
        return this.attributes.get(`${localName}:${namespace}`)?.value ?? null;
    }

    setAttributeNS(namespace: string, name: string, value: string): void {
        const key = `${name}:${namespace}`;
        const next = String(value ?? '');
        const previous = this.attributes.get(key)?.value;
        this.attributes.set(key, { name, namespace, value: next });
        if (previous !== next) {
            this.notifyChanged();
        }
    }

    removeAttributeNS(namespace: string, localName: string): void {
        if (this.attributes.delete(`${localName}:${namespace}`)) {
            this.notifyChanged();
        }
    }

    setProperty(name: string, value: any): void {
        const next = String(value ?? '');
        const previous = this.attributes.get(name)?.value;
        this.attributes.set(name, { name, value: next });
        if (previous !== next) {
            this.notifyChanged();
        }
    }
}

@Injectable()
export class ConsoleRenderer implements Renderer {
    [noReact] = true;

    destroyNode?: ((node: RNode) => void) | null;

    createComment(value: string): ConsoleComment {
        return new ConsoleComment(value);
    }

    createElement(name: string, namespace?: string | null): ConsoleElement {
        return namespace ? new ConsoleElement(`${namespace}:${name}`) : new ConsoleElement(name);
    }

    createText(value: string): ConsoleText {
        return new ConsoleText(value);
    }

    appendChild(parent: ConsoleNode, newChild: ConsoleNode): void {
        parent.appendChild(newChild);
        if (parent instanceof ConsoleElement) {
            parent.firstChild = parent.childNodes[0] || null;
        }
    }

    insertBefore(parent: ConsoleNode, newChild: ConsoleNode, refChild: ConsoleNode | null): void {
        parent.insertBefore(newChild, refChild);
        if (parent instanceof ConsoleElement) {
            parent.firstChild = parent.childNodes[0] || null;
        }
    }

    removeChild(parent: ConsoleNode | null, oldChild: ConsoleNode): void {
        if (!parent) {
            return;
        }
        parent.removeChild(oldChild);
        if (parent instanceof ConsoleElement) {
            parent.firstChild = parent.childNodes[0] || null;
        }
    }

    querySelector(el: RNode | RNode[], selector: string): RNode | null {
        const nodes = isArray(el) ? el : [el];
        for (const node of nodes) {
            const result = (node as ConsoleNode).querySelector(selector);
            if (result) {
                return result;
            }
        }
        return null;
    }

    querySelectorAll(el: RNode | RNode[], selector: string): RNode[] | null {
        const nodes = isArray(el) ? el : [el];
        const results: RNode[] = [];
        nodes.forEach(node => {
            const found = (node as ConsoleNode).querySelectorAll(selector);
            if (found?.length) {
                results.push(...found);
            }
        });
        return results.length ? results : null;
    }

    parentNode(node: RNode): RNode | null {
        return (node as ConsoleNode).parentNode;
    }

    nextSibling(node: RNode): RNode | null {
        return (node as ConsoleNode).nextSibling || null;
    }

    setAttribute(el: RNode, name: string, value: string, namespace?: string | null): void {
        const node = el as ConsoleElement;
        if (namespace) {
            node.setAttributeNS(namespace, name, value);
            return;
        }
        node.setAttribute(name, value);
    }

    removeAttribute(el: RNode, name: string, namespace?: string | null): void {
        const node = el as ConsoleElement;
        if (namespace) {
            node.removeAttributeNS(namespace, name);
            return;
        }
        node.removeAttribute(name);
    }

    getAttributes(el: RNode): RAttr[] {
        return Array.from((el as ConsoleElement).attributes.values());
    }

    addClass(el: RElement, name: string): void {
        (el as ConsoleElement).classList.add(name);
    }

    removeClass(el: RElement, name: string): void {
        (el as ConsoleElement).classList.remove(name);
    }

    setStyle(el: RElement, style: string, value: any): void {
        (el as ConsoleElement).style.setProperty(style, String(value ?? ''));
    }

    removeStyle(el: RElement, style: string, flags?: RendererStyleFlags2): void {
        void flags;
        (el as ConsoleElement).style.removeProperty(style);
    }

    setProperty(el: RElement, name: string, value: any): void {
        (el as ConsoleElement).setProperty(name, value);
    }

    setValue(node: RText | RComment, value: string): void {
        (node as ConsoleText | ConsoleComment).textContent = value;
    }

    click(node: RNode): void {
        (node as ConsoleNode).dispatchEvent({ type: 'click', target: node } as unknown as Event);
    }

    renderToLines(node: RNode | RNode[]): string[] {
        const nodes = isArray(node) ? node : [node];
        const lines: string[] = [];
        const collectText = (current: ConsoleNode, nested = false): string => {
            if (current instanceof ConsoleText || current instanceof ConsoleComment) {
                return current.textContent;
            }
            if (current instanceof ConsoleElement) {
                const text = current.childNodes.map(child => collectText(child, true)).join('');
                return nested ? text : text.trim();
            }
            return '';
        };
        const pushLine = (value: string) => {
            const line = value.trimEnd();
            if (line) {
                lines.push(line);
            }
        };
        const walk = (current: RNode) => {
            if (current instanceof ConsoleText) {
                pushLine(current.textContent);
                return;
            }
            if (current instanceof ConsoleComment) {
                return;
            }
            const element = current as ConsoleElement;
            const tag = (element.tagName || '').toLowerCase();
            switch (tag) {
                case 'h1':
                case 'h2':
                case 'h3':
                case 'h4':
                case 'p':
                case 'button':
                case 'label':
                case 'span':
                case 'li':
                case 'a': {
                    pushLine(collectText(element));
                    return;
                }
                case 'input': {
                    pushLine(element.getAttribute('value') || collectText(element));
                    return;
                }
                case 'textarea': {
                    const value = element.getAttribute('value') || collectText(element);
                    String(value || '')
                        .split('\n')
                        .forEach(line => pushLine(line));
                    return;
                }
                case 'br':
                    lines.push('');
                    return;
                default:
                    element.childNodes.forEach(child => walk(child));
                    return;
            }
        };
        nodes.forEach(nodeItem => walk(nodeItem));
        return lines.filter((line, index, items) => index === 0 || line || items[index - 1]);
    }
}

@Injectable()
export class ConsoleTemplateParser implements TemplateParser {
    [noReact] = true;
    protected readonly parser = new XMLParser({
        preserveOrder: true,
        ignoreAttributes: false,
        attributeNamePrefix: '',
        textNodeName: '#text',
        commentPropName: '#comment',
        trimValues: false,
        parseTagValue: false,
        parseAttributeValue: false,
        allowBooleanAttributes: true,
        htmlEntities: true
    });

    constructor(private renderer: ConsoleRenderer) {
    }

    parse(template: string): RNode[] {
        const normalized = this.normalizeVoidElements(template.trim());
        const parsed = this.parser.parse(`<console-root>${normalized}</console-root>`) as Array<Record<string, unknown>>;
        const root = parsed.find(entry => Object.prototype.hasOwnProperty.call(entry, 'console-root'));
        const children = root?.['console-root'];
        return Array.isArray(children)
            ? children.map(entry => this.convertParsedNode(entry as Record<string, unknown>)).filter((node): node is ConsoleNode => !!node)
            : [];
    }

    protected normalizeVoidElements(template: string): string {
        const names = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
        let result = '';
        let cursor = 0;
        while (cursor < template.length) {
            const start = template.indexOf('<', cursor);
            if (start < 0) {
                result += template.slice(cursor);
                break;
            }
            result += template.slice(cursor, start);
            const nameMatch = template.slice(start).match(/^<\s*(\/?)\s*([a-zA-Z][\w:-]*)/);
            if (!nameMatch || !names.has(nameMatch[2].toLowerCase())) {
                result += '<';
                cursor = start + 1;
                continue;
            }
            let quote = '';
            let end = start + nameMatch[0].length;
            for (; end < template.length; end++) {
                const char = template[end];
                if (quote) {
                    if (char === quote) {
                        quote = '';
                    }
                } else if (char === '"' || char === "'") {
                    quote = char;
                } else if (char === '>') {
                    break;
                }
            }
            if (end >= template.length) {
                result += template.slice(start);
                break;
            }
            if (nameMatch[1]) {
                cursor = end + 1;
                continue;
            }
            const tag = template.slice(start, end);
            result += /\/\s*$/.test(tag) ? `${tag}>` : `${tag}/>`;
            cursor = end + 1;
        }
        return result;
    }

    protected convertParsedNode(node: Record<string, unknown>): ConsoleNode | null {
        if (Object.prototype.hasOwnProperty.call(node, '#text')) {
            const value = String(node['#text'] ?? '');
            return value.trim() ? this.renderer.createText(value) as ConsoleText : null;
        }
        if (Object.prototype.hasOwnProperty.call(node, '#comment')) {
            const content = node['#comment'];
            const value = Array.isArray(content) && content.length
                ? String((content[0] as Record<string, unknown>)['#text'] ?? '')
                : '';
            return this.renderer.createComment(value) as ConsoleComment;
        }
        const tagName = Object.keys(node).find(key => key !== ':@');
        if (!tagName) {
            return null;
        }
        const element = this.renderer.createElement(tagName.toLowerCase()) as ConsoleElement;
        const attributes = node[':@'];
        if (attributes && typeof attributes === 'object') {
            Object.entries(attributes as Record<string, unknown>).forEach(([name, value]) => {
                this.renderer.setAttribute(element, name, value === true ? '' : String(value ?? ''));
            });
        }
        const children = node[tagName];
        if (Array.isArray(children)) {
            children.forEach(child => {
                const converted = this.convertParsedNode(child as Record<string, unknown>);
                if (converted) {
                    this.renderer.appendChild(element, converted);
                }
            });
        }
        return element;
    }
}

export const CONSOLE_TEMPLATE = token<TemplateCompilerOptions>('CONSOLE_TEMPLATE');

const consoleDefaultOptions = {
    delimiters: ['{{', '}}']
} as TemplateCompilerOptions;

@Injectable()
export class ConsoleTemplateCompiler extends AbstractTemplateCompiler {
    constructor(
        readonly parser: ConsoleTemplateParser,
        readonly renderer: ConsoleRenderer,
        @Inject(CONSOLE_TEMPLATE, { defaultValue: consoleDefaultOptions }) protected options: TemplateCompilerOptions
    ) {
        super();
    }
}


@Module({
    providers: [
        ConsoleRenderer,
        ConsoleTemplateCompiler,
        ConsoleTemplateParser,
        { provide: CONSOLE_TEMPLATE, useValue: consoleDefaultOptions },
        { provide: Renderer, useClass: ConsoleRenderer, asDefault: true },
        { provide: TemplateParser, useClass: ConsoleTemplateParser, asDefault: true },
        { provide: TemplateCompiler, useClass: ConsoleTemplateCompiler, deps: [ConsoleTemplateParser, ConsoleRenderer, CONSOLE_TEMPLATE], asDefault: true }
    ],
    exports: [ConsoleRenderer, ConsoleTemplateCompiler, ConsoleTemplateParser]
})
export class ConsoleTemplateModule {
    static withOptions(options: TemplateCompilerOptions): ModuleWithProviders<ConsoleTemplateModule> {
        return {
            module: ConsoleTemplateModule,
            providers: [{ provide: CONSOLE_TEMPLATE, useValue: options }]
        };
    }
}
