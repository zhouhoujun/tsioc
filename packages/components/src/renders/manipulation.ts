import { Renderer } from '../interfaces/renderer';
import { isLContainer, isLView } from '../interfaces/chk';
import { CONTAINER_HEADER_OFFSET, HAS_TRANSPLANTED_VIEWS, LContainer, MOVED_VIEWS, NATIVE } from '../interfaces/container';
import { IComment, IElement, INode, IText } from '../interfaces/dom';
import { CHILD_HEAD, CLEANUP, DECLARATION_COMPONENT_VIEW, DECLARATION_LCONTAINER, DestroyHookData, FLAGS, HookData, HookFn, HOST, LView, LViewFlags, NEXT, PARENT, QUERIES, RENDERER, TVIEW, TView, TViewType, T_HOST } from '../interfaces/view';
import { attachPatchData, getNativeByTNode, unwrapRNode, updateTransplantedViewCount } from '../util/view';
import { TElementNode, TNode, TNodeFlags, TNodeType, TProjectionNode } from '../interfaces/node';
import { addToArray, removeFromArray } from '../util/array';
import { escapeCommentText } from '../util/dom';
import { getLViewParent } from './native_nodes';
import { ComponentDef, RendererStyleFlags, ViewEncapsulation } from '../type';
import { InvocationContext } from '@tsdi/ioc';
import { profiler, ProfilerEvent } from './profiler';

declare let devMode: any;

const enum WalkTNodeTreeAction {
    /** node create in the native environment. Run on initial creation. */
    Create = 0,

    /**
     * node insert in the native environment.
     * Run when existing node has been detached and needs to be re-attached.
     */
    Insert = 1,

    /** node detach from the native environment */
    Detach = 2,

    /** node destruction using the renderer's API */
    Destroy = 3,
}



/**
 * NOTE: for performance reasons, the possible actions are inlined within the function instead of
 * being passed as an argument.
 */
function applyToElementOrContainer(
    action: WalkTNodeTreeAction, renderer: Renderer, parent: IElement | null,
    lNodeToHandle: INode | LContainer | LView, beforeNode?: INode | null) {
    // If this slot was allocated for a text node dynamically created by i18n, the text node itself
    // won't be created until i18nApply() in the update block, so this node should be skipped.
    // For more info, see "ICU expressions should work inside an ngTemplateOutlet inside an ngFor"
    // in `i18n_spec.ts`.
    if (lNodeToHandle != null) {
        let lContainer: LContainer | undefined;
        let isComponent = false;
        // We are expecting an INode, but in the case of a component or LContainer the `INode` is
        // wrapped in an array which needs to be unwrapped. We need to know if it is a component and if
        // it has LContainer so that we can process all of those cases appropriately.
        if (isLContainer(lNodeToHandle)) {
            lContainer = lNodeToHandle;
        } else if (isLView(lNodeToHandle)) {
            isComponent = true;
            //    devMode && assertDefined(lNodeToHandle[HOST], 'HOST must be defined for a component LView');
            lNodeToHandle = lNodeToHandle[HOST]!;
        }
        const rNode: INode = unwrapRNode(lNodeToHandle);
        //  devMode && !isProceduralRenderer(renderer) && assertDomNode(rNode);

        if (action === WalkTNodeTreeAction.Create && parent !== null) {
            if (beforeNode == null) {
                renderer.appendChild(parent, rNode);
            } else {
                renderer.insertBefore(parent, rNode, beforeNode || null, true);
            }
        } else if (action === WalkTNodeTreeAction.Insert && parent !== null) {
            renderer.insertBefore(parent, rNode, beforeNode || null, true);
        } else if (action === WalkTNodeTreeAction.Detach) {
            nativeRemoveNode(renderer, rNode, isComponent);
        } else if (action === WalkTNodeTreeAction.Destroy) {
            //    devMode && devMode.rendererDestroyNode++;
            renderer.destroyNode!(rNode);
        }
        if (lContainer != null) {
            applyContainer(renderer, action, lContainer, parent, beforeNode);
        }
    }
}

export function createTextNode(renderer: Renderer, value: string): IText {
    //    devMode && devMode.rendererCreateTextNode++;
    //    devMode && devMode.rendererSetText++;
    return renderer.createText(value);
}

export function updateTextNode(renderer: Renderer, rNode: IText, value: string): void {
    //    devMode && devMode.rendererSetText++;
    renderer.setValue(rNode, value);
}

export function createCommentNode(renderer: Renderer, value: string): IComment {
    //    devMode && devMode.rendererCreateComment++;
    // isProceduralRenderer check is not needed because both `Renderer2` and `Renderer` have the same
    // method name.
    return renderer.createComment(escapeCommentText(value));
}

/**
 * Creates a native element from a tag name, using a renderer.
 * @param renderer A renderer to use
 * @param name the tag name
 * @param namespace Optional namespace for element.
 * @returns the element created
 */
export function createElementNode(
    renderer: Renderer, name: string, namespace: string | null): IElement {
    //    devMode && devMode.rendererCreateElement++;
    return renderer.createElement(name, namespace);
}


/**
 * Removes all DOM elements associated with a view.
 *
 * Because some root nodes of the view may be containers, we sometimes need
 * to propagate deeply into the nested containers to remove all elements in the
 * views beneath it.
 *
 * @param tView The `TView' of the `LView` from which elements should be added or removed
 * @param lView The view from which elements should be added or removed
 */
