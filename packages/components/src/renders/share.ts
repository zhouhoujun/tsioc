import { ExecptionHandler } from '@tsdi/core';
import { Injector, Token } from '@tsdi/ioc';
import { isComponentDef, isRootView } from '../interfaces/chk';
import { CONTAINER_HEADER_OFFSET, LContainer } from '../interfaces/container';
import { LContext } from '../interfaces/context';
import { IComment, IElement } from '../interfaces/dom';
import { getUniqueLViewId } from '../interfaces/lview';
import { PropertyAliasValue, TNode, TNodeProviderIndexes } from '../interfaces/node';
import { Renderer, RendererFactory } from '../interfaces/renderer';
import { CLEANUP, CONTEXT, DECLARATION_COMPONENT_VIEW, DECLARATION_VIEW, EMBEDDED_VIEW_INJECTOR, FLAGS, HEADER_OFFSET, HOST, ID, InitPhaseState, INJECTOR, LView, LViewFlags, PARENT, RENDERER, RENDERER_FACTORY, RootContext, SANITIZER, TVIEW, TView, TViewType, T_HOST } from '../interfaces/view';
import { ComponentTemplate, DirectiveDef, RenderFlags } from '../type';
import { assertDefined, assertEqual, assertIndexInRange, throwError } from '../util/assert';
import { isCreationMode, resetPreOrderHookFlags, updateTransplantedViewCount } from '../util/view';
import { assertLView, assertTNodeForLView } from './assert';
import { attachLContainerDebug, attachLViewDebug, cloneToLViewFromTViewBlueprint } from './debug';
import { getLViewParent } from './native_nodes';
import { profiler, ProfilerEvent } from './profiler';

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


const LContainerArray: any = class LContainer extends Array { };
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
    devMode && assertLView(currentView);
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
    devMode &&
        assertEqual(
            lContainer.length, CONTAINER_HEADER_OFFSET,
            'Should allocate correct number of slots for LContainer header.');
    devMode && attachLContainerDebug(lContainer);
    return lContainer;
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
        if (devMode) {
            Object.freeze(getOrCreateTViewCleanup(tView));
        }
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
 * This property will be monkey-patched on elements, components and directives.
 */
const MONKEY_PATCH_KEY_NAME = '__context__';
/**
 * Returns the monkey-patch value data present on the target (which could be
 * a component, directive or a DOM node).
 */
export function readPatchedData(target: any): LView | LContext | null {
    devMode && assertDefined(target, 'Target expected');
    return target[MONKEY_PATCH_KEY_NAME] || null;
}


export function readPatchedLView(target: any): LView | null {
    const value = readPatchedData(target);
    if (value) {
        return Array.isArray(value) ? value : (value as LContext).lView;
    }
    return null;
}

let _isInCheckNoChangesMode = false;

export function isInCheckNoChangesMode(): boolean {
    !devMode && throwError('Must never be called in production mode');
    return _isInCheckNoChangesMode;
}

export function setIsInCheckNoChangesMode(mode: boolean): void {
    !devMode && throwError('Must never be called in production mode');
    _isInCheckNoChangesMode = mode;
}



/// Render

/**
 * Processes a view in the creation mode. This includes a number of steps in a specific order:
 * - creating view query functions (if any);
 * - executing a template function in the creation mode;
 * - updating static queries (if any);
 * - creating child components defined in a given view.
 */
