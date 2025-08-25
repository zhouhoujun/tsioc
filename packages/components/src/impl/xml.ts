import { XMLParser } from 'fast-xml-parser';
import { TemplateParser } from '../template/parser';
import { RComment, RElement, RNode, RText, NodeType, RCssStyleDeclaration, RDomTokenList } from '../renderer/Node';
import { Empty, Inject, Injectable, isArray, lang, Module, ModuleWithProviders } from '@tsdi/ioc';
import { EventEmitter } from 'events';
import { AbstractTemplateCompiler } from './compiler';
import { ReactiveEffect } from '../ReactiveEffect';
import { COMPILER_OPTIONS, TemplateCompiler, TemplateCompilerOptions } from '../template/compiler';
import { Renderer, RendererStyleFlags2 } from '../renderer/Renderer';


// XML模板解析器实现示例
@Injectable()
export class XmlTemplateParser implements TemplateParser {
    parse(template: string): RNode[] {
        const parser = new XMLParser();
        const jsonObj = parser.parse(template);
        // 将JSON对象转换为虚拟DOM节点
        return this.convertToNodes(jsonObj);
    }

    private convertToNodes(jsonObj: any): XmlNode[] {
        // 实现JSON到节点的转换逻辑
        // ...
        return isArray(jsonObj) ? jsonObj : [jsonObj];
    }
}



export class XmlNode implements RNode {

    get parentElement(): XmlElement | null {
        return this.parentNode instanceof XmlElement ? this.parentNode : null;
    }

    constructor(
        readonly nodeType: number,
        public textContent: string | null = null,
        public parentNode: XmlNode | null = null,
        readonly childNodes: XmlNode[] = [],
        public nextSibling: XmlNode | null = null) {

    }

    removeChild(oldChild: XmlNode): XmlNode {
        const [removed] = lang.remove(this.childNodes, oldChild) ?? Empty;
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
    attributes = new Map<string, any>();
    constructor(
        readonly tagName: string,
        readonly className: string = '',
        nodeType: number = NodeType.Element,
        parentNode: XmlNode | null = null,
        childNodes: XmlNode[] = [],
        nextSibling: XmlNode | null = null,
        textContent: string | null = null) {
        super(nodeType, textContent, parentNode, childNodes, nextSibling)

    }



    getAttributeNames(): string[] {
        return Array.from(this.attributes.keys());
    }
    hasAttribute(name: string): boolean {
        return this.attributes.has(name)
    }
    getAttribute(name: string): string | null {
        return this.attributes.get(name) ?? null
    }
    setAttribute(name: string, value: string): void {
        this.attributes.set(name, value);
    }
    removeAttribute(name: string): void {
        this.attributes.delete(name)
    }
    setAttributeNS(namespaceURI: string, qualifiedName: string, value: string): void {
        if (value) {
            this.attributes.set(`${qualifiedName}:${namespaceURI}`, value);
        } else {
            this.removeAttribute(`${qualifiedName}:${namespaceURI}`)
        }
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
    createComment(value: string): RComment {
        return new XmlComment(value);
    }

    // 创建XML元素节点（支持命名空间）
    createElement(name: string, namespace?: string | null): RElement {
        const element = new XmlElement(name);
        if (namespace) {
            element.setAttributeNS(namespace, name, namespace);
        }
        return element;
    }

    // 创建XML文本节点
    createText(value: string): RText {
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
    removeAttribute(el: XmlElement, name: string, namespace?: string | null): void {
        if (namespace) {
            el.setAttributeNS(namespace, name, '')
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

const xmlDefaultOptions = {
    delimiters: ['{{', '}}'],
    directives: {
        'text': XmlText,
        'comment': XmlComment,
        'element': XmlElement,
    }
} as TemplateCompilerOptions;

@Injectable()
export class XmlTemplateCompiler extends AbstractTemplateCompiler {

    constructor(
        readonly effect: ReactiveEffect,
        readonly renderer: XmlRenderer,
        readonly parser: XmlTemplateParser,
        @Inject(COMPILER_OPTIONS, { defaultValue: xmlDefaultOptions }) protected options: TemplateCompilerOptions) {
        super()
    }
}


@Module({
    providers: [
        XmlTemplateCompiler,
        XmlTemplateParser,
        XmlRenderer,
        { provide: TemplateCompiler, useClass: XmlTemplateCompiler, asDefault: true }
    ]
})
export class XmlTemplateModule {
    static withOptions(options: TemplateCompilerOptions): ModuleWithProviders<XmlTemplateModule> {
        return {
            module: XmlTemplateModule,
            providers: [
                { provide: COMPILER_OPTIONS, useValue: options }
            ]
        }
    }
}