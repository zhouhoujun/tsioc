import { Inject, Injectable, InvocationContext, lang, Module, ModuleWithProviders, tokenId } from '@tsdi/ioc';
import { XMLParser } from 'fast-xml-parser';
import {
    TemplateParser, AbstractTemplateCompiler, ReactiveEffect, Renderer, RendererStyleFlags2,
    RComment, RElement, RNode, RText, NodeType, RCssStyleDeclaration, RDomTokenList, RAttr,
    TemplateCompiler, TemplateCompilerOptions
} from '@tsdi/components';
import { EventEmitter } from 'events';




export class XmlNode implements RNode {

    get parentElement(): XmlElement | null {
        return this.parentNode instanceof XmlElement ? this.parentNode : null;
    }

    constructor(
        readonly nodeType: number,
        public textContent: string | null = null,
        public parentNode: XmlElement | null = null,
        public childNodes: XmlNode[] = [],
        public nextSibling: XmlNode | null = null) {

    }

    removeChild(oldChild: XmlNode): XmlNode {
        const [removed] = lang.remove(this.childNodes, oldChild) ?? [];
        return removed;
    }

    insertBefore(newChild: XmlNode, refChild: XmlNode | null, isViewRoot?: boolean): void {
        const index = refChild ? this.childNodes.indexOf(refChild) : 0;
        if (index !== -1) {
            this.childNodes.splice(index, 0, newChild);
        } else {
            this.childNodes.push(newChild);
        }
    }
    appendChild(newChild: XmlNode): XmlNode {
        this.childNodes.push(newChild);
        return this;
    }

    querySelector(selector: string): XmlNode | null {
        return null;
    }
    querySelectorAll(selector: string): XmlNode[] | null {
        return null;
    }
}

export class XmlText extends XmlNode implements RText {
    constructor(text: string) {
        super(NodeType.Text, text)
    }
}

export class XmlComment extends XmlNode implements RComment {
    constructor(text: string) {
        super(NodeType.Comment, text)
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

export class XmlElement extends XmlNode implements RElement {
    private events = new EventEmitter();
    firstChild: RNode | null = null;
    style = new XmlCssStyleDeclaration();
    classList = new XmlDomTokenList();
    attributes = new Map<string, RAttr>();
    constructor(
        readonly tagName: string,
        readonly className: string = '',
        nodeType: number = NodeType.Element,
        parentNode: XmlElement | null = null,
        childNodes: XmlNode[] = [],
        nextSibling: XmlNode | null = null,
        textContent: string | null = null) {
        super(nodeType, textContent, parentNode, childNodes, nextSibling)

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
export class XmlRenderer implements Renderer {
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
        parent?.removeChild(oldChild)
    }
    selectRootElement(selectorOrNode: string | any, preserveContent?: boolean): XmlElement {
        throw new Error('Method not implemented.');
    }
    parentNode(node: XmlNode): XmlElement | null {
        return node.parentElement
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

    constructor(
        private renderer: XmlRenderer
    ) { }

    parse(template: string, environument: InvocationContext): XmlNode[] {
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
            const tagName = keys.find(key => !key.startsWith('@_') && !key.startsWith('#') && !key.startsWith(':@')) ?? 'unkonw';
            const node = this.renderer.createElement(tagName);

            // 处理子节点
            const childNodes: any[] = [];

            // 设置属性
            for (const key of keys) {
                const datan = jsonObj[key];
                if (key.startsWith('@_') || key.startsWith('#')) {
                    node.setAttribute(key.slice(2), datan);
                } else if (key === ':@') {
                    for (const attr in datan) {
                        if (attr.startsWith('@_') || attr.startsWith('#')) {
                            node.setAttribute(attr.slice(2), datan[attr]);
                        }
                    }
                } else {
                    childNodes.push(datan);
                }
            }

            // 处理文本内容
            if ('#text' in jsonObj) {
                node.textContent = jsonObj['#text'];
            }

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

export const XML_COMPILER_OPTIONS = tokenId<TemplateCompilerOptions>('XML_COMPILER_OPTIONS');

@Injectable()
export class XmlTemplateCompiler extends AbstractTemplateCompiler {

    constructor(
        readonly effect: ReactiveEffect,
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