export function removeViewFromContainer(tView: TView, lView: LView): void {
    const renderer = lView[RENDERER];
    applyView(tView, lView, renderer, WalkTNodeTreeAction.Detach, null, null);
    lView[HOST] = null;
    lView[T_HOST] = null;
}

/**
 * Adds all DOM elements associated with a view.
 *
 * Because some root nodes of the view may be containers, we sometimes need
 * to propagate deeply into the nested containers to add all elements in the
 * views beneath it.
 *
 * @param tView The `TView' of the `LView` from which elements should be added or removed
 * @param parentTNode The `TNode` where the `LView` should be attached to.
 * @param renderer Current renderer to use for DOM manipulations.
 * @param lView The view from which elements should be added or removed
 * @param parentNativeNode The parent `IElement` where it should be inserted into.
 * @param beforeNode The node before which elements should be added, if insert mode
 */
export function addViewToContainer(
    tView: TView, parentTNode: TNode, renderer: Renderer, lView: LView, parentNativeNode: IElement,
    beforeNode: INode | null): void {
    lView[HOST] = parentNativeNode;
    lView[T_HOST] = parentTNode;
    applyView(tView, lView, renderer, WalkTNodeTreeAction.Insert, parentNativeNode, beforeNode);
}


/**
 * Detach a `LView` from the DOM by detaching its nodes.
 *
 * @param tView The `TView' of the `LView` to be detached
 * @param lView the `LView` to be detached.
 */
export function renderDetachView(tView: TView, lView: LView) {
    applyView(tView, lView, lView[RENDERER], WalkTNodeTreeAction.Detach, null, null);
}

/**
 * Traverses down and up the tree of views and containers to remove listeners and
 * call onDestroy callbacks.
 *
 * Notes:
 *  - Because it's used for onDestroy calls, it needs to be bottom-up.
 *  - Must process containers instead of their views to avoid splicing
 *  when views are destroyed and re-added.
 *  - Using a while loop because it's faster than recursion
 *  - Destroy only called on movement to sibling or movement to parent (laterally or up)
 *
 *  @param rootView The view to destroy
 */
export function destroyViewTree(rootView: LView): void {
    // If the view has no children, we can clean it up and return early.
    let lViewOrLContainer = rootView[CHILD_HEAD];
    if (!lViewOrLContainer) {
        return cleanUpView(rootView[TVIEW], rootView);
    }

    while (lViewOrLContainer) {
        let next: LView | LContainer | null = null;

        if (isLView(lViewOrLContainer)) {
            // If LView, traverse down to child.
            next = lViewOrLContainer[CHILD_HEAD];
        } else {
            // devMode && assertLContainer(lViewOrLContainer);
            // If container, traverse down to its first LView.
            const firstView: LView | undefined = lViewOrLContainer[CONTAINER_HEADER_OFFSET];
            if (firstView) next = firstView;
        }

        if (!next) {
            // Only clean up view when moving to the side or up, as destroy hooks
            // should be called in order from the bottom up.
            while (lViewOrLContainer && !lViewOrLContainer![NEXT] && lViewOrLContainer !== rootView) {
                if (isLView(lViewOrLContainer)) {
                    cleanUpView(lViewOrLContainer[TVIEW], lViewOrLContainer);
                }
                lViewOrLContainer = lViewOrLContainer[PARENT];
            }
            if (lViewOrLContainer === null) lViewOrLContainer = rootView;
            if (isLView(lViewOrLContainer)) {
                cleanUpView(lViewOrLContainer[TVIEW], lViewOrLContainer);
            }
            next = lViewOrLContainer && lViewOrLContainer![NEXT];
        }
        lViewOrLContainer = next;
    }
}

/**
 * Inserts a view into a container.
 *
 * This adds the view to the container's array of active views in the correct
 * position. It also adds the view's elements to the DOM if the container isn't a
 * root node of another view (in that case, the view's elements will be added when
 * the container's parent view is added later).
 *
 * @param tView The `TView' of the `LView` to insert
 * @param lView The view to insert
 * @param lContainer The container into which the view should be inserted
 * @param index Which index in the container to insert the child view into
 */
export function insertView(tView: TView, lView: LView, lContainer: LContainer, index: number) {
    // devMode && assertLView(lView);
    // devMode && assertLContainer(lContainer);
    const indexInContainer = CONTAINER_HEADER_OFFSET + index;
    const containerLength = lContainer.length;

    if (index > 0) {
        // This is a new view, we need to add it to the children.
        lContainer[indexInContainer - 1][NEXT] = lView;
    }
    if (index < containerLength - CONTAINER_HEADER_OFFSET) {
        lView[NEXT] = lContainer[indexInContainer];
        addToArray(lContainer, CONTAINER_HEADER_OFFSET + index, lView);
    } else {
        lContainer.push(lView);
        lView[NEXT] = null;
    }

    lView[PARENT] = lContainer;

    // track views where declaration and insertion points are different
    const declarationLContainer = lView[DECLARATION_LCONTAINER];
    if (declarationLContainer !== null && lContainer !== declarationLContainer) {
        trackMovedView(declarationLContainer, lView);
    }

    // notify query that a new view has been added
    const lQueries = lView[QUERIES];
    if (lQueries !== null) {
        lQueries.insertView(tView);
    }

    // Sets the attached flag
    lView[FLAGS] |= LViewFlags.Attached;
}

