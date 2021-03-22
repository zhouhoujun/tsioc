
export const containerTag = 'v-container';
export const contentTag = 'v-content';
export const templateTag = 'v-template';

export const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
export const MATH_ML_NAMESPACE = 'http://www.w3.org/1998/MathML/';


/**
 * Subset of API needed for appending elements and text nodes.
 */
export interface INode {
    /**
     * Returns the parent Element, Document, or DocumentFragment
     */
    parentNode?: INode;
    /**
     * Returns the parent Element if there is one
     */
    parentElement?: IElement;
    /**
     * Gets the Node immediately following this one in the parent's childNodes
     */
    nextSibling?: INode;
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
    textContent: string | null;
    setAttribute(name: string, value: string): void;
    removeAttribute(name: string): void;
    setAttributeNS(namespaceURI: string, qualifiedName: string, value: string): void;
    addEventListener(type: string, listener: EventListener, useCapture?: boolean): void;
    removeEventListener(type: string, listener?: EventListener, options?: boolean): void;

    setProperty?(name: string, value: any): void;
}


export interface IText extends INode {
    textContent: string | null;
}

export interface IComment extends INode {
    textContent: string | null;
}

export interface IDomTokenList {
    add(token: string): void;
    remove(token: string): void;
}

export interface ICssStyleDeclaration {
    removeProperty(propertyName: string): string;
    setProperty(propertyName: string, value: string | null, priority?: string): void;
}
