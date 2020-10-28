
export const containerTag =  'v-container';
export const contentTag =  'v-content';
export const templateTag =  'v-template';

export const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
export const MATH_ML_NAMESPACE = 'http://www.w3.org/1998/MathML/';


/**
 * Subset of API needed for appending elements and text nodes.
 */
export interface VNode {
    /**
     * Returns the parent Element, Document, or DocumentFragment
     */
    parentNode: VNode | null;
    /**
     * Returns the parent Element if there is one
     */
    parentElement: VElement | null;
    /**
     * Gets the Node immediately following this one in the parent's childNodes
     */
    nextSibling: VNode | null;
    /**
     * Removes a child from the current node and returns the removed node
     * @param oldChild the child node to remove
     */
    removeChild(oldChild: VNode): VNode;
    /**
     * Insert a child node.
     *
     * Used exclusively for adding View root nodes into ViewAnchor location.
     */
    insertBefore(newChild: VNode, refChild: VNode | null, isViewRoot: boolean): void;
    /**
     * Append a child node.
     *
     * Used exclusively for building up DOM which are static (ie not View roots)
     */
    appendChild(newChild: VNode): VNode;
}


/**
 * Subset of API needed for writing attributes, properties, and setting up
 * listeners on Element.
 */
export interface VElement extends VNode {
    style: VCssStyleDeclaration;
    classList: VDomTokenList;
    className: string;
    textContent: string | null;
    setAttribute(name: string, value: string): void;
    removeAttribute(name: string): void;
    setAttributeNS(namespaceURI: string, qualifiedName: string, value: string): void;
    addEventListener(type: string, listener: EventListener, useCapture?: boolean): void;
    removeEventListener(type: string, listener?: EventListener, options?: boolean): void;

    setProperty?(name: string, value: any): void;
}


export interface VText extends VNode {
    textContent: string | null;
}

export interface VComment extends VNode {
    textContent: string | null;
}

export interface VDomTokenList {
    add(token: string): void;
    remove(token: string): void;
}


export interface VCssStyleDeclaration {
    removeProperty(propertyName: string): string;
    setProperty(propertyName: string, value: string | null, priority?: string): void;
}
