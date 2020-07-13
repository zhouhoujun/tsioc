

/**
 * TNodeType corresponds to the {@link TNode} `type` property.
 */
export const enum TNodeType {
    /**
     * The TNode contains information about an {@link LContainer} for embedded views.
     */
    Container = 0,
    /**
     * The TNode contains information about an `<ng-content>` projection
     */
    Projection = 1,
    /**
     * The TNode contains information about an {@link LView}
     */
    View = 2,
    /**
     * The TNode contains information about a DOM element aka {@link RNode}.
     */
    Element = 3,
    /**
     * The TNode contains information about an `<ng-container>` element {@link RNode}.
     */
    ElementContainer = 4,
    /**
     * The TNode contains information about an ICU comment used in `i18n`.
     */
    IcuContainer = 5,
}


/**
 * Binding data (flyweight) for a particular node that is shared between all templates
 * of a specific type.
 *
 * If a property is:
 *    - PropertyAliases: that property's data was generated and this is it
 *    - Null: that property's data was already generated and nothing was found.
 *    - Undefined: that property's data has not yet been generated
 *
 * see: https://en.wikipedia.org/wiki/Flyweight_pattern for more on the Flyweight pattern
 */
export interface TNode {
    /**
     * The type of the TNode. See TNodeType.
     * */
    type: TNodeType;

    /**
     * Index of the TNode in TView.data and corresponding native element in LView.
     *
     * This is necessary to get from any TNode to its corresponding native element when
     * traversing the node tree.
     *
     * If index is -1, this is a dynamically created container node or embedded view node.
     */
    index: number;

    /**
     * Stores starting index of the directives.
     */
    directiveStart: number;

    /**
     * Stores final exclusive index of the directives.
     */
    directiveEnd: number;

    /**
     * Stores indexes of property bindings. This field is only set in the ngDevMode and holds indexes
     * of property bindings so TestBed can get bound property metadata for a given node.
     */
    propertyBindings: number[]|null;

    /** The tag name associated with this node. */
    tagName: string|null;

}