/**
 * Track views created from the declaration container (TemplateRef) and inserted into a
 * different LContainer.
 */
function trackMovedView(declarationContainer: LContainer, lView: LView) {
    // devMode && assertDefined(lView, 'LView required');
    // devMode && assertLContainer(declarationContainer);
    const movedViews = declarationContainer[MOVED_VIEWS];
    const insertedLContainer = lView[PARENT] as LContainer;
    // devMode && assertLContainer(insertedLContainer);
    const insertedComponentLView = insertedLContainer[PARENT]![DECLARATION_COMPONENT_VIEW];
    // devMode && assertDefined(insertedComponentLView, 'Missing insertedComponentLView');
    const declaredComponentLView = lView[DECLARATION_COMPONENT_VIEW];
    // devMode && assertDefined(declaredComponentLView, 'Missing declaredComponentLView');
    if (declaredComponentLView !== insertedComponentLView) {
        // At this point the declaration-component is not same as insertion-component; this means that
        // this is a transplanted view. Mark the declared lView as having transplanted views so that
        // those views can participate in CD.
        declarationContainer[HAS_TRANSPLANTED_VIEWS] = true;
    }
    if (movedViews === null) {
        declarationContainer[MOVED_VIEWS] = [lView];
    } else {
        movedViews.push(lView);
    }
}

function detachMovedView(declarationContainer: LContainer, lView: LView) {
    // devMode && assertLContainer(declarationContainer);
    // devMode &&
    //     assertDefined(
    //         declarationContainer[MOVED_VIEWS],
    //         'A projected view should belong to a non-empty projected views collection');
    const movedViews = declarationContainer[MOVED_VIEWS]!;
    const declarationViewIndex = movedViews.indexOf(lView);
    const insertionLContainer = lView[PARENT] as LContainer;
    // devMode && assertLContainer(insertionLContainer);

    // If the view was marked for refresh but then detached before it was checked (where the flag
    // would be cleared and the counter decremented), we need to decrement the view counter here
    // instead.
    if (lView[FLAGS] & LViewFlags.RefreshTransplantedView) {
        lView[FLAGS] &= ~LViewFlags.RefreshTransplantedView;
        updateTransplantedViewCount(insertionLContainer, -1);
    }

    movedViews.splice(declarationViewIndex, 1);
}

/**
 * Detaches a view from a container.
 *
 * This method removes the view from the container's array of active views. It also
 * removes the view's elements from the DOM.
 *
 * @param lContainer The container from which to detach a view
 * @param removeIndex The index of the view to detach
 * @returns Detached LView instance.
 */
export function detachView(lContainer: LContainer, removeIndex: number): LView | undefined {
    if (lContainer.length <= CONTAINER_HEADER_OFFSET) return;

    const indexInContainer = CONTAINER_HEADER_OFFSET + removeIndex;
    const viewToDetach = lContainer[indexInContainer];

    if (viewToDetach) {
        const declarationLContainer = viewToDetach[DECLARATION_LCONTAINER];
        if (declarationLContainer !== null && declarationLContainer !== lContainer) {
            detachMovedView(declarationLContainer, viewToDetach);
        }


        if (removeIndex > 0) {
            lContainer[indexInContainer - 1][NEXT] = viewToDetach[NEXT] as LView;
        }
        const removedLView = removeFromArray(lContainer, CONTAINER_HEADER_OFFSET + removeIndex);
        removeViewFromContainer(viewToDetach[TVIEW], viewToDetach);

        // notify query that a view has been removed
        const lQueries = removedLView[QUERIES];
        if (lQueries !== null) {
            lQueries.detachView(removedLView[TVIEW]);
        }

        viewToDetach[PARENT] = null;
        viewToDetach[NEXT] = null;
        // Unsets the attached flag
        viewToDetach[FLAGS] &= ~LViewFlags.Attached;
    }
    return viewToDetach;
}

/**
 * A standalone function which destroys an LView,
 * conducting clean up (e.g. removing listeners, calling onDestroys).
 *
 * @param tView The `TView' of the `LView` to be destroyed
 * @param lView The view to be destroyed.
 */
export function destroyLView(tView: TView, lView: LView) {
    if (!(lView[FLAGS] & LViewFlags.Destroyed)) {
        const renderer = lView[RENDERER];
        if (renderer.destroyNode) {
            applyView(tView, lView, renderer, WalkTNodeTreeAction.Destroy, null, null);
        }

        destroyViewTree(lView);
    }
}

/**
 * Calls onDestroys hooks for all directives and pipes in a given view and then removes all
 * listeners. Listeners are removed as the last step so events delivered in the onDestroys hooks
 * can be propagated to @Output listeners.
 *
 * @param tView `TView` for the `LView` to clean up.
 * @param lView The LView to clean up
 */
