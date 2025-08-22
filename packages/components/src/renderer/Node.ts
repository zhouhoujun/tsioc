

export enum NodeType {

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
   * The TNode contains information about an {@link LContainer} for embedded views.
   */
  Container = 0b10000,

  /**
   * The TNode contains information about an `<c-container>` element {@link RNode}.
   */
  ElementContainer = 0b100000,

  /**
   * The TNode contains information about an `<c-content>` projection
   */
  Projection = 0b1000000,


  /**
   * Special node type representing a placeholder for future `TNode` at this location.
   *
   * I18n translation blocks are created before the element nodes which they contain. (I18n blocks
   * can span over many elements.) Because i18n `TNode`s (representing text) are created first they
   * often may need to point to element `TNode`s which are not yet created. In such a case we create
   * a `Placeholder` `TNode`. This allows the i18n to structurally link the `TNode`s together
   * without knowing any information about the future nodes which will be at that location.
   *
   * On `firstCreatePass` When element instruction executes it will try to create a `TNode` at that
   * location. Seeing a `Placeholder` `TNode` already there tells the system that it should reuse
   * existing `TNode` (rather than create a new one) and just update the missing information.
   */
  Placeholder = 0b10000000,

  /**
   * The TNode contains information about a `@let` declaration.
   */
  LetDeclaration = 0b100000000,

  // Combined Types These should never be used for `TNode.type` only as a useful way to check
  // if `TNode.type` is one of several choices.

  // See: https://github.com/microsoft/TypeScript/issues/35875 why we can't refer to existing enum.
  AnyRNode = 0b11, // Text | Element
  AnyContainer = 0b1100, // Container | ElementContainer
}

export interface RNode {
    nodeType: number;
    parentNode: RNode | null;
    /**
     * Returns the parent Element if there is one
     */
    parentElement: RElement | null;
    /**
     * Gets the Node immediately following this one in the parent's childNodes
     */
    nextSibling: RNode | null;

    childNodes: RNode[] | RNodeListOf<RNode>;

    textContent: string | null;

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
 * **`RNodeList`** objects are collections of nodes, usually returned by properties such as Node.childNodes and methods such as document.querySelectorAll().
 *
 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/NodeList)
 */
export interface RNodeList {
    /**
     * The **`NodeList.length`** property returns the number of items in a NodeList.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/NodeList/length)
     */
    readonly length: number;
    /**
     * Returns a node from a `NodeList` by index.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/NodeList/item)
     */
    item(index: number): RNode | null;
    forEach(callbackfn: (value: RNode, key: number, parent: RNodeList) => void, thisArg?: any): void;
    [index: number]: RNode;
}

export interface RNodeListOf<T extends RNode> extends RNodeList {
    item(index: number): T;
    forEach(callbackfn: (value: T, key: number, parent: RNodeListOf<T>) => void, thisArg?: any): void;
    [index: number]: T;
}

/**
 * The **`NamedNodeMap`** interface represents a collection of Attr objects.
 *
 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/NamedNodeMap)
 */
export interface RNamedMap {
    /**
     * The read-only **`length`** property of the NamedNodeMap interface is the number of objects stored in the map.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/NamedNodeMap/length)
     */
    readonly length: number;
    /**
     * The **`getNamedItem()`** method of the NamedNodeMap interface returns the Attr corresponding to the given name, or `null` if there is no corresponding attribute.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/NamedNodeMap/getNamedItem)
     */
    getNamedItem(qualifiedName: string): Attr | null;
    /**
     * The **`getNamedItemNS()`** method of the NamedNodeMap interface returns the Attr corresponding to the given local name in the given namespace, or `null` if there is no corresponding attribute.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/NamedNodeMap/getNamedItemNS)
     */
    getNamedItemNS(namespace: string | null, localName: string): Attr | null;
    /**
     * The **`item()`** method of the NamedNodeMap interface returns the item in the map matching the index.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/NamedNodeMap/item)
     */
    item(index: number): Attr | null;
    /**
     * The **`removeNamedItem()`** method of the NamedNodeMap interface removes the Attr corresponding to the given name from the map.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/NamedNodeMap/removeNamedItem)
     */
    removeNamedItem(qualifiedName: string): Attr;
    /**
     * The **`removeNamedItemNS()`** method of the NamedNodeMap interface removes the Attr corresponding to the given namespace and local name from the map.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/NamedNodeMap/removeNamedItemNS)
     */
    removeNamedItemNS(namespace: string | null, localName: string): Attr;
    /**
     * The **`setNamedItem()`** method of the NamedNodeMap interface puts the Attr identified by its name in the map.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/NamedNodeMap/setNamedItem)
     */
    setNamedItem(attr: Attr): Attr | null;
    /**
     * The **`setNamedItemNS()`** method of the NamedNodeMap interface puts the Attr identified by its name in the map.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/NamedNodeMap/setNamedItemNS)
     */
    setNamedItemNS(attr: Attr): Attr | null;
    [index: number]: Attr;
}


/**
 * Subset of API needed for writing attributes, properties, and setting up
 * listeners on Element.
 */
export interface RElement extends RNode {
  firstChild: RNode | null;
  style: RCssStyleDeclaration;
  classList: RDomTokenList;
  className: string;
  tagName: string;
  textContent: string | null;
  hasAttribute(name: string): boolean;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  setAttributeNS(
    namespaceURI: string,
    qualifiedName: string,
    value: string,
  ): void;
  addEventListener(type: string, listener: EventListener, useCapture?: boolean): void;
  removeEventListener(type: string, listener?: EventListener, options?: boolean): void;
  remove(): void;
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


export interface RElement extends RNode {
    attributes: RNamedMap;
}

export interface RTemplate extends RElement {
  tagName: 'TEMPLATE';
  content: RNode;
}
