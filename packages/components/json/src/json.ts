import { Empty, Inject, Injectable, InvocationContext, isArray, lang, Module, ModuleWithProviders, tokenId } from '@tsdi/ioc';
import { 
    TemplateParser,AbstractTemplateCompiler, ReactiveEffect, Renderer, RendererStyleFlags2,
    RComment, RElement, RNode, RText, NodeType, RCssStyleDeclaration, RDomTokenList, RAttr,
    TemplateCompiler, TemplateCompilerOptions 
 } from '@tsdi/components';
import { EventEmitter } from 'events';



export class JsonNode implements RNode {

    get parentElement(): JsonElement | null {
        return this.parentNode instanceof JsonElement ? this.parentNode : null;
    }

    constructor(
        readonly nodeType: number,
        public textContent: string | null = null,
        public parentNode: JsonElement | null = null,
        readonly childNodes: JsonNode[] = [],
        public nextSibling: JsonNode | null = null) {

    }

    removeChild(oldChild: JsonNode): JsonNode {
        const [removed] = lang.remove(this.childNodes, oldChild) ?? Empty;
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
}

export class JsonText extends JsonNode implements RText {
    constructor(text: string) {
        super(NodeType.Text, text)
    }
}

export class JsonComment extends JsonNode implements RComment {
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
        childNodes: JsonNode[] = [],
        nextSibling: JsonNode | null = null,
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
        this.attributes.set(`${name}:${namespace}`, { name, namespace, value});
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


// XML模板解析器实现示例
@Injectable()
export class JsonTemplateParser implements TemplateParser {
    constructor(
        private renderer: JsonRenderer
    ) { }

    parse(template: string, environument: InvocationContext): JsonNode[] {
        const jsonObj = JSON.parse(template);
        // 将JSON对象转换为虚拟DOM节点
        return this.convertToNodes(jsonObj);
    }

    private convertToNodes(jsonObj: any): JsonNode[] {
        // 实现JSON到节点的转换逻辑
        // ...
        return isArray(jsonObj) ? jsonObj : [jsonObj];
    }
}

export const JSON_COMPILER_OPTIONS = tokenId<TemplateCompilerOptions>('JSON_COMPILER_OPTIONS');

const jsonDefaultOptions = {
    delimiters: ['{{', '}}'],
} as TemplateCompilerOptions;

@Injectable()
export class JsonTemplateCompiler extends AbstractTemplateCompiler {

    constructor(
        readonly effect: ReactiveEffect,
        readonly renderer: JsonRenderer,
        readonly parser: JsonTemplateParser,
        @Inject(JSON_COMPILER_OPTIONS, { defaultValue: jsonDefaultOptions }) protected options: TemplateCompilerOptions) {
        super()
    }
}


@Module({
    providers: [
        JsonRenderer,
        JsonTemplateParser,
        JsonTemplateCompiler,
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
