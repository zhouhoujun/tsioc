import { Token } from '@tsdi/ioc';
import { isComponentDef, isRootView } from '../interfaces/chk';
import { CONTAINER_HEADER_OFFSET, LContainer } from '../interfaces/container';
import { LContext } from '../interfaces/context';
import { IComment, IElement } from '../interfaces/dom';
import { TNode, TNodeProviderIndexes } from '../interfaces/node';
import { CLEANUP, CONTEXT, FLAGS, LView, LViewFlags, RENDERER_FACTORY, RootContext, TVIEW, TView } from '../interfaces/view';
import { DirectiveDef } from '../type';
import { getLViewParent } from './native_nodes';

declare let devMode: any;
/**
 * Searches for the given token among the node's directives and providers.
 *
 * @param tNode TNode on which directives are present.
 * @param tView The tView we are currently processing
 * @param token Provider token or type of a directive to look for.
 * @param canAccessViewProviders Whether view providers should be considered.
 * @param isHostSpecialCase Whether the host special case applies.
 * @returns Index of a found directive or provider, or null when none found.
 */
export function locateDirectiveOrProvider<T>(
    tNode: TNode, tView: TView, token: Token<T> | string, canAccessViewProviders: boolean,
    isHostSpecialCase: boolean | number): number | null {
    const nodeProviderIndexes = tNode.providerIndexes;
    const tInjectables = tView.data;

    const injectablesStart = nodeProviderIndexes & TNodeProviderIndexes.ProvidersStartIndexMask;
    const directivesStart = tNode.directiveStart;
    const directiveEnd = tNode.directiveEnd;
    const cptViewProvidersCount =
        nodeProviderIndexes >> TNodeProviderIndexes.CptViewProvidersCountShift;
    const startingIndex =
        canAccessViewProviders ? injectablesStart : injectablesStart + cptViewProvidersCount;
    // When the host special case applies, only the viewProviders and the component are visible
    const endIndex = isHostSpecialCase ? injectablesStart + cptViewProvidersCount : directiveEnd;
    for (let i = startingIndex; i < endIndex; i++) {
        const providerTokenOrDef = tInjectables[i] as Token<any> | DirectiveDef<any> | string;
        if (i < directivesStart && token === providerTokenOrDef ||
            i >= directivesStart && (providerTokenOrDef as DirectiveDef<any>).type === token) {
            return i;
        }
    }
    if (isHostSpecialCase) {
        const dirDef = tInjectables[directivesStart] as DirectiveDef<any>;
        if (dirDef && isComponentDef(dirDef) && dirDef.type === token) {
            return directivesStart;
        }
    }
    return null;
}


const LContainerArray: any = class LContainer extends Array {};
/**
 * Creates a LContainer, either from a container instruction, or for a ViewContainerRef.
 *
 * @param hostNative The host element for the LContainer
 * @param hostTNode The host TNode for the LContainer
 * @param currentView The parent view of the LContainer
 * @param native The native comment element
 * @param isForViewContainerRef Optional a flag indicating the ViewContainerRef case
 * @returns LContainer
 */
export function createLContainer(
    hostNative: IElement | IComment | LView, currentView: LView, native: IComment,
    tNode: TNode): LContainer {
    // devMode && assertLView(currentView);
    // https://jsperf.com/array-literal-vs-new-array-really
    const lContainer: LContainer = new (devMode ? LContainerArray : Array)(
        hostNative,   // host native
        true,         // Boolean `true` in this position signifies that this is an `LContainer`
        false,        // has transplanted views
        currentView,  // parent
        null,         // next
        0,            // transplanted views to refresh count
        tNode,        // t_host
        native,       // native,
        null,         // view refs
        null,         // moved views
    );
    // devMode &&
    //     assertEqual(
    //         lContainer.length, CONTAINER_HEADER_OFFSET,
    //         'Should allocate correct number of slots for LContainer header.');
    // devMode && attachLContainerDebug(lContainer);
    return lContainer;
}

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
        // inserted after template shared instances. For this reason in devMode we freeze the TView.
        // if (devMode) {
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
    // devMode && assertDefined(target, 'Target expected');
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