export function renderView<T>(tView: TView, lView: LView<T>, context: T): void {
    devMode && assertEqual(isCreationMode(lView), true, 'Should be run in creation mode');
    enterView(lView);
    try {
        const viewQuery = tView.viewQuery;
        if (viewQuery !== null) {
            executeViewQueryFn<T>(RenderFlags.Create, viewQuery, context);
        }

        // Execute a template associated with this view, if it exists. A template function might not be
        // defined for the root component views.
        const templateFn = tView.template;
        if (templateFn !== null) {
            executeTemplate<T>(tView, lView, templateFn, RenderFlags.Create, context);
        }

        // This needs to be set before children are processed to support recursive components.
        // This must be set to false immediately after the first creation run because in an
        // ngFor loop, all the views will be created together before update mode runs and turns
        // off firstCreatePass. If we don't set it here, instances will perform directive
        // matching, etc again and again.
        if (tView.firstCreatePass) {
            tView.firstCreatePass = false;
        }

        // We resolve content queries specifically marked as `static` in creation mode. Dynamic
        // content queries are resolved during change detection (i.e. update mode), after embedded
        // views are refreshed (see block above).
        if (tView.staticContentQueries) {
            refreshContentQueries(tView, lView);
        }

        // We must materialize query results before child components are processed
        // in case a child component has projected a container. The LContainer needs
        // to exist so the embedded views are properly attached by the container.
        if (tView.staticViewQueries) {
            executeViewQueryFn<T>(RenderFlags.Update, tView.viewQuery!, context);
        }

        // Render child component views.
        const components = tView.components;
        if (components !== null) {
            renderChildComponents(lView, components);
        }

    } catch (error) {
        // If we didn't manage to get past the first template pass due to
        // an error, mark the view as corrupted so we can try to recover.
        if (tView.firstCreatePass) {
            tView.incompleteFirstPass = true;
            tView.firstCreatePass = false;
        }

        throw error;
    } finally {
        lView[FLAGS] &= ~LViewFlags.CreationMode;
        leaveView();
    }
}

/**
 * Processes a view in update mode. This includes a number of steps in a specific order:
 * - executing a template function in update mode;
 * - executing hooks;
 * - refreshing queries;
 * - setting host bindings;
 * - refreshing child (embedded and component) views.
 */
export function refreshView<T>(
    tView: TView, lView: LView, templateFn: ComponentTemplate<{}> | null, context: T) {
    devMode && assertEqual(isCreationMode(lView), false, 'Should be run in update mode');
    const flags = lView[FLAGS];
    if ((flags & LViewFlags.Destroyed) === LViewFlags.Destroyed) return;
    enterView(lView);
    // Check no changes mode is a dev only mode used to verify that bindings have not changed
    // since they were assigned. We do not want to execute lifecycle hooks in that mode.
    const isInCheckNoChangesPass = devMode && isInCheckNoChangesMode();
    try {
        resetPreOrderHookFlags(lView);

        setBindingIndex(tView.bindingStartIndex);
        if (templateFn !== null) {
            executeTemplate(tView, lView, templateFn, RenderFlags.Update, context);
        }

        const hooksInitPhaseCompleted =
            (flags & LViewFlags.InitPhaseStateMask) === InitPhaseState.InitPhaseCompleted;

        // execute pre-order hooks (OnInit, OnChanges, DoCheck)
        // PERF WARNING: do NOT extract this to a separate function without running benchmarks
        if (!isInCheckNoChangesPass) {
            if (hooksInitPhaseCompleted) {
                const preOrderCheckHooks = tView.preOrderCheckHooks;
                if (preOrderCheckHooks !== null) {
                    executeCheckHooks(lView, preOrderCheckHooks, null);
                }
            } else {
                const preOrderHooks = tView.preOrderHooks;
                if (preOrderHooks !== null) {
                    executeInitAndCheckHooks(lView, preOrderHooks, InitPhaseState.OnInitHooksToBeRun, null);
                }
                incrementInitPhaseFlags(lView, InitPhaseState.OnInitHooksToBeRun);
            }
        }

        // First mark transplanted views that are declared in this lView as needing a refresh at their
        // insertion points. This is needed to avoid the situation where the template is defined in this
        // `LView` but its declaration appears after the insertion component.
        markTransplantedViewsForRefresh(lView);
        refreshEmbeddedViews(lView);

        // Content query results must be refreshed before content hooks are called.
        if (tView.contentQueries !== null) {
            refreshContentQueries(tView, lView);
        }

        // execute content hooks (AfterContentInit, AfterContentChecked)
        // PERF WARNING: do NOT extract this to a separate function without running benchmarks
        if (!isInCheckNoChangesPass) {
            if (hooksInitPhaseCompleted) {
                const contentCheckHooks = tView.contentCheckHooks;
                if (contentCheckHooks !== null) {
                    executeCheckHooks(lView, contentCheckHooks);
                }
            } else {
                const contentHooks = tView.contentHooks;
                if (contentHooks !== null) {
                    executeInitAndCheckHooks(
                        lView, contentHooks, InitPhaseState.AfterContentInitHooksToBeRun);
                }
                incrementInitPhaseFlags(lView, InitPhaseState.AfterContentInitHooksToBeRun);
            }
        }

        processHostBindingOpCodes(tView, lView);

        // Refresh child component views.
        const components = tView.components;
        if (components !== null) {
            refreshChildComponents(lView, components);
        }

        // View queries must execute after refreshing child components because a template in this view
        // could be inserted in a child component. If the view query executes before child component
        // refresh, the template might not yet be inserted.
        const viewQuery = tView.viewQuery;
        if (viewQuery !== null) {
            executeViewQueryFn<T>(RenderFlags.Update, viewQuery, context);
        }

        // execute view hooks (AfterViewInit, AfterViewChecked)
        // PERF WARNING: do NOT extract this to a separate function without running benchmarks
        if (!isInCheckNoChangesPass) {
            if (hooksInitPhaseCompleted) {
                const viewCheckHooks = tView.viewCheckHooks;
                if (viewCheckHooks !== null) {
                    executeCheckHooks(lView, viewCheckHooks);
                }
            } else {
                const viewHooks = tView.viewHooks;
                if (viewHooks !== null) {
                    executeInitAndCheckHooks(lView, viewHooks, InitPhaseState.AfterViewInitHooksToBeRun);
                }
                incrementInitPhaseFlags(lView, InitPhaseState.AfterViewInitHooksToBeRun);
            }
        }
        if (tView.firstUpdatePass === true) {
            // We need to make sure that we only flip the flag on successful `refreshView` only
            // Don't do this in `finally` block.
            // If we did this in `finally` block then an exception could block the execution of styling
            // instructions which in turn would be unable to insert themselves into the styling linked
            // list. The result of this would be that if the exception would not be throw on subsequent CD
            // the styling would be unable to process it data and reflect to the DOM.
            tView.firstUpdatePass = false;
        }

        // Do not reset the dirty state when running in check no changes mode. We don't want components
        // to behave differently depending on whether check no changes is enabled or not. For example:
        // Marking an OnPush component as dirty from within the `ngAfterViewInit` hook in order to
        // refresh a `NgClass` binding should work. If we would reset the dirty state in the check
        // no changes cycle, the component would be not be dirty for the next update pass. This would
        // be different in production mode where the component dirty state is not reset.
        if (!isInCheckNoChangesPass) {
            lView[FLAGS] &= ~(LViewFlags.Dirty | LViewFlags.FirstLViewPass);
        }
        if (lView[FLAGS] & LViewFlags.RefreshTransplantedView) {
            lView[FLAGS] &= ~LViewFlags.RefreshTransplantedView;
            updateTransplantedViewCount(lView[PARENT] as LContainer, -1);
        }
    } finally {
        leaveView();
    }
}

