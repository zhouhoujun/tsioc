import { deepClone, Inject, Injectable, isArray, isString, lang, Module, ModuleWithProviders, token } from '@tsdi/ioc';
import {
    TemplateParser, AbstractTemplateCompiler, Renderer, RendererStyleFlags2,
    RComment, RElement, RNode, RText, NodeType, RCssStyleDeclaration, RDomTokenList, RAttr,
    TemplateCompiler, TemplateCompilerOptions,
    noReact
} from '@tsdi/components';
import * as cssSelect from 'css-select';
import { EventEmitter } from 'events';



export class JsonNode implements RNode {
    private events = new EventEmitter();
    tagName?: string;
    get parentElement(): JsonElement | null {
        return this.parentNode instanceof JsonElement ? this.parentNode : null;
    }

    attributes = new Map<string, any>();

    constructor(
        readonly nodeType: number,
        public parentNode: JsonNode | null = null,
        public childNodes: JsonNode[] = [],
        public nextSibling: JsonNode | null = null) {

    }

    hasAttributeNS(namespace: string, localName: string): boolean {
        return this.attributes.has(`${localName}:${namespace}`);
    }

    getAttributeNS(namespace: string | null, localName: string): string | null {
        return this.attributes.get(`${localName}:${namespace}`)?.value ?? null;
    }
    setAttributeNS(namespace: string, name: string, value: string): void {
        this.attributes.set(`${name}:${namespace}`, { name, namespace, value });
    }
    removeAttributeNS(namespace: string, localName: string): void {
        this.attributes.delete(`${localName}:${namespace}`);
    }

    hasAttribute(name: string): boolean {
        return this.attributes.has(name)
    }
    getAttribute(name: string): any | null {
        return this.attributes.get(name)?.value ?? null
    }
    setAttribute(name: string, value: any): void {
        this.attributes.set(name, { name, value });
    }
    removeAttribute(name: string): void {
        this.attributes.delete(name)
    }

    removeChild(oldChild: JsonNode): JsonNode {
        const [removed] = lang.remove(this.childNodes, oldChild) ?? [];
        if (removed) {
            removed.parentNode = null;
            removed.nextSibling = null;
            removed.parentNode = null;
        }
        return removed;
    }

    replaceChild(node: JsonNode, child: JsonNode): JsonNode {
        const index = this.childNodes.indexOf(node);
        if (index !== -1) {
            child.parentNode = this;
            this.childNodes.splice(index, 1, child);
            node.parentNode = null;
        }
        return child;
    }
    

    insertBefore(newChild: JsonNode, refChild: JsonNode | null, isViewRoot?: boolean): void {
        newChild.parentNode = this;
        const index = refChild ? this.childNodes.indexOf(refChild) : 0;
        if (index !== -1) {
            this.childNodes.splice(index, 0, newChild);
        } else {
            this.childNodes.push(newChild);
        }
    }
    appendChild(newChild: JsonNode): JsonNode {
        newChild.parentNode = this;
        this.childNodes.push(newChild);
        return this;
    }

    querySelector(selector: string): JsonNode | null {
        return cssSelect.selectOne<JsonNode, JsonElement>(selector, [this], {
            adapter: {
                getAttributeValue: (el: JsonElement, name: string) => el.getAttribute(name) ?? undefined,
                getChildren: (el: JsonNode) => el.childNodes,
                getName: (el: JsonElement) => el.tagName?.toLowerCase(),
                getText: (el: JsonNode) => (el as JsonText).textContent ?? '',
                getParent: (el: JsonNode) => el.parentNode,
                removeSubsets: (nodes: JsonNode[]) => nodes,
                getSiblings: (el: JsonNode) => el.nextSibling ? [el, el.nextSibling] : [el],
                prevElementSibling: () => null,
                hasAttrib: (el: JsonElement, name: string) => el.hasAttribute(name),
                isTag: (el: JsonNode): el is JsonElement => el.nodeType === NodeType.Element
            }
        });
    }

