import { IComment, IElement } from './node';
import { HOST, LView, NEXT, PARENT, V_HOST } from './view';
import { VNode } from './vnode';



/**
 * Special location which allows easy identification of type. If we have an array which was
 * retrieved from the `LView` and that array has `true` at `TYPE` location, we know it is
 * `LContainer`.
 */
export const TYPE = 1;

/**
 * Below are constants for LContainer indices to help us look up LContainer members
 * without having to remember the specific indices.
 * Uglify will inline these when minifying so there shouldn't be a cost.
 */

/**
 * Flag to signify that this `LContainer` may have transplanted views which need to be change
 * detected. (see: `LView[DECLARATION_COMPONENT_VIEW])`.
 *
 * This flag, once set, is never unset for the `LContainer`. This means that when unset we can skip
 * a lot of work in `refreshEmbeddedViews`. But when set we still need to verify
 * that the `MOVED_VIEWS` are transplanted and on-push.
 */
export const HAS_TRANSPLANTED_VIEWS = 2;

// PARENT, NEXT, TRANSPLANTED_VIEWS_TO_REFRESH are indices 3, 4, and 5
// As we already have these constants in LView, we don't need to re-create them.

// T_HOST is index 6
// We already have this constants in LView, we don't need to re-create it.

export const NATIVE = 7;
export const VIEW_REFS = 8;
export const MOVED_VIEWS = 9;


/**
 * Size of LContainer's header. Represents the index after which all views in the
 * container will be inserted. We need to keep a record of current views so we know
 * which views are already in the DOM (and don't need to be re-added) and so we can
 * remove views from the DOM when they are no longer required.
 */
export const CONTAINER_HEADER_OFFSET = 10;

/**
 * The state associated with a container.
 *
 * This is an array so that its structure is closer to LView. This helps
 * when traversing the view tree (which is a mix of containers and component
 * views), so we can jump to viewOrContainer[NEXT] in the same way regardless
 * of type.
 */
export interface LContainer extends Array<any> {

    /**
     * The host element of this LContainer.
     *
     * The host could be an LView if this container is on a component node.
     * In that case, the component LView is its HOST.
     *
    readonly [HOST]: IElement | IComment | LView;

    /**
     * Pointer to the `VNode` which represents the host of the container.
     */
    [V_HOST]?: VNode;
    /**
     * Access to the parent view is necessary so we can propagate back
     * up from inside a container to parent
     */
    [PARENT]: LView;
    /**
     * This allows us to jump from a container to a sibling container or component
     * view with the same parent, so we can remove listeners efficiently.
     */
    [NEXT]?: LView | LContainer;
    /**
     * A collection of views created based on the underlying `<v-template>` element but inserted into
     * a different `LContainer`. We need to track views created from a given declaration point since
     * queries collect matches from the embedded view declaration point and _not_ the insertion point.
     */
    [MOVED_VIEWS]?: LView[];

    readonly [NATIVE]: IComment;

    /**
     * Array of `ViewRef`s used by any `ViewContainerRef`s that point to this container.
     */
    [VIEW_REFS]?: any[];
}