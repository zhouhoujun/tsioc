import { Inject, Injectable, isArray, lang, Module, ModuleWithProviders, token } from '@tsdi/ioc';
import { XMLParser } from 'fast-xml-parser';
import * as cssSelect from 'css-select';
import {
    TemplateParser, Renderer, RendererStyleFlags2, AbstractTemplateCompiler,
    RComment, RElement, RNode, RText, NodeType, RCssStyleDeclaration, RDomTokenList, RAttr,
    TemplateCompiler, TemplateCompilerOptions, noReact
} from '@tsdi/components';
import { EventEmitter } from 'events';



export class XmlNode implements RNode {
    private events = new EventEmitter();

    get parentElement(): XmlElement | null {
        return this.parentNode instanceof XmlElement ? this.parentNode : null;
    }

    attributes = new Map<string, RAttr>();

    constructor(
        nodeType: number,
        public parentNode: XmlNode | null = null,
        public childNodes: XmlNode[] = [],
        public nextSibling: XmlNode | null = null,
    ) {
        this.nodeType = nodeType;
    }

    nodeType: number;

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

    removeChild(oldChild: XmlNode): XmlNode {
        const [removed] = lang.remove(this.childNodes, oldChild) ?? [];
        if (removed) {
            removed.parentNode = null;
            removed.nextSibling = null;
            removed.parentNode = null;
        }
        return removed;
    }

    replaceChild(node: XmlNode, child: XmlNode): XmlNode {
        const index = this.childNodes.indexOf(node);
        if (index !== -1) {
            child.parentNode = this;
            this.childNodes.splice(index, 1, child);
            node.parentNode = null;
        }
        return child;

    }

    insertBefore(newChild: XmlNode, refChild: XmlNode | null, isViewRoot?: boolean): void {
        newChild.parentNode = this;
        const index = refChild ? this.childNodes.indexOf(refChild) : 0;
        if (index !== -1) {
            this.childNodes.splice(index, 0, newChild);
        } else {
            this.childNodes.push(newChild);
        }
    }
    appendChild(newChild: XmlNode): XmlNode {
        newChild.parentNode = this;
        this.childNodes.push(newChild);
        return this;
    }

    querySelector(selector: string): XmlNode | null {
        return cssSelect.selectOne<XmlNode, XmlElement>(selector, [this], {
            adapter: {
                getAttributeValue: (el: XmlElement, name: string) => el.getAttribute(name) ?? undefined,
                getChildren: (el: XmlNode) => el.childNodes,
                getName: (el: XmlElement) => el.tagName.toLowerCase(),
                getText: (el: XmlNode) => (el as XmlText).textContent ?? '',
                getParent: (el: XmlNode) => el.parentNode,
                removeSubsets: (nodes: XmlNode[]) => nodes,
                getSiblings: (el: XmlNode) => el.nextSibling ? [el, el.nextSibling] : [el],
                prevElementSibling: () => null,
                hasAttrib: (el: XmlElement, name: string) => el.hasAttribute(name),
                isTag: (el: XmlNode): el is XmlElement => el.nodeType === NodeType.Element
            }
        });
    }

    querySelectorAll(selector: string): XmlNode[] | null {
        return cssSelect.selectAll<XmlNode, XmlElement>(selector, [this], {
            adapter: {
                getAttributeValue: (el: XmlElement, name: string) => el.getAttribute(name) ?? undefined,
                getChildren: (el: XmlNode) => el.childNodes,
                getName: (el: XmlElement) => el.tagName.toLowerCase(),
                getText: (el: XmlNode) => (el as XmlText).textContent ?? '',
                getParent: (el: XmlNode) => el.parentNode,
                removeSubsets: (nodes: XmlNode[]) => nodes,
                getSiblings: (el: XmlNode) => el.nextSibling ? [el, el.nextSibling] : [el],
                prevElementSibling: () => null,
                hasAttrib: (el: XmlElement, name: string) => el.hasAttribute(name),
                isTag: (el: XmlNode): el is XmlElement => el.nodeType === NodeType.Element
            }
        });
    }

    addEventListener(type: string, listener: EventListener, useCapture?: boolean): void {
        this.events.addListener(type, listener)
    }