function cleanUpView(tView: TView, lView: LView): void {
    if (!(lView[FLAGS] & LViewFlags.Destroyed)) {
        // Usually the Attached flag is removed when the view is detached from its parent, however
        // if it's a root view, the flag won't be unset hence why we're also removing on destroy.
        lView[FLAGS] &= ~LViewFlags.Attached;

        // Mark the LView as destroyed *before* executing the onDestroy hooks. An onDestroy hook
        // runs arbitrary user code, which could include its own `viewRef.destroy()` (or similar). If
        // We don't flag the view as destroyed before the hooks, this could lead to an infinite loop.
        // This also aligns with the ViewEngine behavior. It also means that the onDestroy hook is
        // really more of an "afterDestroy" hook if you think about it.
        lView[FLAGS] |= LViewFlags.Destroyed;

        executeOnDestroys(tView, lView);
        processCleanups(tView, lView);
        // For component views only, the local renderer is destroyed at clean up time.
        if (lView[TVIEW].type === TViewType.Component) {
            // devMode && devMode.rendererDestroy++;
            lView[RENDERER].destroy();
        }

        const declarationContainer = lView[DECLARATION_LCONTAINER];
        // we are dealing with an embedded view that is still inserted into a container
        if (declarationContainer !== null && isLContainer(lView[PARENT])) {
            // and this is a projected view
            if (declarationContainer !== lView[PARENT]) {
                detachMovedView(declarationContainer, lView);
            }

            // For embedded views still attached to a container: remove query result from this view.
            const lQueries = lView[QUERIES];
            if (lQueries !== null) {
                lQueries.detachView(tView);
            }
        }
    }
}

/** Removes listeners and unsubscribes from output subscriptions */
function processCleanups(tView: TView, lView: LView): void {
    const tCleanup = tView.cleanup;
    const lCleanup = lView[CLEANUP]!;
    // `LCleanup` contains both share information with `TCleanup` as well as instance specific
    // information appended at the end. We need to know where the end of the `TCleanup` information
    // is, and we track this with `lastLCleanupIndex`.
    let lastLCleanupIndex = -1;
    if (tCleanup !== null) {
        for (let i = 0; i < tCleanup.length - 1; i += 2) {
            if (typeof tCleanup[i] === 'string') {
                // This is a native DOM listener
                const idxOrTargetGetter = tCleanup[i + 1];
                const target = typeof idxOrTargetGetter === 'function' ?
                    idxOrTargetGetter(lView) :
                    unwrapRNode(lView[idxOrTargetGetter]);
                const listener = lCleanup[lastLCleanupIndex = tCleanup[i + 2]];
                const useCaptureOrSubIdx = tCleanup[i + 3];
                if (typeof useCaptureOrSubIdx === 'boolean') {
                    // native DOM listener registered with Renderer
                    target.removeEventListener(tCleanup[i], listener, useCaptureOrSubIdx);
                } else {
                    if (useCaptureOrSubIdx >= 0) {
                        // unregister
                        lCleanup[lastLCleanupIndex = useCaptureOrSubIdx]();
                    } else {
                        // Subscription
                        lCleanup[lastLCleanupIndex = -useCaptureOrSubIdx].unsubscribe();
                    }
                }
                i += 2;
            } else {
                // This is a cleanup function that is grouped with the index of its context
                const context = lCleanup[lastLCleanupIndex = tCleanup[i + 1]];
                tCleanup[i].call(context);
            }
        }
    }
    if (lCleanup !== null) {
        for (let i = lastLCleanupIndex + 1; i < lCleanup.length; i++) {
            const instanceCleanupFn = lCleanup[i];
            // devMode && assertFunction(instanceCleanupFn, 'Expecting instance cleanup function.');
            instanceCleanupFn();
        }
        lView[CLEANUP] = null;
    }
}

/** Calls onDestroy hooks for this view */
function executeOnDestroys(tView: TView, lView: LView): void {
    let destroyHooks: DestroyHookData | null;

    if (tView != null && (destroyHooks = tView.destroyHooks) != null) {
        for (let i = 0; i < destroyHooks.length; i += 2) {
            const context = lView[destroyHooks[i] as number];

            // Only call the destroy hook if the context has been requested.
            if (!(context instanceof InvocationContext)) {
                const toCall = destroyHooks[i + 1] as HookFn | HookData;

                if (Array.isArray(toCall)) {
                    for (let j = 0; j < toCall.length; j += 2) {
                        const callContext = context[toCall[j] as number];
                        const hook = toCall[j + 1] as HookFn;
                        profiler(ProfilerEvent.LifecycleHookStart, callContext, hook);
                        try {
                            hook.call(callContext);
                        } finally {
                            profiler(ProfilerEvent.LifecycleHookEnd, callContext, hook);
                        }
                    }
                } else {
                    profiler(ProfilerEvent.LifecycleHookStart, context, toCall);
                    try {
                        toCall.call(context);
                    } finally {
                        profiler(ProfilerEvent.LifecycleHookEnd, context, toCall);
                    }
                }
            }
        }
    }
}

/**
 * Returns a native element if a node can be inserted into the given parent.
 *
 * There are two reasons why we may not be able to insert a element immediately.
 * - Projection: When creating a child content element of a component, we have to skip the
 *   insertion because the content of a component will be projected.
 *   `<component><content>delayed due to projection</content></component>`
 * - Parent container is disconnected: This can happen when we are inserting a view into
 *   parent container, which itself is disconnected. For example the parent container is part
 *   of a View which has not be inserted or is made for projection but has not been inserted
 *   into destination.
 *
 * @param tView: Current `TView`.
 * @param tNode: `TNode` for which we wish to retrieve render parent.
 * @param lView: Current `LView`.
 */