    querySelectorAll(selector: string): JsonNode[] | null {
        return cssSelect.selectAll<JsonNode, JsonElement>(selector, [this], {
            adapter: {
                getAttributeValue: (el: JsonElement, name: string) => el.getAttribute(name) ?? undefined,
                getChildren: (el: JsonNode) => el.childNodes,
                getName: (el: JsonElement) => el.tagName?.toLowerCase(),
                getText: (el: JsonNode) => (el as JsonText).textContent ?? '',
                getParent: (el: JsonNode) => el.parentNode,
                removeSubsets: (nodes: JsonNode[]) => nodes,
                getSiblings: (el: JsonNode) => el.nextSibling ? [el, el.nextSibling] : [el],
                prevElementSibling: () => null,
                hasAttrib: (el: JsonElement, name: string) => el.hasAttribute(name),
                isTag: (el: JsonNode): el is JsonElement => el.nodeType === NodeType.Element
            }
        });
    }

    

    addEventListener(type: string, listener: EventListener, useCapture?: boolean): void {
        this.events.addListener(type, listener)
    }

    dispatchEvent(event: Event): boolean {
       return  this.events.emit(event.type, event);
    }

    removeEventListener(type: string, listener?: EventListener, options?: boolean): void {
        if (listener) {
            this.events.removeListener(type, listener)
        } else {
            this.events.removeAllListeners(type);
        }
    }
}

export class JsonText extends JsonNode implements RText {
    constructor(public textContent: string) {
        super(NodeType.Text)
    }
}

export class JsonComment extends JsonNode implements RComment {
    constructor(public textContent: string) {
        super(NodeType.Comment)
    }
}

export class JCssStyleDeclaration implements RCssStyleDeclaration {

    constructor(private stylies: Record<string, string> = {}) {

    }

    removeProperty(propertyName: string): string {
        const style = this.stylies[propertyName];
        delete this.stylies[propertyName];
        return style;
    }

    setProperty(propertyName: string, value: string | null, priority?: string): void {
        if (value) {
            this.stylies[propertyName] = value;
        } else {
            this.removeProperty(propertyName);
        }
    }

}

export class JDomTokenList implements RDomTokenList {

    constructor(private tokens: string[] = []) {

    }

    add(token: string): void {
        if (!this.tokens.includes(token)) {
            this.tokens.push(token);
        }
    }
    remove(token: string): void {
        lang.remove(this.tokens, token);
    }

}

export class JsonElement extends JsonNode implements RElement {
    firstChild: RNode | null = null;
    style: RCssStyleDeclaration = new JCssStyleDeclaration();
    classList = new JDomTokenList();
    constructor(
        readonly tagName: string,
        readonly className: string = '',
        nodeType: number = NodeType.Element,
        parentNode: JsonElement | null = null,
        readonly childNodes: JsonNode[] = [],
        nextSibling: JsonNode | null = null) {
        super(nodeType, parentNode, childNodes, nextSibling)

    }

    get textContent(): string | null {
        return this.childNodes.filter(r => r.nodeType === NodeType.Text && (r as JsonText).textContent).map(r => (r as JsonText).textContent).join(' ') ?? null;
    }

    setProperty(name: string, value: any): void {
        this.attributes.set(name, value);
    }

}

@Injectable()
export class JsonRenderer implements Renderer {

    [noReact] = true;

    destroyNode?: ((node: RNode) => void) | null | undefined;

    // 创建Json注释节点
    createComment(value: string): JsonComment {
        return new JsonComment(value);
    }

    // 创建Json元素节点（支持命名空间）
    createElement(name: string, namespace?: string | null): JsonElement {
        const element = new JsonElement(name);
        if (namespace) {
            element.setAttributeNS(namespace, name, namespace);
        }
        return element;
    }

    // 创建Json文本节点
    createText(value: string): JsonText {
        return new JsonText(value);
    }

    // 实现节点.appendChild
    appendChild(parent: JsonElement, newChild: JsonNode): void {
        newChild.parentNode = parent;
        if (parent.firstChild === null) {
            parent.firstChild = newChild;
        } else {
            const lastChild = parent.childNodes[parent.childNodes.length - 1];
            lastChild.nextSibling = newChild;
        }
        parent.childNodes.push(newChild);
    }

