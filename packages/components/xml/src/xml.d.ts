import { ModuleWithProviders } from '@tsdi/ioc';
import { TemplateParser, Renderer, RendererStyleFlags2, AbstractTemplateCompiler, RComment, RElement, RNode, RText, RCssStyleDeclaration, RDomTokenList, RAttr, TemplateCompilerOptions, noReact } from '@tsdi/components';
import { EventEmitter } from 'events';
export declare class XmlNode implements RNode {
    parentNode: XmlNode | null;
    childNodes: XmlNode[];
    nextSibling: XmlNode | null;
    readonly events: EventEmitter<[never]>;
    get parentElement(): XmlElement | null;
    attributes: Map<string, RAttr>;
    constructor(nodeType: number, parentNode?: XmlNode | null, childNodes?: XmlNode[], nextSibling?: XmlNode | null);
    nodeType: number;
    hasAttributeNS(namespace: string, localName: string): boolean;
    getAttributeNS(namespace: string | null, localName: string): string | null;
    setAttributeNS(namespace: string, name: string, value: string): void;
    removeAttributeNS(namespace: string, localName: string): void;
    hasAttribute(name: string): boolean;
    getAttribute(name: string): string | null;
    setAttribute(name: string, value: string): void;
    removeAttribute(name: string): void;
    removeChild(oldChild: XmlNode): XmlNode;
    replaceChild(newChild: XmlNode, oldChild: XmlNode): XmlNode;
    insertBefore(newChild: XmlNode, refChild: XmlNode | null, isViewRoot?: boolean): void;
    appendChild(newChild: XmlNode): XmlNode;
    querySelector(selector: string): XmlNode | null;
    querySelectorAll(selector: string): XmlNode[] | null;
    addEventListener(type: string, listener: EventListener, useCapture?: boolean): void;
    dispatchEvent(event: Event): boolean;
    removeEventListener(type: string, listener?: EventListener, options?: boolean): void;
}
export declare class XmlText extends XmlNode implements RText {
    textContent: string;
    constructor(textContent: string);
}
export declare class XmlComment extends XmlNode implements RComment {
    textContent: string;
    constructor(textContent: string);
}
export declare class XmlCssStyleDeclaration implements RCssStyleDeclaration {
    private stylies;
    constructor(stylies?: Record<string, string>);
    removeProperty(propertyName: string): string;
    setProperty(propertyName: string, value: string | null, priority?: string): void;
}
export declare class XmlDomTokenList implements RDomTokenList {
    private tokens;
    constructor(tokens?: string[]);
    add(token: string): void;
    remove(token: string): void;
}
export declare class XmlElement extends XmlNode implements RElement {
    readonly tagName: string;
    readonly className: string;
    firstChild: RNode | null;
    style: XmlCssStyleDeclaration;
    classList: XmlDomTokenList;
    constructor(tagName: string, className?: string, nodeType?: number, parentNode?: XmlElement | null, childNodes?: XmlNode[], nextSibling?: XmlNode | null);
    get textContent(): string | null;
    setProperty(name: string, value: any): void;
}
export declare class XmlRenderer implements Renderer {
    [noReact]: boolean;
    destroyNode?: ((node: RNode) => void) | null;
    createComment(value: string): XmlComment;
    createElement(name: string, namespace?: string | null): XmlElement;
    createText(value: string): XmlText;
    appendChild(parent: RElement, newChild: RNode): void;
    insertBefore(parent: XmlNode, newChild: XmlNode, refChild: XmlNode | null): void;
    removeChild(parent: XmlElement | null, oldChild: XmlNode, isHostElement?: boolean): void;
    querySelector(node: XmlNode | XmlNode[], selector: string): XmlNode | null;
    querySelectorAll(node: XmlNode | XmlNode[], selector: string): XmlNode[] | null;
    queryByAttribute(node: XmlNode | XmlNode[], attrName: string, attrValue?: string): XmlNode[] | null;
    queryByTagName(node: XmlNode | XmlNode[], tagName: string): XmlNode[] | null;
    queryByComponent(node: XmlNode | XmlNode[], componentSelector: string): XmlNode[] | null;
    getAncestors(node: XmlNode): XmlNode[];
    getDescendants(node: XmlNode): XmlNode[];
    matchesSelector(node: XmlNode, selector: string): boolean;
    parentNode(node: XmlNode): XmlNode | null;
    nextSibling(node: XmlNode): XmlNode | null;
    setAttribute(el: XmlElement, name: string, value: string, namespace?: string | null): void;
    getAttributes(el: XmlElement): RAttr[];
    removeAttribute(el: XmlElement, name: string, namespace?: string | null): void;
    addClass(el: XmlElement, name: string): void;
    removeClass(el: XmlElement, name: string): void;
    setStyle(el: XmlElement, style: string, value: any, flags?: RendererStyleFlags2): void;
    removeStyle(el: XmlElement, style: string, flags?: RendererStyleFlags2): void;
    setProperty(el: XmlElement, name: string, value: any): void;
    setValue(node: XmlText | XmlComment, value: string): void;
    click(node: XmlNode): void;
}
export declare class XmlTemplateParser implements TemplateParser {
    private renderer;
    [noReact]: boolean;
    constructor(renderer: XmlRenderer);
    parse(template: string): XmlNode[];
    private convertToNodes;
}
export declare const XML_COMPILER_OPTIONS: import("@tsdi/ioc").InjectToken<TemplateCompilerOptions>;
export declare class XmlTemplateCompiler extends AbstractTemplateCompiler {
    readonly renderer: XmlRenderer;
    readonly parser: XmlTemplateParser;
    protected options: TemplateCompilerOptions;
    constructor(renderer: XmlRenderer, parser: XmlTemplateParser, options: TemplateCompilerOptions);
}
export declare class XmlTemplateModule {
    static withOptions(options: TemplateCompilerOptions): ModuleWithProviders<XmlTemplateModule>;
}