    dispatchEvent(event: Event): boolean {
        return this.events.emit(event.type, event);
    }

    removeEventListener(type: string, listener?: EventListener, options?: boolean): void {
        if (listener) {
            this.events.removeListener(type, listener)
        } else {
            this.events.removeAllListeners(type);
        }
    }

}

export class XmlText extends XmlNode implements RText {
    constructor(public textContent: string) {
        super(NodeType.Text)
    }
}

export class XmlComment extends XmlNode implements RComment {
    constructor(public textContent: string) {
        super(NodeType.Comment)
    }
}

export class XmlCssStyleDeclaration implements RCssStyleDeclaration {

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

export class XmlDomTokenList implements RDomTokenList {

    constructor(private tokens: string[] = []) { }

    add(token: string): void {
        if (!this.tokens.includes(token)) {
            this.tokens.push(token);
        }
    }
    remove(token: string): void {
        lang.remove(this.tokens, token);
    }

}

export class XmlElement extends XmlNode implements RElement {
    firstChild: RNode | null = null;
    style = new XmlCssStyleDeclaration();
    classList = new XmlDomTokenList();
    constructor(
        readonly tagName: string,
        readonly className: string = '',
        nodeType: number = NodeType.Element,
        parentNode: XmlElement | null = null,
        childNodes: XmlNode[] = [],
        nextSibling: XmlNode | null = null) {
        super(nodeType, parentNode, childNodes, nextSibling)

    }


    get textContent(): string | null {
        return this.childNodes.filter(r => r.nodeType === NodeType.Text && (r as XmlText).textContent).map(r => (r as XmlText).textContent).join(' ') ?? null;
    }

    setProperty(name: string, value: any): void {
        // this.attributes.set(name, value);
        this.style.setProperty(name, value);
    }

}


const xmlCssAdapter = {
    getAttributeValue: (el: XmlElement, name: string) => el.getAttribute(name) ?? undefined,
    getChildren: (el: XmlNode) => el.childNodes,
    getName: (el: XmlElement) => el.tagName.toLowerCase(),
    getText: (el: XmlNode) => (el as XmlText).textContent ?? '',
    getParent: (el: XmlNode) => el.parentNode,
    removeSubsets: (nodes: XmlNode[]) => nodes,
    getSiblings: (el: XmlNode) => el.nextSibling ? [el, el.nextSibling] : [el],
    prevElementSibling: () => null,
    hasAttrib: (el: XmlElement, name: string) => el.hasAttribute(name),
    isTag: (el: XmlNode): el is XmlElement => el.nodeType === NodeType.Element
};

@Injectable()
export class XmlRenderer implements Renderer {


    [noReact] = true;

    destroyNode?: ((node: RNode) => void) | null;
    // 创建XML注释节点
    createComment(value: string): XmlComment {
        return new XmlComment(value);
    }

    // 创建XML元素节点（支持命名空间）
    createElement(name: string, namespace?: string | null): XmlElement {
        const element = new XmlElement(name);
        if (namespace) {
            element.setAttributeNS(namespace, name, namespace);
        }
        return element;
    }

    // 创建XML文本节点
    createText(value: string): XmlText {
        return new XmlText(value)
    }

