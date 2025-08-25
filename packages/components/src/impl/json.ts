import { TemplateParser } from '../template/parser';
import { RComment, RElement, RNode, RText, NodeType, RCssStyleDeclaration, RDomTokenList, EventListener } from '../renderer/Node';
import { Empty, Inject, Injectable, isArray, lang, Module } from '@tsdi/ioc';
import { EventEmitter } from 'events';
import { AbstractTemplateCompiler } from './compiler';
import { ReactiveEffect } from '../ReactiveEffect';
import { TemplateCompiler, TemplateCompilerOptions } from '../template/compiler';
import { Renderer, RendererStyleFlags2 } from '../renderer/Renderer';


// XML模板解析器实现示例
@Injectable()
export class JsonTemplateParser implements TemplateParser {
    parse(template: string): RNode[] {
        const jsonObj = JSON.parse(template);
        // 将JSON对象转换为虚拟DOM节点
        return this.convertToNodes(jsonObj);
    }

    private convertToNodes(jsonObj: any): RNode[] {
        // 实现JSON到节点的转换逻辑
        // ...
        return isArray(jsonObj) ? jsonObj : [jsonObj];
    }
}

export class JNode implements RNode {

    get parentElement(): JElement | null {
        return this.parentNode instanceof JElement ? this.parentNode : null;
    }

    constructor(
        readonly nodeType: number,
        public textContent: string | null = null,
        public parentNode: JNode | null = null,
        readonly childNodes: JNode[] = [],
        public nextSibling: JNode | null = null) {

    }

    removeChild(oldChild: JNode): JNode {
        const [removed] = lang.remove(this.childNodes, oldChild) ?? Empty;
        return removed;
    }

    insertBefore(newChild: JNode, refChild: JNode | null, isViewRoot?: boolean): void {
        const index = refChild ? this.childNodes.indexOf(refChild) : 0;
        if (index !== -1) {
            this.childNodes.splice(index, 0, newChild);
        } else {
            this.childNodes.push(newChild);
        }
    }
    appendChild(newChild: JNode): JNode {
        this.childNodes.push(newChild);
        return this;
    }
}

export class JText extends JNode implements RText {
    constructor(text: string) {
        super(NodeType.Text, text)
    }
}

export class JComment extends JNode implements RComment {
    constructor(text: string) {
        super(NodeType.Comment, text)
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

export class JElement extends JNode implements RElement {
    private events = new EventEmitter();
    firstChild: RNode | null = null;
    style: RCssStyleDeclaration = new JCssStyleDeclaration();
    classList = new JDomTokenList();
    attributes = new Map<string, any>();
    constructor(
        readonly tagName: string,
        readonly className: string = '',
        nodeType: number = NodeType.Element,
        parentNode: JNode | null = null,
        childNodes: JNode[] = [],
        nextSibling: JNode | null = null,
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
export class JsonRenderer implements Renderer {

    // 创建Json注释节点
    createComment(value: string): RComment {
        return new JComment(value);
    }

    // 创建Json元素节点（支持命名空间）
    createElement(name: string, namespace?: string | null): JElement {
        const element = new JElement(name);
        if (namespace) {
            element.setAttributeNS(namespace, name, namespace);
        }
        return element;
    }

    // 创建Json文本节点
    createText(value: string): RText {
        return new JText(value);
    }

    // 实现节点.appendChild
    appendChild(parent: JElement, newChild: JNode): void {
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
    insertBefore(parent: JNode, newChild: JNode, refChild: JNode | null): void {
        parent.insertBefore(newChild, refChild);
    }

    removeChild(parent: JElement | null, oldChild: JNode, isHostElement?: boolean): void {
        parent?.removeChild(oldChild)
    }
    selectRootElement(selectorOrNode: string | any, preserveContent?: boolean): JElement {
        throw new Error('Method not implemented.');
    }
    parentNode(node: JNode): JElement | null {
        return node.parentElement
    }
    nextSibling(node: JNode): JNode | null {
        return node.nextSibling;
    }
    setAttribute(el: JElement, name: string, value: string, namespace?: string | null): void {
        if (namespace) {
            el.setAttributeNS(namespace, name, value)
        } else {
            el.setAttribute(name, value)
        }
    }
    removeAttribute(el: JElement, name: string, namespace?: string | null): void {
        if (namespace) {
            el.setAttributeNS(namespace, name, '')
        } else {
            el.removeAttribute(name)
        }
    }
    addClass(el: JElement, name: string): void {
        el.classList.add(name);
    }
    removeClass(el: JElement, name: string): void {
        el.classList.remove(name);
    }
    setStyle(el: JElement, style: string, value: any, flags?: RendererStyleFlags2): void {
        el.style.setProperty(style, value);
    }
    removeStyle(el: JElement, style: string, flags?: RendererStyleFlags2): void {
        el.style.removeProperty(style);
    }
    setProperty(el: JElement, name: string, value: any): void {
        el.setProperty?.(name, value);
    }
    setValue(node: JText | JComment, value: string): void {
        node.textContent = value;
    }

}

@Injectable()
export class JsonTemplateCompiler extends AbstractTemplateCompiler {

    constructor(
        readonly effect: ReactiveEffect,
        readonly renderer: JsonRenderer,
        readonly parser: JsonTemplateParser,
        protected options: TemplateCompilerOptions = {}) {
        super()
    }
}


@Module({
    providers: [
        JsonTemplateCompiler,
        JsonTemplateParser,
        JsonRenderer,
        { provide: TemplateCompiler, useClass: JsonTemplateCompiler, asDefault: true }
    ]
})
export class JsonTemplateModule {

}