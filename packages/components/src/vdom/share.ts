import { isRootView } from '../interfaces/chk';
import { LContext } from '../interfaces/context';
import { CLEANUP, CONTEXT, FLAGS, LView, LViewFlags, RENDERER_FACTORY, RootContext, TVIEW, TView } from '../interfaces/view';
import { getLViewParent } from './native_nodes';


/**
 * Marks current view and all ancestors dirty.
 *
 * Returns the root view because it is found as a byproduct of marking the view tree
 * dirty, and can be used by methods that consume markViewDirty() to easily schedule
 * change detection. Otherwise, such methods would need to traverse up the view tree
 * an additional time to get the root view and schedule a tick on it.
 *
 * @param lView The starting LView to mark dirty
 * @returns the root LView
 */
export function markViewDirty(lView: LView): LView | null {
    while (lView) {
        lView[FLAGS] |= LViewFlags.Dirty;
        const parent = getLViewParent(lView);
        // Stop traversing up as soon as you find a root view that wasn't attached to any container
        if (isRootView(lView) && !parent) {
            return lView;
        }
        // continue otherwise
        lView = parent!;
    }
    return null;
}

/**
 * Saves context for this cleanup function in LView.cleanupInstances.
 *
 * On the first template pass, saves in TView:
 * - Cleanup function
 * - Index of context we just saved in LView.cleanupInstances
 *
 * This function can also be used to store instance specific cleanup fns. In that case the `context`
 * is `null` and the function is store in `LView` (rather than it `TView`).
 */
export function storeCleanupWithContext(
    tView: TView, lView: LView, context: any, cleanupFn: Function): void {
    const lCleanup = getOrCreateLViewCleanup(lView);
    if (context === null) {
        // If context is null that this is instance specific callback. These callbacks can only be
        // inserted after template shared instances. For this reason in ngDevMode we freeze the TView.
        // if (ngDevMode) {
        //   Object.freeze(getOrCreateTViewCleanup(tView));
        // }
        lCleanup.push(cleanupFn);
    } else {
        lCleanup.push(context);

        if (tView.firstCreatePass) {
            getOrCreateTViewCleanup(tView).push(cleanupFn, lCleanup.length - 1);
        }
    }
}

export function getOrCreateLViewCleanup(view: LView): any[] {
    // top level variables should not be exported for performance reasons (PERF_NOTES.md)
    return view[CLEANUP] || (view[CLEANUP] = []);
}

export function getOrCreateTViewCleanup(tView: TView): any[] {
    return tView.cleanup || (tView.cleanup = []);
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


export function tickRootContext(rootContext: RootContext) {
    for (let i = 0; i < rootContext.components.length; i++) {
        const rootComponent = rootContext.components[i];
        const lView = readPatchedLView(rootComponent)!;
        const tView = lView[TVIEW];
        renderComponentOrTemplate(tView, lView, tView.template, rootComponent);
    }
}

export function detectChangesInternal<T>(tView: TView, lView: LView, context: T) {
    const rendererFactory = lView[RENDERER_FACTORY];
    if (rendererFactory.begin) rendererFactory.begin();
    try {
        refreshView(tView, lView, tView.template, context);
    } catch (error) {
        handleError(lView, error);
        throw error;
    } finally {
        if (rendererFactory.end) rendererFactory.end();
    }
}

/**
 * Synchronously perform change detection on a root view and its components.
 *
 * @param lView The view which the change detection should be performed on.
 */
export function detectChangesInRootView(lView: LView): void {
    tickRootContext(lView[CONTEXT] as RootContext);
}

export function checkNoChangesInternal<T>(tView: TView, view: LView, context: T) {
    setIsInCheckNoChangesMode(true);
    try {
        detectChangesInternal(tView, view, context);
    } finally {
        setIsInCheckNoChangesMode(false);
    }
}


/**
 * Checks the change detector on a root view and its components, and throws if any changes are
 * detected.
 *
 * This is used in development mode to verify that running change detection doesn't
 * introduce other changes.
 *
 * @param lView The view which the change detection should be checked on.
 */
export function checkNoChangesInRootView(lView: LView): void {
    setIsInCheckNoChangesMode(true);
    try {
        detectChangesInRootView(lView);
    } finally {
        setIsInCheckNoChangesMode(false);
    }
}