export function getParentRElement(tView: TView, tNode: TNode, lView: LView): IElement | null {
    return getClosestRElement(tView, tNode.parent, lView);
}

/**
 * Get closest `IElement` or `null` if it can't be found.
 *
 * If `TNode` is `TNodeType.Element` => return `IElement` at `LView[tNode.index]` location.
 * If `TNode` is `TNodeType.ElementContainer|IcuContain` => return the parent (recursively).
 * If `TNode` is `null` then return host `IElement`:
 *   - return `null` if projection
 *   - return `null` if parent container is disconnected (we have no parent.)
 *
 * @param tView: Current `TView`.
 * @param tNode: `TNode` for which we wish to retrieve `IElement` (or `null` if host element is
 *     needed).
 * @param lView: Current `LView`.
 * @returns `null` if the `IElement` can't be determined at this time (no parent / projection)
 */
export function getClosestRElement(tView: TView, tNode: TNode | null, lView: LView): IElement | null {
    let parentTNode: TNode | null = tNode;
    // Skip over element and ICU containers as those are represented by a comment node and
    // can't be used as a render parent.
    while (parentTNode !== null &&
        (parentTNode.type & TNodeType.ElementContainer)) {
        tNode = parentTNode;
        parentTNode = tNode.parent;
    }

    // If the parent tNode is null, then we are inserting across views: either into an embedded view
    // or a component view.
    if (parentTNode === null) {
        // We are inserting a root element of the component view into the component host element and
        // it should always be eager.
        return lView[HOST];
    } else {
        // devMode && assertTNodeType(parentTNode, TNodeType.AnyRNode | TNodeType.Container);
        if (parentTNode.flags & TNodeFlags.isComponentHost) {
            // devMode && assertTNodeForLView(parentTNode, lView);
            const encapsulation =
                (tView.data[parentTNode.directiveStart] as ComponentDef<unknown>).encapsulation;
            // We've got a parent which is an element in the current view. We just need to verify if the
            // parent element is not a component. Component's content nodes are not inserted immediately
            // because they will be projected, and so doing insert at this point would be wasteful.
            // Since the projection would then move it to its final destination. Note that we can't
            // make this assumption when using the Shadow DOM, because the native projection placeholders
            // (<content> or <slot>) have to be in place as elements are being inserted.
            if (encapsulation === ViewEncapsulation.None ||
                encapsulation === ViewEncapsulation.Emulated) {
                return null;
            }
        }

        return getNativeByTNode(parentTNode, lView) as IElement;
    }
}


function nativeAppendOrInsertBefore(
    renderer: Renderer, parent: IElement, child: INode, beforeNode: INode | null, isMove: boolean) {
    if (beforeNode !== null) {
        renderer.insertBefore(parent, child, beforeNode, isMove);
    } else {
        renderer.appendChild(parent, child);
    }
}

/**
 * Find a node in front of which `currentTNode` should be inserted.
 *
 * This method determines the `INode` in front of which we should insert the `currentRNode`. This
 * takes `TNode.insertBeforeIndex` into account if i18n code has been invoked.
 *
 * @param parentTNode parent `TNode`
 * @param currentTNode current `TNode` (The node which we would like to insert into the DOM)
 * @param lView current `LView`
 */
function getInsertInFrontOfRNode(parentTNode: TNode, currentTNode: TNode, lView: LView): INode |
    null {
    return _getInsertInFrontOfRNodeWithI18n(parentTNode, currentTNode, lView);
}


/**
 * Find a node in front of which `currentTNode` should be inserted. (Does not take i18n into
 * account)
 *
 * This method determines the `INode` in front of which we should insert the `currentRNode`. This
 * does not take `TNode.insertBeforeIndex` into account.
 *
 * @param parentTNode parent `TNode`
 * @param currentTNode current `TNode` (The node which we would like to insert into the DOM)
 * @param lView current `LView`
 */
export function getInsertInFrontOfRNodeWithNoI18n(
    parentTNode: TNode, currentTNode: TNode, lView: LView): INode | null {
    if (parentTNode.type & TNodeType.ElementContainer) {
        return getNativeByTNode(parentTNode, lView);
    }
    return null;
}

/**
 * Tree shakable boundary for `getInsertInFrontOfRNodeWithI18n` function.
 *
 * This function will only be set if i18n code runs.
 */
let _getInsertInFrontOfRNodeWithI18n: (parentTNode: TNode, currentTNode: TNode, lView: LView) =>
    INode | null = getInsertInFrontOfRNodeWithNoI18n;

/**
 * Tree shakable boundary for `processI18nInsertBefore` function.
 *
 * This function will only be set if i18n code runs.
 */
let _processI18nInsertBefore: (
    renderer: Renderer, childTNode: TNode, lView: LView, childRNode: INode | INode[],
    parentRElement: IElement | null) => void;

export function setI18nHandling(
    getInsertInFrontOfRNodeWithI18n: (parentTNode: TNode, currentTNode: TNode, lView: LView) =>
        INode | null,
    processI18nInsertBefore: (
        renderer: Renderer, childTNode: TNode, lView: LView, childRNode: INode | INode[],
        parentRElement: IElement | null) => void) {
    _getInsertInFrontOfRNodeWithI18n = getInsertInFrontOfRNodeWithI18n;
    _processI18nInsertBefore = processI18nInsertBefore;
}

