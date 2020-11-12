
/**
 * For efficiency reasons we often put several different data types (`RNode`, `LView`, `LContainer`)
 * in same location in `LView`. This is because we don't want to pre-allocate space for it
 * because the storage is sparse. This file contains utilities for dealing with such data types.
 *
 * How do we know what is stored at a given location in `LView`.
 * - `Array.isArray(value) === false` => `RNode` (The normal storage value)
 * - `Array.isArray(value) === true` => then the `value[0]` represents the wrapped value.
 *   - `typeof value[TYPE] === 'object'` => `LView`
 *      - This happens when we have a component at a given location
 *   - `typeof value[TYPE] === true` => `LContainer`
 *      - This happens when we have `LContainer` binding at a given location.
 *
 *
 * NOTE: it is assumed that `Array.isArray` and `typeof` operations are very efficient.
 */

import { RNode } from '../renderer';
import { LContainer, TYPE } from '../container';
import { LContext, MONKEY_PATCH_KEY_NAME } from '../context';
import { TConstants, TNode } from '../node';
import { CHILD_HEAD, CONTEXT, FLAGS, HOST, LView, LViewFlags, NEXT, PARENT, PREORDER_HOOK_FLAGS, RootContext, TData, TRANSPLANTED_VIEWS_TO_REFRESH, TView } from '../view';
import { isLContainer, isLView } from './check';

/**
 * Returns `RNode`.
 * @param value wrapped value of `RNode`, `LView`, `LContainer`
 */
export function unwrapRNode(value: RNode | LView | LContainer): RNode {
    while (Array.isArray(value)) {
        value = value[HOST] as any;
    }
    return value as RNode;
}

/**
 * Returns `LView` or `null` if not found.
 * @param value wrapped value of `RNode`, `LView`, `LContainer`
 */
export function unwrapLView(value: RNode | LView | LContainer): LView | null {
    while (Array.isArray(value)) {
        // This check is same as `isLView()` but we don't call at as we don't want to call
        // `Array.isArray()` twice and give JITer more work for inlining.
        if (typeof value[TYPE] === 'object') return value as LView;
        value = value[HOST] as any;
    }
    return null;
}

/**
 * Returns `LContainer` or `null` if not found.
 * @param value wrapped value of `RNode`, `LView`, `LContainer`
 */
export function unwrapLContainer(value: RNode | LView | LContainer): LContainer | null {
    while (Array.isArray(value)) {
        // This check is same as `isLContainer()` but we don't call at as we don't want to call
        // `Array.isArray()` twice and give JITer more work for inlining.
        if (value[TYPE] === true) return value as LContainer;
        value = value[HOST] as any;
    }
    return null;
}

/**
 * Retrieves an element value from the provided `viewData`, by unwrapping
 * from any containers, component views, or style contexts.
 */
export function getNativeByIndex(index: number, lView: LView): RNode {
    // ngDevMode && assertIndexInRange(lView, index);
    // ngDevMode && assertGreaterThanOrEqual(index, HEADER_OFFSET, 'Expected to be past HEADER_OFFSET');
    return unwrapRNode(lView[index]);
}

/**
 * Retrieve an `RNode` for a given `TNode` and `LView`.
 *
 * This function guarantees in dev mode to retrieve a non-null `RNode`.
 *
 * @param tNode
 * @param lView
 */
export function getNativeByTNode(tNode: TNode, lView: LView): RNode {
    // ngDevMode && assertTNodeForLView(tNode, lView);
    // ngDevMode && assertIndexInRange(lView, tNode.index);
    const node: RNode = unwrapRNode(lView[tNode.index]);
    // ngDevMode && !isProceduralRenderer(lView[RENDERER]) && assertDomNode(node);
    return node;
}

/**
 * Retrieve an `RNode` or `null` for a given `TNode` and `LView`.
 *
 * Some `TNode`s don't have associated `RNode`s. For example `Projection`
 *
 * @param tNode
 * @param lView
 */
export function getNativeByTNodeOrNull(tNode: TNode | null, lView: LView): RNode | null {
    const index = tNode === null ? -1 : tNode.index;
    if (index !== -1) {
        // ngDevMode && assertTNodeForLView(tNode!, lView);
        const node: RNode | null = unwrapRNode(lView[index]);
        // ngDevMode && node !== null && !isProceduralRenderer(lView[RENDERER]) && assertDomNode(node);
        return node;
    }
    return null;
}


// fixme(misko): The return Type should be `TNode|null`
export function getTNode(tView: TView, index: number): TNode {
    // ngDevMode && assertGreaterThan(index, -1, 'wrong index for TNode');
    // ngDevMode && assertLessThan(index, tView.data.length, 'wrong index for TNode');
    const tNode = tView.data[index] as TNode;
    // ngDevMode && tNode !== null && assertTNode(tNode);
    return tNode;
}

/** Retrieves a value from any `LView` or `TData`. */
export function load<T>(view: LView | TData, index: number): T {
    // ngDevMode && assertIndexInRange(view, index);
    return view[index];
}

export function getComponentLViewByIndex(nodeIndex: number, hostView: LView): LView {
    // Could be an LView or an LContainer. If LContainer, unwrap to find LView.
    // ngDevMode && assertIndexInRange(hostView, nodeIndex);
    const slotValue = hostView[nodeIndex];
    const lView = isLView(slotValue) ? slotValue : slotValue[HOST];
    return lView;
}


