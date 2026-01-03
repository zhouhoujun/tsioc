import { deepClone, Inject, Injectable, InvocationContext, isArray, isString, lang, Module, ModuleWithProviders, token } from '@tsdi/ioc';
import {
    TemplateParser, AbstractTemplateCompiler, ReactiveEffect, Renderer, RendererStyleFlags2,
    RComment, RElement, RNode, RText, NodeType, RCssStyleDeclaration, RDomTokenList, RAttr,
    TemplateCompiler, TemplateCompilerOptions
} from '@tsdi/components';
import * as cssSelect from 'css-select';
import { EventEmitter } from 'events';



export class JsonNode implements RNode {
    tagName?: string;
    get parentElement(): JsonElement | null {
        return this.parentNode instanceof JsonElement ? this.parentNode : null;
    }

    constructor(
        readonly nodeType: number,
        public parentNode: JsonElement | null = null,
        public childNodes: JsonNode[] = [],
        public nextSibling: JsonNode | null = null) {

    }

    removeChild(oldChild: JsonNode): JsonNode {
        const [removed] = lang.remove(this.childNodes, oldChild) ?? [];
        if (removed) {
            removed.parentNode = null;
            removed.nextSibling = null;
        }
        return removed;
    }

    insertBefore(newChild: JsonNode, refChild: JsonNode | null, isViewRoot?: boolean): void {
        const index = refChild ? this.childNodes.indexOf(refChild) : 0;
        if (index !== -1) {
            this.childNodes.splice(index, 0, newChild);
        } else {
            this.childNodes.push(newChild);
        }
    }
    appendChild(newChild: JsonNode): JsonNode {
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
                getParent: (el: JsonNode) => el.parentElement,
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
                getParent: (el: JsonNode) => el.parentElement,
                removeSubsets: (nodes: JsonNode[]) => nodes,
                getSiblings: (el: JsonNode) => el.nextSibling ? [el, el.nextSibling] : [el],
                prevElementSibling: () => null,
                hasAttrib: (el: JsonElement, name: string) => el.hasAttribute(name),
                isTag: (el: JsonNode): el is JsonElement => el.nodeType === NodeType.Element
            }
        });
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
    private events = new EventEmitter();
    firstChild: RNode | null = null;
    style: RCssStyleDeclaration = new JCssStyleDeclaration();
    classList = new JDomTokenList();
    attributes = new Map<string, any>();
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
    getAttribute(name: string): string | null {
        return this.attributes.get(name)?.value ?? null
    }
    setAttribute(name: string, value: string): void {
        this.attributes.set(name, { name, value });
    }
    removeAttribute(name: string): void {
        this.attributes.delete(name)
    }

    addEventListener(type: string, listener: EventListener, useCapture?: boolean): void {
        this.events.addListener(type, listener)
    }
    removeEventListener(type: string, listener?: EventListener, options?: boolean): void {
        if (listener) {
            this.events.removeListener(type, listener)
        } else {
            this.events.removeAllListeners(type);
        }
    }

    setProperty(name: string, value: any): void {
        this.attributes.set(name, value);
    }

}

@Injectable()
export class JsonRenderer implements Renderer {

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

    selectRootElement(selectorOrNode: string | any, preserveContent?: boolean): JsonElement {
        throw new Error('Method not implemented.');
    }

    querySelector(node: JsonNode | JsonNode[], selector: string): JsonNode | null {
        return cssSelect.selectOne<JsonNode, JsonElement>(selector, isArray(node) ? node : [node], {
            adapter: {
                getAttributeValue: (el: JsonElement, name: string) => el.getAttribute(name) ?? undefined,
                getChildren: (el: JsonNode) => el.childNodes,
                getName: (el: JsonElement) => el.tagName?.toLowerCase(),
                getText: (el: JsonNode) => (el as JsonText).textContent ?? '',
                getParent: (el: JsonNode) => el.parentElement,
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
                getParent: (el: JsonNode) => el.parentElement,
                removeSubsets: (nodes: JsonNode[]) => nodes,
                getSiblings: (el: JsonNode) => el.nextSibling ? [el, el.nextSibling] : [el],
                prevElementSibling: () => null,
                hasAttrib: (el: JsonElement, name: string) => el.hasAttribute(name),
                isTag: (el: JsonNode): el is JsonElement => el.nodeType === NodeType.Element
            }
        });
    }

