export const containerTag = 'v-container';
export const contentTag = 'v-content';
export const templateTag = 'v-template';

export const SVG_NAMESPACE = 'svg';
export const SVG_NAMESPACE_URI = 'http://www.w3.org/2000/svg';
export const MATH_ML_NAMESPACE = 'math';
export const MATH_ML_NAMESPACE_URI = 'http://www.w3.org/1998/MathML/';

export function getNamespaceUri(namespace: string): string | null {
    const name = namespace.toLowerCase();
    return name === SVG_NAMESPACE ? SVG_NAMESPACE_URI :
        (name === MATH_ML_NAMESPACE ? MATH_ML_NAMESPACE_URI : null);
}


/**
 * Subset of API needed for appending elements and text nodes.
 */
export interface INode {
    /**
     * Returns the parent Element, Document, or DocumentFragment
     */
    parentNode: INode | null;
    /**
     * Returns the parent Element if there is one
     */
    parentElement: IElement | null;
    /**
     * Gets the Node immediately following this one in the parent's childNodes
     */
    nextSibling: INode | null;
    /**
     * Removes a child from the current node and returns the removed node
     * @param oldChild the child node to remove
     */
    removeChild(oldChild: INode): INode;
    /**
     * Insert a child node.
     *
     * Used exclusively for adding View root nodes into ViewAnchor location.
     */
    insertBefore(newChild: INode, refChild: INode | null, isViewRoot: boolean): void;
    /**
     * Append a child node.
     *
     * Used exclusively for building up DOM which are static (ie not View roots)
     */
    appendChild(newChild: INode): INode;
}


/**
 * Subset of API needed for writing attributes, properties, and setting up
 * listeners on Element.
 */
export interface IElement extends INode {
    style: ICssStyleDeclaration;
    classList: IDomTokenList;
    className: string;
    textContent?: string;
    setAttribute(name: string, value: string): void;
    removeAttribute(name: string): void;
    setAttributeNS(namespaceURI: string, qualifiedName: string, value: string): void;
    addEventListener(type: string, listener: EventListener, useCapture?: boolean): void;
    removeEventListener(type: string, listener?: EventListener, options?: boolean): void;

    setProperty?(name: string, value: any): void;
}


export interface IText extends INode {
    textContent?: string;
}

export interface IComment extends INode {
    textContent?: string;
}

export interface IDomTokenList {
    add(token: string): void;
    remove(token: string): void;
}

export interface ICssStyleDeclaration {
    removeProperty(propertyName: string): string;
    setProperty(propertyName: string, value?: string, priority?: string): void;
}