    // 实现节点.insertBefore
    insertBefore(parent: JsonNode, newChild: JsonNode, refChild: JsonNode | null): void {
        parent.insertBefore(newChild, refChild);
    }

    removeChild(parent: JsonElement | null, oldChild: JsonNode, isHostElement?: boolean): void {
        parent?.removeChild(oldChild)
    }

    querySelector(node: JsonNode | JsonNode[], selector: string): JsonNode | null {
        return cssSelect.selectOne<JsonNode, JsonElement>(selector, isArray(node) ? node : [node], {
            adapter: {
                getAttributeValue: (el: JsonElement, name: string) => el.getAttribute(name) ?? undefined,
                getChildren: (el: JsonNode) => el.childNodes,
                getName: (el: JsonElement) => el.tagName?.toLowerCase(),
                getText: (el: JsonNode) => (el as JsonText).textContent ?? '',
                getParent: (el: JsonNode) => el.parentNode,
                removeSubsets: (nodes: JsonNode[]) => nodes,
                getSiblings: (el: JsonNode) => el.nextSibling ? [el, el.nextSibling] : [el],
                prevElementSibling: () => null,
                hasAttrib: (el: JsonElement, name: string) => el.hasAttribute(name),
                isTag: (el: JsonNode): el is JsonElement => el.nodeType === NodeType.Element
            }
        });
    }

    querySelectorAll(node: JsonNode | JsonNode[], selector: string): JsonNode[] | null {
        return cssSelect.selectAll<JsonNode, JsonElement>(selector, isArray(node) ? node : [node], {
            adapter: {
                getAttributeValue: (el: JsonElement, name: string) => el.getAttribute(name) ?? undefined,
                getChildren: (el: JsonNode) => el.childNodes,
                getName: (el: JsonElement) => el.tagName?.toLowerCase(),
                getText: (el: JsonNode) => (el as JsonText).textContent ?? '',
                getParent: (el: JsonNode) => el.parentNode,
                removeSubsets: (nodes: JsonNode[]) => nodes,
                getSiblings: (el: JsonNode) => el.nextSibling ? [el, el.nextSibling] : [el],
                prevElementSibling: () => null,
                hasAttrib: (el: JsonElement, name: string) => el.hasAttribute(name),
                isTag: (el: JsonNode): el is JsonElement => el.nodeType === NodeType.Element
            }
        });
    }

    parentNode(node: JsonNode): JsonNode | null {
        return node.parentNode
    }
    nextSibling(node: JsonNode): JsonNode | null {
        return node.nextSibling;
    }
    setAttribute(el: JsonElement, name: string, value: string, namespace?: string | null): void {
        if (namespace) {
            el.setAttributeNS(namespace, name, value)
        } else {
            el.setAttribute(name, value)
        }
    }

    getAttributes(el: JsonElement): RAttr[] {
        return Array.from(el.attributes.values());
    }

    removeAttribute(el: JsonElement, name: string, namespace?: string | null): void {
        if (namespace) {
            el.removeAttributeNS(namespace, name)
        } else {
            el.removeAttribute(name)
        }
    }

