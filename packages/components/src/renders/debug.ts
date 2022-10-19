import { Injector } from '@tsdi/ioc';
import { LContainer } from '../interfaces/container';
import { Renderer, RendererFactory } from '../interfaces/renderer';
import { CHILD_HEAD, CHILD_TAIL, CLEANUP, DebugNode, DECLARATION_VIEW, FLAGS, HEADER_OFFSET, ID, INJECTOR, LView, LViewDebugRange, LViewFlags, NEXT, QUERIES, RENDERER, RENDERER_FACTORY, SANITIZER, TVIEW, TView, T_HOST } from '../interfaces/view';



export function attachLViewDebug(lView: LView) {
    attachDebugObject(lView, new LViewDebug(lView));
}

export function attachLContainerDebug(lContainer: LContainer) {
    attachDebugObject(lContainer, new LContainerDebug(lContainer));
}

export class LViewDebug<T = unknown> implements ILViewDebug<T> {
    constructor(private readonly _raw_lView: LView<T>) { }

    /**
     * Flags associated with the `LView` unpacked into a more readable state.
     */
    get flags() {
        const flags = this._raw_lView[FLAGS];
        return {
            __raw__flags__: flags,
            initPhaseState: flags & LViewFlags.InitPhaseStateMask,
            creationMode: !!(flags & LViewFlags.CreationMode),
            firstViewPass: !!(flags & LViewFlags.FirstLViewPass),
            checkAlways: !!(flags & LViewFlags.CheckAlways),
            dirty: !!(flags & LViewFlags.Dirty),
            attached: !!(flags & LViewFlags.Attached),
            destroyed: !!(flags & LViewFlags.Destroyed),
            isRoot: !!(flags & LViewFlags.IsRoot),
            indexWithinInitPhase: flags >> LViewFlags.IndexWithinInitPhaseShift,
        };
    }
    get parent(): ILViewDebug<T> | ILContainerDebug | null {
        return toDebug<T>(this._raw_lView[PARENT] as LView<T> | LContainer | null);
    }
    get hostHTML(): string | null {
        return toHtml(this._raw_lView[HOST], true);
    }
    get html(): string {
        return (this.nodes || []).map(mapToHTML).join('');
    }
    get context(): T {
        return this._raw_lView[CONTEXT];
    }
    /**
     * The tree of nodes associated with the current `LView`. The nodes have been normalized into
     * a tree structure with relevant details pulled out for readability.
     */
    get nodes(): DebugNode[] {
        const lView = this._raw_lView;
        const tNode = lView[TVIEW].firstChild;
        return toDebugNodes(tNode, lView);
    }
    get template(): string {
        return (this.tView as any as { template_: string }).template_;
    }
    get tView(): TView {
        return this._raw_lView[TVIEW];
    }
    get cleanup(): any[] | null {
        return this._raw_lView[CLEANUP];
    }
    get injector(): Injector | null {
        return this._raw_lView[INJECTOR];
    }
    get rendererFactory(): RendererFactory {
        return this._raw_lView[RENDERER_FACTORY];
    }
    get renderer(): Renderer {
        return this._raw_lView[RENDERER];
    }
    get sanitizer(): Sanitizer | null {
        return this._raw_lView[SANITIZER];
    }
    get childHead(): ILViewDebug | ILContainerDebug | null {
        return toDebug(this._raw_lView[CHILD_HEAD]);
    }
    get next(): ILViewDebug<T> | ILContainerDebug | null {
        return toDebug<T>(this._raw_lView[NEXT] as LView<T> | LContainer | null);
    }
    get childTail(): ILViewDebug | ILContainerDebug | null {
        return toDebug(this._raw_lView[CHILD_TAIL]);
    }
    get declarationView(): ILViewDebug | null {
        return toDebug(this._raw_lView[DECLARATION_VIEW]);
    }
    get queries(): LQueries | null {
        return this._raw_lView[QUERIES];
    }
    get tHost(): ITNode | null {
        return this._raw_lView[T_HOST];
    }
    get id(): number {
        return this._raw_lView[ID];
    }

    get decls(): LViewDebugRange {
        return toLViewRange(this.tView, this._raw_lView, HEADER_OFFSET, this.tView.bindingStartIndex);
    }

    get vars(): LViewDebugRange {
        return toLViewRange(
            this.tView, this._raw_lView, this.tView.bindingStartIndex, this.tView.expandoStartIndex);
    }

    get expando(): LViewDebugRange {
        return toLViewRange(
            this.tView, this._raw_lView, this.tView.expandoStartIndex, this._raw_lView.length);
    }

    /**
     * Normalized view of child views (and containers) attached at this location.
     */
    get childViews(): Array<ILViewDebug<T> | ILContainerDebug> {
        const childViews: Array<ILViewDebug<T> | ILContainerDebug> = [];
        let child = this.childHead;
        while (child) {
            childViews.push(child as ILViewDebug<T> | ILContainerDebug);
            child = child.next;
        }
        return childViews;
    }
}

/**
 * This function clones a blueprint and creates LView.
 *
 * Simple slice will keep the same type, and we need it to be LView
 */
export function cloneToLViewFromTViewBlueprint<T>(tView: TView): LView<T> {
    const debugTView = tView as TViewDebug;
    const lView = getLViewToClone(debugTView.type, tView.template && tView.template.name);
    return lView.concat(tView.blueprint) as any;
}