    parentNode(node: JsonNode): JsonElement | null {
        return node.parentElement
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
const textContent = '#text';


// XML模板解析器实现示例
@Injectable()
export class JsonTemplateParser implements TemplateParser<Object | string> {
    constructor(
        private renderer: JsonRenderer
    ) { }

    parse(template: Object | string, environment: InvocationContext): JsonNode[] {
        const jsonObj = isString(template) ? JSON.parse(template) : deepClone(template);
        // 将JSON对象转换为虚拟DOM节点
        return this.convertToNodes(jsonObj);
    }

    private convertToNodes(jsonObj: any, parent?: JsonElement): JsonNode[] {
        // 实现JSON到节点的转换逻辑
        // Handle text nodes
        if (typeof jsonObj === 'string') {
            const textNode = this.renderer.createText(jsonObj);
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
                // #text
                if (keys[0] == textContent) {
                    childNodes.push(this.renderer.createText(jsonObj[textContent]));
                } else if (keys[0] === comment) {  // #comment
                    childNodes.push(this.renderer.createComment(jsonObj[comment]));
                }
                //attrs
                if (key.startsWith('@') || key.startsWith('#') || key.startsWith(':') || key.startsWith('[') || key.startsWith('v-')) {
                    if (parent) {
                        parent.setAttribute(key, datan);
                    }
                } else if (key) {
                    //node tag
                    const node = this.renderer.createElement(key);
                    if (parent) node.parentNode = parent;
                    const children = this.convertToNodes(datan, node);
                    node.childNodes.push(...children);
                    childNodes.push(node);

                }
            }

            // // 处理文本内容
            // if ('#text' in jsonObj) {
            //     node.textContent = jsonObj['#text'];
            // }

            // 递归转换子节点
            // node.childNodes.push(...childNodes.flatMap(child => this.convertToNodes(child)));
            // 设置父节点引用
            // node.childNodes.forEach(child => child.parentNode = node);

            // 处理注释节点
            // if (comment in jsonObj) {
            //     return [this.renderer.createComment(jsonObj[comment])];
            // }

            // // 处理文本节点
            // if (textContent in jsonObj && !(tagName in jsonObj)) {
            //     return [this.renderer.createText(jsonObj[textContent])];
            // }

            // // 处理元素节点
            // if (tagName in jsonObj) {
            //     const node = this.renderer.createElement(jsonObj[tagName]) as JsonElement;

            //     // 设置文本内容
            //     if (textContent in jsonObj) {
            //          this.renderer.createText(jsonObj[textContent]);
            //         node.childNodes.push()
            //     }

            //     // 设置属性
            //     if ('attrs' in jsonObj && typeof jsonObj.attrs === 'object') {
            //         for (const [key, value] of Object.entries(jsonObj.attrs as Record<string, any>)) {
            //             if (typeof value === 'string') {
            //                 node.setAttribute(key, value);
            //             } else if (typeof value === 'object' && value !== null && 'namespace' in value && 'value' in value) {
            //                 node.setAttributeNS(value.namespace, key, value.value);
            //             }
            //         }
            //     }

            //     // 处理className
            //     if ('#class' in jsonObj) {
            //         node.classList.add(jsonObj.className);
            //     }

            //     // 处理样式
            //     if ('#style' in jsonObj && typeof jsonObj.style === 'object') {
            //         for (const [prop, value] of Object.entries(jsonObj.style as Record<string, any>)) {
            //             node.style.setProperty(prop, value);
            //         }
            //     }

            //     // 递归处理子节点
            //     if ('#children' in jsonObj && Array.isArray(jsonObj.childNodes)) {
            //         node.childNodes = jsonObj.childNodes.flatMap((child: any) => this.convertToNodes(child));
            //         // 设置父节点引用
            //         node.childNodes.forEach(child => child.parentNode = node);
            //     }

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
        readonly effect: ReactiveEffect,
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