/**
 * Returns the monkey-patch value data present on the target (which could be
 * a component, directive or a DOM node).
 */
export function readPatchedData(target: any): LView | LContext | null {
    // ngDevMode && assertDefined(target, 'Target expected');
    return target[MONKEY_PATCH_KEY_NAME] || null;
}

export function readPatchedLView(target: any): LView | null {
    const value = readPatchedData(target);
    if (value) {
        return Array.isArray(value) ? value : (value as LContext).lView;
    }
    return null;
}

/** Checks whether a given view is in creation mode */
export function isCreationMode(view: LView): boolean {
    return (view[FLAGS] & LViewFlags.CreationMode) === LViewFlags.CreationMode;
}

/**
 * Returns a boolean for whether the view is attached to the change detection tree.
 *
 * Note: This determines whether a view should be checked, not whether it's inserted
 * into a container. For that, you'll want `viewAttachedToContainer` below.
 */
export function viewAttachedToChangeDetector(view: LView): boolean {
    return (view[FLAGS] & LViewFlags.Attached) === LViewFlags.Attached;
}

/** Returns a boolean for whether the view is attached to a container. */
export function viewAttachedToContainer(view: LView): boolean {
    return isLContainer(view[PARENT]);
}

/** Returns a constant from `TConstants` instance. */
export function getConstant<T>(consts: TConstants | null, index: null | undefined): null;
export function getConstant<T>(consts: TConstants, index: number): T | null;
export function getConstant<T>(consts: TConstants | null, index: number | null | undefined): T | null;
export function getConstant<T>(consts: TConstants | null, index: number | null | undefined): T | null {
    if (index === null || index === undefined) return null;
    // ngDevMode && assertIndexInRange(consts!, index);
    return consts![index] as unknown as T;
}

/**
 * Resets the pre-order hook flags of the view.
 * @param lView the LView on which the flags are reset
 */
export function resetPreOrderHookFlags(lView: LView) {
    lView[PREORDER_HOOK_FLAGS] = 0;
}

/**
 * Updates the `TRANSPLANTED_VIEWS_TO_REFRESH` counter on the `LContainer` as well as the parents
 * whose
 *  1. counter goes from 0 to 1, indicating that there is a new child that has a view to refresh
 *  or
 *  2. counter goes from 1 to 0, indicating there are no more descendant views to refresh
 */
export function updateTransplantedViewCount(lContainer: LContainer, amount: 1 | - 1) {
    lContainer[TRANSPLANTED_VIEWS_TO_REFRESH] += amount;
    let viewOrContainer: LView | LContainer = lContainer;
    let parent: LView | LContainer | null = lContainer[PARENT];
    while (parent !== null &&
        ((amount === 1 && viewOrContainer[TRANSPLANTED_VIEWS_TO_REFRESH] === 1) ||
            (amount === -1 && viewOrContainer[TRANSPLANTED_VIEWS_TO_REFRESH] === 0))) {
        parent[TRANSPLANTED_VIEWS_TO_REFRESH] += amount;
        viewOrContainer = parent;
        parent = parent[PARENT];
    }
}



/**
 * Gets the parent LView of the passed LView, if the PARENT is an LContainer, will get the parent of
 * that LContainer, which is an LView
 * @param lView the lView whose parent to get
 */
export function getLViewParent(lView: LView): LView | null {
    // ngDevMode && assertLView(lView);
    const parent = lView[PARENT];
    return isLContainer(parent) ? parent[PARENT]! : parent;
}

/**
 * Retrieve the root view from any component or `LView` by walking the parent `LView` until
 * reaching the root `LView`.
 *
 * @param componentOrLView any component or `LView`
 */
export function getRootView(componentOrLView: LView | {}): LView {
    // ngDevMode && assertDefined(componentOrLView, 'component');
    let lView = isLView(componentOrLView) ? componentOrLView : readPatchedLView(componentOrLView)!;
    while (lView && !(lView[FLAGS] & LViewFlags.IsRoot)) {
        lView = getLViewParent(lView)!;
    }
    // ngDevMode && assertLView(lView);
    return lView;
}

/**
 * Returns the `RootContext` instance that is associated with
 * the application where the target is situated. It does this by walking the parent views until it
 * gets to the root view, then getting the context off of that.
 *
 * @param viewOrComponent the `LView` or component to get the root context for.
 */
export function getRootContext(viewOrComponent: LView | {}): RootContext {
    const rootView = getRootView(viewOrComponent);
    // ngDevMode &&
    //     assertDefined(rootView[CONTEXT], 'RootView has no context. Perhaps it is disconnected?');
    return rootView[CONTEXT] as RootContext;
}


/**
 * Gets the first `LContainer` in the LView or `null` if none exists.
 */
export function getFirstLContainer(lView: LView): LContainer | null {
    return getNearestLContainer(lView[CHILD_HEAD]);
}

/**
 * Gets the next `LContainer` that is a sibling of the given container.
 */
export function getNextLContainer(container: LContainer): LContainer | null {
    return getNearestLContainer(container[NEXT]);
}

function getNearestLContainer(viewOrContainer: LContainer | LView | null): LContainer {
    while (viewOrContainer !== null && !isLContainer(viewOrContainer)) {
        viewOrContainer = viewOrContainer[NEXT];
    }
    return viewOrContainer as LContainer;
}
