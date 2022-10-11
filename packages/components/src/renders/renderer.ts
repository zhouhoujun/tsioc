import { RendererStyleFlags } from '../type';
import { IComment, IElement, INode, IText } from '../interfaces/dom';

/**
 * custom renderer
 */
export interface ObjectOrientedRenderer {
    createComment(data: string): IComment;
    createElement(tagName: string): IElement;
    createElementNS(namespace: string, tagName: string): IElement;
    createTextNode(data: string): IText;
    querySelector(selectors: string): IElement;
}

/**
 * Procedural style of API needed to create elements and text nodes.
 *
 * In non-native browser environments (e.g. platforms such as web-workers), this is the
 * facade that enables element manipulation. This also facilitates backwards compatibility
 * with Renderer2.
 */
export interface ProceduralRenderer {
    destroy(): void;
    createComment(value: string): IComment;
    createElement(name: string, namespace?: string | null): IElement;
    createText(value: string): IText;
    /**
     * This property is allowed to be null / undefined,
     * in which case the view engine won't call it.
     * This is used as a performance optimization for production mode.
     */
    destroyNode?: ((node: INode) => void) | null;
    appendChild(parent: IElement, newChild: INode): void;
    insertBefore(parent: INode, newChild: INode, refChild: INode | null, isMove?: boolean): void;
    removeChild(parent: IElement, oldChild: INode, isHostElement?: boolean): void;
    selectRootElement(selectorOrNode: string | any, preserveContent?: boolean): IElement;

    parentNode(node: INode): IElement | null;
    nextSibling(node: INode): INode | null;

    setAttribute(
        el: IElement, name: string, value: string,
        namespace?: string | null): void;
    removeAttribute(el: IElement, name: string, namespace?: string | null): void;
    addClass(el: IElement, name: string): void;
    removeClass(el: IElement, name: string): void;
    setStyle(
        el: IElement, style: string, value: any,
        flags?: RendererStyleFlags): void;
    removeStyle(el: IElement, style: string, flags?: RendererStyleFlags): void;
    setProperty(el: IElement, name: string, value: any): void;
    setValue(node: IText | IComment, value: string): void;

    // TODO(misko): Deprecate in favor of addEventListener/removeEventListener
    listen(
        target: string | INode, eventName: string,
        callback: (event: any) => boolean | void): () => void;
}


export type Renderer = ObjectOrientedRenderer | ProceduralRenderer;

export function isProceduralRenderer(renderer: Renderer): renderer is ProceduralRenderer {
    return !!((renderer as any).listen);
}

export interface RendererFactory {
    /**
     * create and initializes a custom renderer.
     * @param hostElement 
     * @param type 
     */
    create(hostElement?: IElement, type?: string): Renderer;
    /**
     * A callback invoked when rendering has begun.
     */
    begin?(): void;
    /**
     * A callback invoked when rendering has completed.
     */
    end?(): void;
}