function executeTemplate<T>(
    tView: TView, lView: LView<T>, templateFn: ComponentTemplate<T>, rf: RenderFlags, context: T) {
    const prevSelectedIndex = getSelectedIndex();
    const isUpdatePhase = rf & RenderFlags.Update;
    try {
        setSelectedIndex(-1);
        if (isUpdatePhase && lView.length > HEADER_OFFSET) {
            // When we're updating, inherently select 0 so we don't
            // have to generate that instruction for most update blocks.
            selectIndexInternal(tView, lView, HEADER_OFFSET, !!devMode && isInCheckNoChangesMode());
        }

        const preHookType =
            isUpdatePhase ? ProfilerEvent.TemplateUpdateStart : ProfilerEvent.TemplateCreateStart;
        profiler(preHookType, context as unknown as {});
        templateFn(rf, context);
    } finally {
        setSelectedIndex(prevSelectedIndex);

        const postHookType =
            isUpdatePhase ? ProfilerEvent.TemplateUpdateEnd : ProfilerEvent.TemplateCreateEnd;
        profiler(postHookType, context as unknown as {});
    }
}






/// detection change

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


export function detectChangesInternal<T>(
    tView: TView, lView: LView, context: T, notifyErrorHandler = true) {
    const rendererFactory = lView[RENDERER_FACTORY];

    // Check no changes mode is a dev only mode used to verify that bindings have not changed
    // since they were assigned. We do not want to invoke renderer factory functions in that mode
    // to avoid any possible side-effects.
    const checkNoChangesMode = !!devMode && isInCheckNoChangesMode();

    if (!checkNoChangesMode && rendererFactory.begin) rendererFactory.begin();
    try {
        refreshView(tView, lView, tView.template, context);
    } catch (error) {
        if (notifyErrorHandler) {
            handleError(lView, error);
        }
        throw error;
    } finally {
        if (!checkNoChangesMode && rendererFactory.end) rendererFactory.end();
    }
}