/**
 * Appends the `child` native node (or a collection of nodes) to the `parent`.
 *
 * @param tView The `TView' to be appended
 * @param lView The current LView
 * @param childRNode The native child (or children) that should be appended
 * @param childTNode The TNode of the child element
 */
export function appendChild(
    tView: TView, lView: LView, childRNode: INode | INode[], childTNode: TNode): void {
    const parentRNode = getParentRElement(tView, childTNode, lView);
    const renderer = lView[RENDERER];
    const parentTNode: TNode = childTNode.parent || lView[T_HOST]!;
    const anchorNode = getInsertInFrontOfRNode(parentTNode, childTNode, lView);
    if (parentRNode != null) {
        if (Array.isArray(childRNode)) {
            for (let i = 0; i < childRNode.length; i++) {
                nativeAppendOrInsertBefore(renderer, parentRNode, childRNode[i], anchorNode, false);
            }
        } else {
            nativeAppendOrInsertBefore(renderer, parentRNode, childRNode, anchorNode, false);
        }
    }

    _processI18nInsertBefore !== undefined &&
        _processI18nInsertBefore(renderer, childTNode, lView, childRNode, parentRNode);
}

/**
 * Returns the first native node for a given LView, starting from the provided TNode.
 *
 * Native nodes are returned in the order in which those appear in the native tree (DOM).
 */
function getFirstNativeNode(lView: LView, tNode: TNode | null): INode | null {
    if (tNode !== null) {
        // devMode &&
        //     assertTNodeType(
        //         tNode,
        //         TNodeType.AnyRNode | TNodeType.AnyContainer | TNodeType.Icu | TNodeType.Projection);

        const tNodeType = tNode.type;
        if (tNodeType & TNodeType.AnyRNode) {
            return getNativeByTNode(tNode, lView);
        } else if (tNodeType & TNodeType.Container) {
            return getBeforeNodeForView(-1, lView[tNode.index]);
        } else if (tNodeType & TNodeType.ElementContainer) {
            const elIcuContainerChild = tNode.child;
            if (elIcuContainerChild !== null) {
                return getFirstNativeNode(lView, elIcuContainerChild);
            } else {
                const rNodeOrLContainer = lView[tNode.index];
                if (isLContainer(rNodeOrLContainer)) {
                    return getBeforeNodeForView(-1, rNodeOrLContainer);
                } else {
                    return unwrapRNode(rNodeOrLContainer);
                }
            }
        } else {
            const projectionNodes = getProjectionNodes(lView, tNode);
            if (projectionNodes !== null) {
                if (Array.isArray(projectionNodes)) {
                    return projectionNodes[0];
                }
                const parentView = getLViewParent(lView[DECLARATION_COMPONENT_VIEW]);
                // devMode && assertParentView(parentView);
                return getFirstNativeNode(parentView!, projectionNodes);
            } else {
                return getFirstNativeNode(lView, tNode.next);
            }
        }
    }

    return null;
}

export function getProjectionNodes(lView: LView, tNode: TNode | null): TNode | INode[] | null {
    if (tNode !== null) {
        const componentView = lView[DECLARATION_COMPONENT_VIEW];
        const componentHost = componentView[T_HOST] as TElementNode;
        const slotIdx = tNode.projection as number;
        // devMode && assertProjectionSlots(lView);
        return componentHost.projection![slotIdx];
    }
    return null;
}

export function getBeforeNodeForView(viewIndexInContainer: number, lContainer: LContainer): INode |
    null {
    const nextViewIndex = CONTAINER_HEADER_OFFSET + viewIndexInContainer + 1;
    if (nextViewIndex < lContainer.length) {
        const lView = lContainer[nextViewIndex] as LView;
        const firstTNodeOfView = lView[TVIEW].firstChild;
        if (firstTNodeOfView !== null) {
            return getFirstNativeNode(lView, firstTNodeOfView);
        }
    }

    return lContainer[NATIVE];
}

/**
 * Removes a native node itself using a given renderer. To remove the node we are looking up its
 * parent from the native tree as not all platforms / browsers support the equivalent of
 * node.remove().
 *
 * @param renderer A renderer to be used
 * @param rNode The native node that should be removed
 * @param isHostElement A flag indicating if a node to be removed is a host of a component.
 */
export function nativeRemoveNode(renderer: Renderer, rNode: INode, isHostElement?: boolean): void {
    // devMode && devMode.rendererRemoveNode++;
    const nativeParent = renderer.parentNode(rNode);
    if (nativeParent) {
        renderer.removeChild(nativeParent, rNode, isHostElement);
    }
}


/**
 * Performs the operation of `action` on the node. Typically this involves inserting or removing
 * nodes on the LView or projection boundary.
 */