    // 实现节点.appendChild
    appendChild(parent: RElement, newChild: RNode): void {
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
    insertBefore(parent: XmlNode, newChild: XmlNode, refChild: XmlNode | null): void {
        parent.insertBefore(newChild, refChild);
    }

    removeChild(parent: XmlElement | null, oldChild: XmlNode, isHostElement?: boolean): void {
        parent?.removeChild(oldChild);
    }

    querySelector(node: XmlNode | XmlNode[], selector: string): XmlNode | null {
        return cssSelect.selectOne<XmlNode, XmlElement>(selector, isArray(node) ? node : [node], {
            adapter: xmlCssAdapter
        });
    }

    querySelectorAll(node: XmlNode | XmlNode[], selector: string): XmlNode[] | null {
        return cssSelect.selectAll<XmlNode, XmlElement>(selector, isArray(node) ? node : [node], {
            adapter: xmlCssAdapter
        });
    }

    queryByAttribute(node: XmlNode | XmlNode[], attrName: string, attrValue?: string): XmlNode[] | null {
        const nodes = isArray(node) ? node : [node];
        const results: XmlNode[] = [];
        
        const walk = (n: XmlNode[]) => {
            for (const el of n) {
                if (el.nodeType === NodeType.Element) {
                    const elem = el as XmlElement;
                    if (attrValue !== undefined) {
                        if (elem.getAttribute(attrName) === attrValue) {
                            results.push(el);
                        }
                    } else if (elem.hasAttribute(attrName)) {
                        results.push(el);
                    }
                }
                if (el.childNodes?.length) {
                    walk(el.childNodes);
                }
            }
        };
        
        walk(nodes);
        return results.length ? results : null;
    }

    queryByTagName(node: XmlNode | XmlNode[], tagName: string): XmlNode[] | null {
        const nodes = isArray(node) ? node : [node];
        const results: XmlNode[] = [];
        const lowerTagName = tagName.toLowerCase();
        
        const walk = (n: XmlNode[]) => {
            for (const el of n) {
                if (el.nodeType === NodeType.Element) {
                    const elem = el as XmlElement;
                    if (elem.tagName.toLowerCase() === lowerTagName) {
                        results.push(el);
                    }
                }
                if (el.childNodes?.length) {
                    walk(el.childNodes);
                }
            }
        };
        
        walk(nodes);
        return results.length ? results : null;
    }

    queryByComponent(node: XmlNode | XmlNode[], componentSelector: string): XmlNode[] | null {
        return this.querySelectorAll(node, componentSelector);
    }

    getAncestors(node: XmlNode): XmlNode[] {
        const ancestors: XmlNode[] = [];
        let parent = node.parentNode;
        
        while (parent) {
            ancestors.push(parent);
            parent = parent.parentNode;
        }
        
        return ancestors;
    }

    getDescendants(node: XmlNode): XmlNode[] {
        const descendants: XmlNode[] = [];
        
        const walk = (n: XmlNode) => {
            for (const child of n.childNodes || []) {
                descendants.push(child);
                walk(child);
            }
        };
        
        walk(node);
        return descendants;
    }

    matchesSelector(node: XmlNode, selector: string): boolean {
        const ancestors = this.getAncestors(node);
        const matched = this.querySelector(ancestors, selector);
        return matched === node;
    }

    parentNode(node: XmlNode): XmlNode | null {
        return node.parentNode
    }
    nextSibling(node: XmlNode): XmlNode | null {
        return node.nextSibling;
    }
    setAttribute(el: XmlElement, name: string, value: string, namespace?: string | null): void {
        if (namespace) {
            el.setAttributeNS(namespace, name, value)
        } else {
            el.setAttribute(name, value)
        }
    }
    getAttributes(el: XmlElement): RAttr[] {
        return Array.from(el.attributes.values());
    }

    removeAttribute(el: XmlElement, name: string, namespace?: string | null): void {
        if (namespace) {
            el.removeAttributeNS(namespace, name)
        } else {
            el.removeAttribute(name)
        }
    }
    addClass(el: XmlElement, name: string): void {
        el.classList.add(name);
    }
    removeClass(el: XmlElement, name: string): void {
        el.classList.remove(name);
    }
    setStyle(el: XmlElement, style: string, value: any, flags?: RendererStyleFlags2): void {
        el.style.setProperty(style, value);
    }
    removeStyle(el: XmlElement, style: string, flags?: RendererStyleFlags2): void {
        el.style.removeProperty(style);
    }
    setProperty(el: XmlElement, name: string, value: any): void {
        el.setProperty?.(name, value);
    }
    setValue(node: XmlText | XmlComment, value: string): void {
        node.textContent = value;
    }

}

const htmlParsingOptions = {
    ignoreAttributes: false,
    preserveOrder: true,
    unpairedTags: ["hr", "br", "link", "meta"],
    stopNodes: ["*.pre", "*.script"],
    processEntities: true,
    htmlEntities: true,
    allowBooleanAttributes: true
};

// const htmlBuilderOptions = {
//     ignoreAttributes: false,
//     format: true,
//     preserveOrder: true,
//     suppressEmptyNode: true,
//     unpairedTags: ["hr", "br", "link", "meta"],
//     stopNodes: ["*.pre", "*.script"],
// }

// XML模板解析器实现示例
@Injectable()
export class XmlTemplateParser implements TemplateParser {
    [noReact] = true;

