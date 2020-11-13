import { TNode } from './node';
import { LView, TView } from './view';

/**
 * frame.
 */
interface LFrame {
    /**
     * Parent LFrame.
     *
     * This is needed when `leaveView` is called to restore the previous state.
     */
    parent: LFrame;

    /**
     * Child LFrame.
     *
     * This is used to cache existing LFrames to relieve the memory pressure.
     */
    child: LFrame | null;

    /**
     * State of the current view being processed.
     *
     * An array of nodes (text, element, container, etc), pipes, their bindings, and
     * any local variables that need to be stored between invocations.
     */
    lView: LView;

    /**
     * Current `TView` associated with the `LFrame.lView`.
     *
     * One can get `TView` from `lFrame[TVIEW]` however because it is so common it makes sense to
     * store it in `LFrame` for perf reasons.
     */
    tView: TView;

    /**
     * Used to set the parent property when nodes are created and track query results.
     *
     * This is used in conjunction with `isParent`.
     */
    currentTNode: TNode | null;

    /**
     * If `isParent` is:
     *  - `true`: then `currentTNode` points to a parent node.
     *  - `false`: then `currentTNode` points to previous node (sibling).
     */
    isParent: boolean;

    /**
     * Index of currently selected element in LView.
     *
     * Used by binding instructions. Updated as part of advance instruction.
     */
    selectedIndex: number;

    /**
     * Current pointer to the binding index.
     */
    bindingIndex: number;

    /**
     * The last viewData retrieved by nextContext().
     * Allows building nextContext() and reference() calls.
     *
     * e.g. const inner = x().$implicit; const outer = x().$implicit;
     */
    contextLView: LView;

    /**
     * Store the element depth count. This is used to identify the root elements of the template
     * so that we can then attach patch data `LView` to only those elements. We know that those
     * are the only places where the patch data could change, this way we will save on number
     * of places where tha patching occurs.
     */
    elementDepthCount: number;

    /**
     * Current namespace to be used when creating elements
     */
    currentNamespace: string | null;

    /**
     * The root index from which pure function instructions should calculate their binding
     * indices. In component views, this is TView.bindingStartIndex. In a host binding
     * context, this is the TView.expandoStartIndex + any dirs/hostVars before the given dir.
     */
    bindingRootIndex: number;

    /**
     * Current index of a View or Content Query which needs to be processed next.
     * We iterate over the list of Queries and increment current query index at every step.
     */
    currentQueryIndex: number;

    /**
     * When host binding is executing this points to the directive index.
     * `TView.data[currentDirectiveIndex]` is `DirectiveDef`
     * `LView[currentDirectiveIndex]` is directive instance.
     */
    currentDirectiveIndex: number;
}

/**
 * All implicit instruction state is stored here.
 *
 * It is useful to have a single object where all of the state is stored as a mental model
 * (rather it being spread across many different variables.)
 *
 * PERF NOTE: Turns out that writing to a true global variable is slower than
 * having an intermediate object with properties.
 */
export interface InstructionState {
    /**
     * Current `LFrame`
     *
     * `null` if we have not called `enterView`
     */
    lFrame: LFrame;

    /**
     * Stores whether directives should be matched to elements.
     *
     * When template contains `ngNonBindable` then we need to prevent the runtime from matching
     * directives on children of that element.
     *
     * Example:
     * ```
     * <my-comp my-directive>
     *   Should match component / directive.
     * </my-comp>
     * <div ngNonBindable>
     *   <my-comp my-directive>
     *     Should not match component / directive because we are in ngNonBindable.
     *   </my-comp>
     * </div>
     * ```
     */
    bindingsEnabled: boolean;

    /**
     * In this mode, any changes in bindings will throw an ExpressionChangedAfterChecked error.
     *
     * Necessary to support ChangeDetectorRef.checkNoChanges().
     *
     * checkNoChanges Runs only in devmode=true and verifies that no unintended changes exist in
     * the change detector or its children.
     */
    isInCheckNoChangesMode: boolean;
}
