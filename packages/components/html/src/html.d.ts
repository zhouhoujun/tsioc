import { ModuleWithProviders } from '@tsdi/ioc';
import { TemplateParser, Renderer, RendererStyleFlags2, AbstractTemplateCompiler, RComment, RElement, RNode, RText, RAttr, TemplateCompilerOptions, noReact } from '@tsdi/components';
export declare class HtmlRenderer implements Renderer {
    private platformId;
    private document;
    [noReact]: boolean;
    destroyNode?: ((node: RNode) => void) | null;
    constructor(doc: Object | null, platformId: Object | null);
    createComment(value: string): RComment;
    createElement(name: string, namespace?: string | null): RElement;
    createText(value: string): RText;
    appendChild(parent: RNode, newChild: RNode): void;
    insertBefore(parent: RNode, newChild: RNode, refChild: RNode | null): void;
    removeChild(parent: RNode | null, oldChild: RNode, isHostElement?: boolean): void;
    querySelector(node: RNode | RNode[], selector: string): RNode | null;
    querySelectorAll(node: RNode | RNode[], selector: string): RNode[] | null;
    queryByAttribute(node: RNode | RNode[], attrName: string, attrValue?: string): RNode[] | null;
    queryByTagName(node: RNode | RNode[], tagName: string): RNode[] | null;
    queryByComponent(node: RNode | RNode[], componentSelector: string): RNode[] | null;
    getAncestors(node: RNode): RNode[];
    getDescendants(node: RNode): RNode[];
    matchesSelector(node: RNode, selector: string): boolean;
    parentNode(node: RNode): RNode | null;
    nextSibling(node: RNode): RNode | null;
    setAttribute(el: RNode, name: string, value: string, namespace?: string | null): void;
    getAttributes(el: RNode): RAttr[];
    removeAttribute(el: RNode, name: string, namespace?: string | null): void;
    addClass(el: RNode, name: string): void;
    removeClass(el: RNode, name: string): void;
    setStyle(el: RNode, style: string, value: any, flags?: RendererStyleFlags2): void;
    removeStyle(el: RNode, style: string, flags?: RendererStyleFlags2): void;
    setProperty(el: RNode, name: string, value: any): void;
    setValue(node: RNode, value: string): void;
    click(node: RNode): void;
}
export declare class HtmlTemplateParser implements TemplateParser {
    private renderer;
    [noReact]: boolean;
    constructor(renderer: HtmlRenderer);
    parse(template: string): RNode[];
}
export declare const HTML_COMPILER_OPTIONS: import("@tsdi/ioc").InjectToken<TemplateCompilerOptions>;
export declare class HtmlTemplateCompiler extends AbstractTemplateCompiler {
    readonly renderer: HtmlRenderer;
    readonly parser: HtmlTemplateParser;
    protected options: TemplateCompilerOptions;
    constructor(renderer: HtmlRenderer, parser: HtmlTemplateParser, options: TemplateCompilerOptions);
}
export declare class HtmlTemplateModule {
    static withOptions(options: TemplateCompilerOptions): ModuleWithProviders<HtmlTemplateModule>;
}