    constructor(
        private renderer: XmlRenderer
    ) { }

    parse(template: string): XmlNode[] {
        const parser = new XMLParser(htmlParsingOptions);
        const jsonObj = parser.parse(template);
        // 将JSON对象转换为虚拟DOM节点
        return this.convertToNodes(jsonObj);
    }



    private convertToNodes(jsonObj: any): XmlNode[] {
        // 实现JSON到节点的转换逻辑
        // Handle text nodes
        if (typeof jsonObj === 'string') {
            const textNode = this.renderer.createText(jsonObj);
            return [textNode];
        }

        // 处理数组节点
        if (Array.isArray(jsonObj)) {
            return jsonObj.flatMap(item => this.convertToNodes(item));
        }

        // 处理对象节点
        if (jsonObj && typeof jsonObj === 'object') {
            const keys = Object.keys(jsonObj);
            if (keys.length == 1) {
                if (keys[0] == '#text') {
                    return [this.renderer.createText(jsonObj['#text'])]
                } else if (keys[0] === '#comment') {
                    return [this.renderer.createComment(jsonObj['#comment'])]
                }
            }
            // 提取标签名和属性
            const tagName = keys.find(key => !key.startsWith('@_') && !key.startsWith('#') && !key.startsWith(':@') && !key.startsWith('v-')) ?? 'unkonw';
            const node = this.renderer.createElement(tagName);

            // 处理子节点
            const childNodes: any[] = [];

            // 设置属性
            for (const key of keys) {
                const datan = jsonObj[key];
                if (key.startsWith('@_')) {
                    node.setAttribute(key.slice(2), datan);
                } else if (key.startsWith('#')) {
                    node.setAttribute(key.slice(1), datan);
                } else if (key === ':@') {
                    for (const attr in datan) {
                        if (attr.startsWith('@_')) {
                            node.setAttribute(attr.slice(2), datan[attr]);
                        } else if (attr.startsWith('#')) {
                            node.setAttribute(attr.slice(1), datan[attr]);
                        } else {
                            // 添加else分支处理普通指令属性
                            node.setAttribute(attr, datan[attr]);
                        }
                    }
                } else if (key.startsWith('v-')) {
                    // 处理v-开头的指令属性
                    node.setAttribute(key, datan);
                } else {
                    childNodes.push(datan);
                }
            }

            // // 处理文本内容
            // if ('#text' in jsonObj) {
            //     node.textContent = jsonObj['#text'];
            // }

            // 递归转换子节点
            node.childNodes = childNodes.flatMap(child => this.convertToNodes(child));
            // 设置父节点引用
            node.childNodes.forEach(child => child.parentNode = node);

            return [node];
        }

        // Handle other node types
        return [];
    }
}


const xmlDefaultOptions = {
    delimiters: ['{{', '}}'],
} as TemplateCompilerOptions;

export const XML_COMPILER_OPTIONS = token<TemplateCompilerOptions>('XML_COMPILER_OPTIONS');

@Injectable()
export class XmlTemplateCompiler extends AbstractTemplateCompiler {

    constructor(
        readonly renderer: XmlRenderer,
        readonly parser: XmlTemplateParser,
        @Inject(XML_COMPILER_OPTIONS, { defaultValue: xmlDefaultOptions }) protected options: TemplateCompilerOptions) {
        super()
    }
}


@Module({
    providers: [
        XmlRenderer,
        XmlTemplateParser,
        XmlTemplateCompiler,
        { provide: Renderer, useClass: XmlRenderer, asDefault: true },
        { provide: TemplateParser, useClass: XmlTemplateParser, asDefault: true },
        { provide: TemplateCompiler, useClass: XmlTemplateCompiler, asDefault: true }
    ]
})
export class XmlTemplateModule {
    static withOptions(options: TemplateCompilerOptions): ModuleWithProviders<XmlTemplateModule> {
        return {
            module: XmlTemplateModule,
            providers: [
                { provide: XML_COMPILER_OPTIONS, useValue: options }
            ]
        }
    }
}