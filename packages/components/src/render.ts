
export enum RendererStyleFlags {
    /**
     * Marks a style as important.
     */
    Important = 1 << 0,
    /**
     * Marks a style as using dash case naming (this-is-dash-case).
     */
    DashCase = 1 << 1
}

export type GlobalTargetName = 'document' | 'window' | 'body';

export interface Renderer {
    createComment(data: string): RComment;
    createElement(tagName: string): RElement;
    createElementNS(namespace: string, tagName: string): RElement;
    createTextNode(data: string): RText;

    querySelector(selectors: string): RElement | null;
}

/**
 * Procedural style of API needed to create elements and text nodes.
 *
 * In non-native browser environments (e.g. platforms such as web-workers), this is the
 * facade that enables element manipulation.
 */
export interface ProceduralRenderer {
    destroy(): void;
    createComment(value: string): RComment;
    createElement(name: string, namespace?: string | null): RElement;
    createText(value: string): RText;
    /**
     * This property is allowed to be null / undefined,
     * in which case the view engine won't call it.
     * This is used as a performance optimization for production mode.
     */
    destroyNode?: ((node: RNode) => void) | null;
    appendChild(parent: RElement, newChild: RNode): void;
    insertBefore(parent: RNode, newChild: RNode, refChild: RNode | null, isMove?: boolean): void;
    removeChild(parent: RElement, oldChild: RNode, isHostElement?: boolean): void;
    selectRootElement(selectorOrNode: string | any, preserveContent?: boolean): RElement;

    parentNode(node: RNode): RElement | null;
    nextSibling(node: RNode): RNode | null;

    setAttribute(el: RElement, name: string, value: string, namespace?: string | null): void;
    removeAttribute(el: RElement, name: string, namespace?: string | null): void;
    addClass(el: RElement, name: string): void;
    removeClass(el: RElement, name: string): void;
    setStyle(el: RElement, style: string, value: any, flags?: RendererStyleFlags): void;
    removeStyle(el: RElement, style: string, flags?: RendererStyleFlags): void;
    setProperty(el: RElement, name: string, value: any): void;
    setValue(node: RText | RComment, value: string): void;

    // TODO(misko): Deprecate in favor of addEventListener/removeEventListener
    listen(
        target: GlobalTargetName | RNode, eventName: string,
        callback: (event: any) => boolean | void): () => void;
}


/** Subset of API needed for appending elements and text nodes. */
export interface RNode {
    /**
     * Returns the parent Element, Document, or DocumentFragment
     */
    parentNode: RNode | null;


    /**
     * Returns the parent Element if there is one
     */
    parentElement: RElement | null;

    /**
     * Gets the Node immediately following this one in the parent's childNodes
     */
    nextSibling: RNode | null;

    /**
     * Removes a child from the current node and returns the removed node
     * @param oldChild the child node to remove
     */
    removeChild(oldChild: RNode): RNode;

    /**
     * Insert a child node.
     *
     * Used exclusively for adding View root nodes into ViewAnchor location.
     */
    insertBefore(newChild: RNode, refChild: RNode | null, isViewRoot: boolean): void;

    /**
     * Append a child node.
     *
     * Used exclusively for building up DOM which are static (ie not View roots)
     */
    appendChild(newChild: RNode): RNode;
}

/**
 * Subset of API needed for writing attributes, properties, and setting up
 * listeners on Element.
 */
export interface RElement extends RNode {
    style: RCssStyleDeclaration;
    classList: RDomTokenList;
    className: string;
    textContent: string | null;
    setAttribute(name: string, value: string): void;
    removeAttribute(name: string): void;
    setAttributeNS(
        namespaceURI: string, qualifiedName: string,
        value: string): void;
    addEventListener(type: string, listener: EventListener, useCapture?: boolean): void;
    removeEventListener(type: string, listener?: EventListener, options?: boolean): void;

    setProperty?(name: string, value: any): void;
}

export interface RCssStyleDeclaration {
    removeProperty(propertyName: string): string;
    setProperty(propertyName: string, value: string | null, priority?: string): void;
}

export interface RDomTokenList {
    add(token: string): void;
    remove(token: string): void;
}

export interface RText extends RNode {
    textContent: string | null;
}

export interface RComment extends RNode {
    textContent: string | null;
}