function applyNodes(
    renderer: Renderer, action: WalkTNodeTreeAction, tNode: TNode | null, lView: LView,
    parentRElement: IElement | null, beforeNode: INode | null, isProjection: boolean) {
    while (tNode != null) {
        // devMode && assertTNodeForLView(tNode, lView);
        // devMode &&
        //     assertTNodeType(
        //         tNode,
        //         TNodeType.AnyRNode | TNodeType.AnyContainer | TNodeType.Projection | TNodeType.Icu);
        const rawSlotValue = lView[tNode.index];
        const tNodeType = tNode.type;
        if (isProjection) {
            if (action === WalkTNodeTreeAction.Create) {
                rawSlotValue && attachPatchData(unwrapRNode(rawSlotValue), lView);
                tNode.flags |= TNodeFlags.isProjected;
            }
        }
        if ((tNode.flags & TNodeFlags.isDetached) !== TNodeFlags.isDetached) {
            if (tNodeType & TNodeType.ElementContainer) {
                applyNodes(renderer, action, tNode.child, lView, parentRElement, beforeNode, false);
                applyToElementOrContainer(action, renderer, parentRElement, rawSlotValue, beforeNode);
            } else if (tNodeType & TNodeType.Projection) {
                applyProjectionRecursive(
                    renderer, action, lView, tNode as TProjectionNode, parentRElement, beforeNode);
            } else {
                // devMode && assertTNodeType(tNode, TNodeType.AnyRNode | TNodeType.Container);
                applyToElementOrContainer(action, renderer, parentRElement, rawSlotValue, beforeNode);
            }
        }
        tNode = isProjection ? tNode.projectionNext : tNode.next;
    }
}


/**
 * `applyView` performs operation on the view as specified in `action` (insert, detach, destroy)
 *
 * Inserting a view without projection or containers at top level is simple. Just iterate over the
 * root nodes of the View, and for each node perform the `action`.
 *
 * Things get more complicated with containers and projections. That is because coming across:
 * - Container: implies that we have to insert/remove/destroy the views of that container as well
 *              which in turn can have their own Containers at the View roots.
 * - Projection: implies that we have to insert/remove/destroy the nodes of the projection. The
 *               complication is that the nodes we are projecting can themselves have Containers
 *               or other Projections.
 *
 * As you can see this is a very recursive problem. Yes recursion is not most efficient but the
 * code is complicated enough that trying to implemented with recursion becomes unmaintainable.
 *
 * @param tView The `TView' which needs to be inserted, detached, destroyed
 * @param lView The LView which needs to be inserted, detached, destroyed.
 * @param renderer Renderer to use
 * @param action action to perform (insert, detach, destroy)
 * @param parentRElement parent DOM element for insertion (Removal does not need it).
 * @param beforeNode Before which node the insertions should happen.
 */
function applyView(
    tView: TView, lView: LView, renderer: Renderer, action: WalkTNodeTreeAction.Destroy,
    parentRElement: null, beforeNode: null): void;
function applyView(
    tView: TView, lView: LView, renderer: Renderer, action: WalkTNodeTreeAction,
    parentRElement: IElement | null, beforeNode: INode | null): void;
function applyView(
    tView: TView, lView: LView, renderer: Renderer, action: WalkTNodeTreeAction,
    parentRElement: IElement | null, beforeNode: INode | null): void {
    applyNodes(renderer, action, tView.firstChild, lView, parentRElement, beforeNode, false);
}

/**
 * `applyProjection` performs operation on the projection.
 *
 * Inserting a projection requires us to locate the projected nodes from the parent component. The
 * complication is that those nodes themselves could be re-projected from their parent component.
 *
 * @param tView The `TView` of `LView` which needs to be inserted, detached, destroyed
 * @param lView The `LView` which needs to be inserted, detached, destroyed.
 * @param tProjectionNode node to project
 */
export function applyProjection(tView: TView, lView: LView, tProjectionNode: TProjectionNode) {
    const renderer = lView[RENDERER];
    const parentRNode = getParentRElement(tView, tProjectionNode, lView);
    const parentTNode = tProjectionNode.parent || lView[T_HOST]!;
    const beforeNode = getInsertInFrontOfRNode(parentTNode, tProjectionNode, lView);
    applyProjectionRecursive(
        renderer, WalkTNodeTreeAction.Create, lView, tProjectionNode, parentRNode, beforeNode);
}

/**
 * `applyProjectionRecursive` performs operation on the projection specified by `action` (insert,
 * detach, destroy)
 *
 * Inserting a projection requires us to locate the projected nodes from the parent component. The
 * complication is that those nodes themselves could be re-projected from their parent component.
 *
 * @param renderer Render to use
 * @param action action to perform (insert, detach, destroy)
 * @param lView The LView which needs to be inserted, detached, destroyed.
 * @param tProjectionNode node to project
 * @param parentRElement parent DOM element for insertion/removal.
 * @param beforeNode Before which node the insertions should happen.
 */
function applyProjectionRecursive(
    renderer: Renderer, action: WalkTNodeTreeAction, lView: LView,
    tProjectionNode: TProjectionNode, parentRElement: IElement | null, beforeNode: INode | null) {
    const componentLView = lView[DECLARATION_COMPONENT_VIEW];
    const componentNode = componentLView[T_HOST] as TElementNode;
    // devMode && assertEqual(typeof tProjectionNode.projection, 'number', 'expecting projection index');
    const nodeToProjectOrRNodes = componentNode.projection![tProjectionNode.projection]!;
    if (Array.isArray(nodeToProjectOrRNodes)) {
        // This should not exist, it is a bit of a hack. When we bootstrap a top level node and we
        // need to support passing projectable nodes, so we cheat and put them in the TNode
        // of the Host TView. (Yes we put instance info at the T Level). We can get away with it
        // because we know that that TView is not shared and therefore it will not be a problem.
        // This should be refactored and cleaned up.
        for (let i = 0; i < nodeToProjectOrRNodes.length; i++) {
            const rNode = nodeToProjectOrRNodes[i];
            applyToElementOrContainer(action, renderer, parentRElement, rNode, beforeNode);
        }
    } else {
        const nodeToProject: TNode | null = nodeToProjectOrRNodes;
        const projectedComponentLView = componentLView[PARENT] as LView;
        applyNodes(
            renderer, action, nodeToProject, projectedComponentLView, parentRElement, beforeNode, true);
    }
}