export function checkNoChangesInternal<T>(
    tView: TView, lView: LView, context: T, notifyErrorHandler = true) {
    setIsInCheckNoChangesMode(true);
    try {
        detectChangesInternal(tView, lView, context, notifyErrorHandler);
    } finally {
        setIsInCheckNoChangesMode(false);
    }
}

export function createLView<T>(
    parentLView: LView | null, tView: TView, context: T | null, flags: LViewFlags, host: IElement | null,
    tHostNode: TNode | null, rendererFactory: RendererFactory | null, renderer: Renderer | null,
    sanitizer: Sanitizer | null, injector: Injector | null,
    embeddedViewInjector: Injector | null): LView {
    const lView =
        devMode ? cloneToLViewFromTViewBlueprint(tView) : tView.blueprint.slice() as LView;
    lView[HOST] = host;
    lView[FLAGS] = flags | LViewFlags.CreationMode | LViewFlags.Attached | LViewFlags.FirstLViewPass;
    if (embeddedViewInjector !== null ||
        (parentLView && (parentLView[FLAGS] & LViewFlags.HasEmbeddedViewInjector))) {
        lView[FLAGS] |= LViewFlags.HasEmbeddedViewInjector;
    }
    resetPreOrderHookFlags(lView);
    devMode && tView.declTNode && parentLView && assertTNodeForLView(tView.declTNode, parentLView);
    lView[PARENT] = lView[DECLARATION_VIEW] = parentLView;
    lView[CONTEXT] = context;
    lView[RENDERER_FACTORY] = (rendererFactory || parentLView && parentLView[RENDERER_FACTORY])!;
    devMode && assertDefined(lView[RENDERER_FACTORY], 'RendererFactory is required');
    lView[RENDERER] = (renderer || parentLView && parentLView[RENDERER])!;
    devMode && assertDefined(lView[RENDERER], 'Renderer is required');
    lView[SANITIZER] = sanitizer || parentLView && parentLView[SANITIZER] || null!;
    lView[INJECTOR as any] = injector || parentLView && parentLView[INJECTOR] || null;
    lView[T_HOST] = tHostNode;
    lView[ID] = getUniqueLViewId();
    lView[EMBEDDED_VIEW_INJECTOR as any] = embeddedViewInjector;
    devMode &&
        assertEqual(
            tView.type == TViewType.Embedded ? parentLView !== null : true, true,
            'Embedded views must have parentLView');
    lView[DECLARATION_COMPONENT_VIEW] =
        tView.type == TViewType.Embedded ? parentLView![DECLARATION_COMPONENT_VIEW] : lView;
    devMode && attachLViewDebug(lView);
    return lView;
}

/** Handles an error thrown in an LView. */
export function handleError(lView: LView, error: any): void {
    const injector = lView[INJECTOR];
    const errorHandler = injector ? injector.get(ExecptionHandler, null) : null;
    errorHandler && errorHandler.handleError(error);
}


/**
 * Set the inputs of directives at the current node to corresponding value.
 *
 * @param tView The current TView
 * @param lView the `LView` which contains the directives.
 * @param inputs mapping between the public "input" name and privately-known,
 *        possibly minified, property names to write to.
 * @param value Value to set.
 */
 export function setInputsForProperty(
    tView: TView, lView: LView, inputs: PropertyAliasValue, publicName: string, value: any): void {
  for (let i = 0; i < inputs.length;) {
    const index = inputs[i++] as number;
    const privateName = inputs[i++] as string;
    const instance = lView[index];
    devMode && assertIndexInRange(lView, index);
    const def = tView.data[index] as DirectiveDef<any>;
    if (def.setInput !== null) {
      def.setInput!(instance, value, publicName, privateName);
    } else {
      instance[privateName] = value;
    }
  }
}