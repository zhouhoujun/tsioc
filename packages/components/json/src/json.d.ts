import { ModuleWithProviders } from '@tsdi/ioc';
import { TemplateParser, Renderer, RendererStyleFlags2, AbstractTemplateCompiler, RComment, RElement, RNode, RText, RCssStyleDeclaration, RDomTokenList, RAttr, TemplateCompilerOptions, noReact } from '@tsdi/components';
export declare class JsonNode implements RNode {
    readonly nodeType: number;
    parentNode: JsonNode | null;
    childNodes: JsonNode[];
    nextSibling: JsonNode | null;
    private events;
    tagName?: string;
    get parentElement(): JsonElement | null;
    attributes: Map<string, any>;
    constructor(nodeType: number, parentNode?: JsonNode | null, childNodes?: JsonNode[], nextSibling?: JsonNode | null);
    hasAttributeNS(namespace: string, localName: string): boolean;
    getAttributeNS(namespace: string | null, localName: string): string | null;
    setAttributeNS(namespace: string, name: string, value: string): void;
    removeAttributeNS(namespace: string, localName: string): void;
    hasAttribute(name: string): boolean;
    getAttribute(name: string): any | null;
    setAttribute(name: string, value: any): void;
    removeAttribute(name: string): void;
    removeChild(oldChild: JsonNode): JsonNode;
    replaceChild(newChild: JsonNode, oldChild: JsonNode): JsonNode;
    insertBefore(newChild: JsonNode, refChild: JsonNode | null, isViewRoot?: boolean): void;
    appendChild(newChild: JsonNode): JsonNode;
    querySelector(selector: string): JsonNode | null;
    querySelectorAll(selector: string): JsonNode[] | null;
    addEventListener(type: string, listener: EventListener, useCapture?: boolean): void;
    dispatchEvent(event: Event): boolean;
    removeEventListener(type: string, listener?: EventListener, options?: boolean): void;
}
export declare class JsonText extends JsonNode implements RText {
    textContent: string;
    constructor(textContent: string);
}
export declare class JsonComment extends JsonNode implements RComment {
    textContent: string;
    constructor(textContent: string);
}
export declare class JCssStyleDeclaration implements RCssStyleDeclaration {
    private stylies;
    constructor(stylies?: Record<string, string>);
    removeProperty(propertyName: string): string;
    setProperty(propertyName: string, value: string | null, priority?: string): void;
}
export declare class JDomTokenList implements RDomTokenList {
    private tokens;
    constructor(tokens?: string[]);
    add(token: string): void;
    remove(token: string): void;
}
export declare class JsonElement extends JsonNode implements RElement {
    readonly tagName: string;
    readonly className: string;
    readonly childNodes: JsonNode[];
    firstChild: RNode | null;
    style: RCssStyleDeclaration;
    classList: JDomTokenList;
    constructor(tagName: string, className?: string, nodeType?: number, parentNode?: JsonElement | null, childNodes?: JsonNode[], nextSibling?: JsonNode | null);
    get textContent(): string | null;
    setProperty(name: string, value: any): void;
}
export declare class JsonRenderer implements Renderer {
    [noReact]: boolean;
    destroyNode?: ((node: RNode) => void) | null | undefined;
    createComment(value: string): JsonComment;
    createElement(name: string, namespace?: string | null): JsonElement;
    createText(value: string): JsonText;
    appendChild(parent: JsonElement, newChild: JsonNode): void;
    insertBefore(parent: JsonNode, newChild: JsonNode, refChild: JsonNode | null): void;
    removeChild(parent: JsonElement | null, oldChild: JsonNode, isHostElement?: boolean): void;
    querySelector(node: JsonNode | JsonNode[], selector: string): JsonNode | null;
    querySelectorAll(node: JsonNode | JsonNode[], selector: string): JsonNode[] | null;
    parentNode(node: JsonNode): JsonNode | null;
    nextSibling(node: JsonNode): JsonNode | null;
    setAttribute(el: JsonElement, name: string, value: string, namespace?: string | null): void;
    getAttributes(el: JsonElement): RAttr[];
    removeAttribute(el: JsonElement, name: string, namespace?: string | null): void;
    addClass(el: JsonElement, name: string): void;
    removeClass(el: JsonElement, name: string): void;
    setStyle(el: JsonElement, style: string, value: any, flags?: RendererStyleFlags2): void;
    removeStyle(el: JsonElement, style: string, flags?: RendererStyleFlags2): void;
    setProperty(el: JsonElement, name: string, value: any): void;
    setValue(node: JsonText | JsonComment, value: string): void;
    click(node: JsonNode): void;
}
export declare class JsonTemplateParser implements TemplateParser<Object | string> {
    private renderer;
    [noReact]: boolean;
    constructor(renderer: JsonRenderer);
    parse(template: Object | string): JsonNode[];
    private convertToNodes;
}
export declare const JSON_COMPILER_OPTIONS: import("@tsdi/ioc").InjectToken<TemplateCompilerOptions>;
export declare class JsonTemplateCompiler extends AbstractTemplateCompiler {
    readonly parser: JsonTemplateParser;
    readonly renderer: JsonRenderer;
    protected options: TemplateCompilerOptions;
    constructor(parser: JsonTemplateParser, renderer: JsonRenderer, options: TemplateCompilerOptions);
}
export declare class JsonTemplateModule {
    static withOptions(options: TemplateCompilerOptions): ModuleWithProviders<JsonTemplateModule>;
}