    addClass(el: JsonElement, name: string): void {
        el.classList.add(name);
    }
    removeClass(el: JsonElement, name: string): void {
        el.classList.remove(name);
    }
    setStyle(el: JsonElement, style: string, value: any, flags?: RendererStyleFlags2): void {
        el.style.setProperty(style, value);
    }
    removeStyle(el: JsonElement, style: string, flags?: RendererStyleFlags2): void {
        el.style.removeProperty(style);
    }
    setProperty(el: JsonElement, name: string, value: any): void {
        el.setProperty?.(name, value);
    }
    setValue(node: JsonText | JsonComment, value: string): void {
        node.textContent = value;
    }

}
const comment = '#comment';
const text = '#text';
const textContent = 'textContent';
const attributes = 'attributes';
const children = 'children';
const attrRegex = /^(@|#|:|\[|v-|\.)/;

// XML模板解析器实现示例
@Injectable()
export class JsonTemplateParser implements TemplateParser<Object | string> {
    [noReact] = true;

    constructor(
        private renderer: JsonRenderer
    ) { }

    parse(template: Object | string): JsonNode[] {
        const jsonObj = isString(template) ? JSON.parse(template) : deepClone(template);
        // 将JSON对象转换为虚拟DOM节点
        return this.convertToNodes(jsonObj);
    }

    private convertToNodes(jsonObj: any, parent?: JsonElement): JsonNode[] {
        // 实现JSON到节点的转换逻辑
        // Handle text nodes
        if (typeof jsonObj === 'string') {
            const textNode = this.renderer.createText(jsonObj);
            if (parent) textNode.parentNode = parent;
            return [textNode];
        }

        // 处理数组节点
        if (Array.isArray(jsonObj)) {
            return jsonObj.flatMap(item => this.convertToNodes(item, parent));
        }

        // 处理对象节点
        if (jsonObj && typeof jsonObj === 'object') {
            // JSON节点格式约定：
            // - 如果有tagName属性，则创建元素节点
            // - 如果有textContent属性，则创建文本节点
            // - 如果有comment属性，则创建注释节点
            // - 属性存储在attrs对象中
            // - 子节点存储在children数组中

            const keys = Object.keys(jsonObj);


            // 处理子节点
            const childNodes: any[] = [];
            // 设置属性
            for (const key of keys) {
                const datan = jsonObj[key];
                let node: JsonNode;
                switch (key) {
                    case text:
                    case textContent:
                        // #text
                        node = this.renderer.createText(datan);
                        if (parent) node.parentNode = parent;
                        childNodes.push(node);
                        break;
                    case comment:
                        // #comment
                        node = this.renderer.createComment(datan);
                        if (parent) node.parentNode = parent;
                        childNodes.push(node);
                        break;
                    case attributes:
                        if (parent) {
                            Object.entries(datan).forEach(([name, value]) => {
                                parent.setAttribute(name, value as any);
                            })
                        }
                        break;
                    case children:
                        if (parent) {
                            const nodes = this.convertToNodes(datan, parent);
                            childNodes.push(...nodes);
                        }
                        break;

                    default:
                        if (attrRegex.test(key)) {
                            //attrs
                            if (parent) {
                                parent.setAttribute(key.startsWith('.') ? key.slice(1) : key, datan);
                            }
                        } else if (key) {
                            //node tag
                            node = this.renderer.createElement(key);
                            if (parent) node.parentNode = parent;
                            const children = this.convertToNodes(datan, node as JsonElement);
                            node.childNodes.push(...children);
                            childNodes.push(node);

                        }
                        break;

                }

            }

            return childNodes;
        }


        // 对于其他类型，返回空数组
        return [];
    }
}

export const JSON_COMPILER_OPTIONS = token<TemplateCompilerOptions>('JSON_COMPILER_OPTIONS');

const jsonDefaultOptions = {
    delimiters: ['{{', '}}'],
} as TemplateCompilerOptions;

@Injectable()
export class JsonTemplateCompiler extends AbstractTemplateCompiler {

    constructor(
        readonly parser: JsonTemplateParser,
        readonly renderer: JsonRenderer,
        @Inject(JSON_COMPILER_OPTIONS, { defaultValue: jsonDefaultOptions }) protected options: TemplateCompilerOptions) {
        super()
    }
}


@Module({
    providers: [
        JsonRenderer,
        JsonTemplateParser,
        JsonTemplateCompiler,
        { provide: Renderer, useClass: JsonRenderer, asDefault: true },
        { provide: TemplateParser, useClass: JsonTemplateParser, asDefault: true },
        { provide: TemplateCompiler, useClass: JsonTemplateCompiler, asDefault: true }
    ]
})
export class JsonTemplateModule {

    static withOptions(options: TemplateCompilerOptions): ModuleWithProviders<JsonTemplateModule> {
        return {
            module: JsonTemplateModule,
            providers: [
                { provide: JSON_COMPILER_OPTIONS, useValue: options }
            ]
        }
    }
}