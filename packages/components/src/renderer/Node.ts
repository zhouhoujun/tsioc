

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

/**
 * A node in the DOM tree.
 */
export interface RNode {
  /**
   * The tag name of this node.
   */
  tagName?: string;
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
   * Removes a child from the current node and returns the removed node
   * @param oldChild the child node to remove
   */
  removeChild(oldChild: RNode): RNode;

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
   * Adds an event listener to the element.
   */
  addEventListener(type: string, listener: EventListener, useCapture?: boolean): void;
  /**
   * Removes an event listener from the element.
   */
  removeEventListener(type: string, listener?: EventListener, options?: boolean): void;
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


export type RParentNode = RElement | RTemplate;