/**
 * `applyContainer` performs an operation on the container and its views as specified by
 * `action` (insert, detach, destroy)
 *
 * Inserting a Container is complicated by the fact that the container may have Views which
 * themselves have containers or projections.
 *
 * @param renderer Renderer to use
 * @param action action to perform (insert, detach, destroy)
 * @param lContainer The LContainer which needs to be inserted, detached, destroyed.
 * @param parentRElement parent DOM element for insertion/removal.
 * @param beforeNode Before which node the insertions should happen.
 */
function applyContainer(
    renderer: Renderer, action: WalkTNodeTreeAction, lContainer: LContainer,
    parentRElement: IElement | null, beforeNode: INode | null | undefined) {
    // devMode && assertLContainer(lContainer);
    const anchor = lContainer[NATIVE];  // LContainer has its own before node.
    const native = unwrapRNode(lContainer);
    // An LContainer can be created dynamically on any node by injecting ViewContainerRef.
    // Asking for a ViewContainerRef on an element will result in a creation of a separate anchor
    // node (comment in the DOM) that will be different from the LContainer's host node. In this
    // particular case we need to execute action on 2 nodes:
    // - container's host node (this is done in the executeActionOnElementOrContainer)
    // - container's host node (this is done here)
    if (anchor !== native) {
        // This is very strange to me (Misko). I would expect that the native is same as anchor. I
        // don't see a reason why they should be different, but they are.
        //
        // If they are we need to process the second anchor as well.
        applyToElementOrContainer(action, renderer, parentRElement, anchor, beforeNode);
    }
    for (let i = CONTAINER_HEADER_OFFSET; i < lContainer.length; i++) {
        const lView = lContainer[i] as LView;
        applyView(lView[TVIEW], lView, renderer, action, parentRElement, anchor);
    }
}

/**
 * Writes class/style to element.
 *
 * @param renderer Renderer to use.
 * @param isClassBased `true` if it should be written to `class` (`false` to write to `style`)
 * @param rNode The Node to write to.
 * @param prop Property to write to. This would be the class/style name.
 * @param value Value to write. If `null`/`undefined`/`false` this is considered a remove (set/add
 *        otherwise).
 */
export function applyStyling(
    renderer: Renderer, isClassBased: boolean, rNode: IElement, prop: string, value: any) {
    if (isClassBased) {
        // We actually want JS true/false here because any truthy value should add the class
        if (!value) {
            // devMode && devMode.rendererRemoveClass++;
            renderer.removeClass(rNode, prop);
        } else {
            // devMode && devMode.rendererAddClass++;
            renderer.addClass(rNode, prop);
        }
    } else {
        let flags = prop.indexOf('-') === -1 ? undefined : RendererStyleFlags.DashCase as number;
        if (value == null /** || value === undefined */) {
            // devMode && devMode.rendererRemoveStyle++;
            renderer.removeStyle(rNode, prop, flags);
        } else {
            // A value is important if it ends with `!important`. The style
            // parser strips any semicolons at the end of the value.
            const isImportant = typeof value === 'string' ? value.endsWith('!important') : false;

            if (isImportant) {
                // !important has to be stripped from the value for it to be valid.
                value = value.slice(0, -10);
                flags! |= RendererStyleFlags.Important;
            }

            // devMode && devMode.rendererSetStyle++;
            renderer.setStyle(rNode, prop, value, flags);
        }
    }
}


/**
 * Write `cssText` to `IElement`.
 *
 * This function does direct write without any reconciliation. Used for writing initial values, so
 * that static styling values do not pull in the style parser.
 *
 * @param renderer Renderer to use
 * @param element The element which needs to be updated.
 * @param newValue The new class list to write.
 */
export function writeDirectStyle(renderer: Renderer, element: IElement, newValue: string) {
    // devMode && assertString(newValue, '\'newValue\' should be a string');
    renderer.setAttribute(element, 'style', newValue);
    // devMode && devMode.rendererSetStyle++;
}

/**
 * Write `className` to `IElement`.
 *
 * This function does direct write without any reconciliation. Used for writing initial values, so
 * that static styling values do not pull in the style parser.
 *
 * @param renderer Renderer to use
 * @param element The element which needs to be updated.
 * @param newValue The new class list to write.
 */
export function writeDirectClass(renderer: Renderer, element: IElement, newValue: string) {
    // devMode && assertString(newValue, '\'newValue\' should be a string');
    if (newValue === '') {
        // There are tests in `google3` which expect `element.getAttribute('class')` to be `null`.
        renderer.removeAttribute(element, 'class');
    } else {
        renderer.setAttribute(element, 'class', newValue);
    }
    // devMode && devMode.rendererSetClassName++;
}