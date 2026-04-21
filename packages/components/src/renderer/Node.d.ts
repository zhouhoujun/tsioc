import { ComponentDef } from '../refs/component';
import { DirectiveDef } from '../refs/directive';
import { Bindings } from '../refs/template';
export declare enum NodeType {
    /**
     * The TNode contains information about a DOM element aka {@link RElement}.
     */
    Element = 1,
    /**
     * The TNode contains information about a DOM element aka {@link RText}.
     */
    Text = 3,
    /**
     * The TNode contains information about a DOM element aka {@link RComment}.
     */
    Comment = 8,
    /**
     * The TNode contains information about an {@link ViewContainerRef} for embedded views.
     */
    Container = 16,
    /**
     * The TNode contains information about an `<v-container>` element {@link RNode}.
     */
    ElementContainer = 32,
    /**
     * The TNode contains information about an `<v-content>` projection
     */
    Projection = 64,
    /**
     * The TNode contains information about an {@link RTemplate} for embedded views.
     */
    Template = 128,
    AnyRNode = 3,// Text | Element
    AnyContainer = 48
}
export declare const BINDINGS: unique symbol;
export declare const DIRECTIVES: unique symbol;
export declare const COMPONENTDEF: unique symbol;
export declare const CUSTOM_ELEMENTS: unique symbol;
/**
 * A node in the DOM tree.
 */
export interface RNode {
    /**
     * The type of node.
     */
    nodeType: number;
    /**
     * The parent node of this node.
     */
    parentNode: RParentNode | null;
    /**
     * Returns the parent Element if there is one
     */
    parentElement?: RElement | null;
    /**
     * Gets the Node immediately following this one in the parent's childNodes
     */
    nextSibling?: RNode | null;
    /**
     * The child nodes of this node.
     */
    childNodes: RNode[];
    /**
     * The **`removeChild()`** method of the Node interface removes a child node from the DOM and returns the removed node.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/removeChild)
     */
    removeChild(child: RNode): RNode;
    /**
     * The **`replaceChild()`** method of the Node interface replaces a child node within the given (parent) node.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Node/replaceChild)
     */
    replaceChild(node: RNode, child: RNode): RNode;
    /**
     * Insert a child node.
     *
     * Used exclusively for adding View root nodes into ViewAnchor location.
     */
    insertBefore(newChild: RNode, refChild: RNode | null, isViewRoot?: boolean): void;
    /**
     * Append a child node.
     *
     * Used exclusively for building up DOM which are static (ie not View roots)
     */
    appendChild(newChild: RNode): RNode;
    /**
     * Returns the first element that is a descendant of node that matches selectors.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/querySelector)
     */
    querySelector(selector: string): RNode | null;
    /**
     * Returns all element descendants of node that match selectors.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/querySelectorAll)
     */
    querySelectorAll(selector: string): RNode[] | null;
    /**
     * Adds an event listener to the element.
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventTarget/addEventListener)
     */
    addEventListener(type: string, listener: EventListener, useCapture?: boolean): void;
    /**
     * The **`dispatchEvent()`** method of the EventTarget sends an Event to the object, (synchronously) invoking the affected event listeners in the appropriate order.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventTarget/dispatchEvent)
     */
    dispatchEvent(event: Event): boolean;
    /**
     * Removes an event listener from the element.
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventTarget/removeEventListener)
     */
    removeEventListener(type: string, listener?: EventListener, options?: boolean): void;
    /**
     * The bindings of this node.
     */
    [BINDINGS]?: Bindings[];
    /**
     * The directives of this node.
     */
    [DIRECTIVES]?: DirectiveDef[];
    /**
     * Custom element directives/components of this node.
     */
    [CUSTOM_ELEMENTS]?: DirectiveDef[];
    [COMPONENTDEF]?: ComponentDef;
}
export interface EventListener {
    (event: Event): void;
}
/**
 * An attribute on an element.
 */
export interface RAttr {
    /** The name of the attribute. */
    name: string;
    /** The namespace of the attribute. */
    namespace?: string;
    /** The namespace-related prefix of the attribute. */
    prefix?: string;
    /** The value of the attribute. */
    value: string;
}
/**
 * Subset of API needed for writing attributes, properties, and setting up
 * listeners on Element.
 */
export interface RElement extends RNode {
    type?: string;
    firstChild: RNode | null;
    /**
     * The style declaration of this element.
     */
    style: RCssStyleDeclaration;
    /**
     * The class list of this element.
     */
    classList: RDomTokenList;
    /**
     * The class name of this element.
     */
    className: string;
    /**
     * The tag name of this element.
     */
    tagName: string;
    /**
     * The text content of this element.
     */
    textContent: string | null;
    /**
     * Returns true if the element has the specified attribute.
     */
    hasAttribute(name: string): boolean;
    /**
     * Returns the value of the specified attribute.
     */
    getAttribute(name: string): string | null;
    /**
     * Sets the value of the specified attribute.
     */
    setAttribute(name: string, value: string): void;
    /**
     * Removes the specified attribute.
     */
    removeAttribute(name: string): void;
    /**
     * Returns true if the element has the specified attribute namespace.
     */
    hasAttributeNS?(namespaceURI: string, localName: string): boolean;
    /**
     * Returns the value of the specified attribute namespace.
     */
    getAttributeNS?(namespace: string | null, localName: string): string | null;
    /**
     * Sets the value of the specified attribute namespace.
     */
    setAttributeNS?(namespaceURI: string, qualifiedName: string, value: string): void;
    /**
     * Removes the specified attribute namespace.
     */
    removeAttributeNS?(namespaceURI: string, localName: string): void;
    /**
     * Sets the value of the specified property.
     */
    setProperty?(name: string, value: any): void;
}
/**
 * Subset of API needed for writing styles on Element.
 */
export interface RCssStyleDeclaration {
    /**
     * Removes the specified property.
     */
    removeProperty(propertyName: string): string;
    /**
     * Sets the value of the specified property.
     */
    setProperty(propertyName: string, value: string | null, priority?: string): void;
}
/**
 * Subset of API needed for writing classList on Element.
 */
export interface RDomTokenList {
    /**
     * Adds the specified token to the list.
     */
    add(token: string): void;
    /**
     * Removes the specified token from the list.
     */
    remove(token: string): void;
}
/**
 * Renderer text node.
 */
export interface RText extends RNode {
    /**
     * The text content of this node.
     */
    textContent: string | null;
}
/**
 * Renderer comment node.
 */
export interface RComment extends RNode {
    /**
     * The text content of this node.
     */
    textContent: string | null;
}
/**
 * Renderer template node.
 */
export interface RTemplate extends RElement {
    /**
     * The tag name of this element.
     */
    tagName: 'TEMPLATE';
    /**
     * The content of this template.
     */
    content: RNode;
}
export type RParentNode = RNode | RTemplate;
