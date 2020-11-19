import { IActionSetup, IInjector, IocActions, refl } from '@tsdi/ioc';
import { ComponentReflect } from '../../reflect';
import {
    ComponentTemplate, DirectiveDef, DirectiveDefListOrFactory, PipeDefListOrFactory, RenderFlags, SchemaMetadata,
    ViewEncapsulation, ViewQueriesFunction
} from '../definition';
import { TConstantsOrFactory, TElementNode, TNode } from '../node';
import { PlayerHandler } from '../player';
import { isProceduralRenderer, RElement, Renderer, RendererFactory, RendererType } from '../renderer';
import { LFrame } from '../state';
import { isLView } from '../util/check';
import {
    CONTEXT, DECLARATION_COMPONENT_VIEW, DECLARATION_VIEW, FLAGS, HEADER_OFFSET, HOST, INJECTOR, LView, LViewFlags,
    PARENT, PREORDER_HOOK_FLAGS, RENDERER, RENDERER_FACTORY, RootContext, RootContextFlags, TView, TVIEW, TViewType, T_HOST
} from '../view';
import { ComponentContext, ViewContext } from './ctx';



/**
 * render view actions.
 */
export class RenderView<T extends ViewContext> extends IocActions<T> implements IActionSetup {


    setup() {
        this.use(
            dispatchView,
            renderCreate,
            executeViewQuery,
            executeTemplate,
            renderViewCleanup,
            refreshContentQueries,
            executeStaticViewQuiery,
            renderChildComponents
        );
    }
}

export function renderCreate(ctx: ViewContext, next: () => void) {
    const old = ctx.flags;
    ctx.flags = RenderFlags.Create;
    next();
    ctx.flags = old;
}

export function renderViewCleanup(ctx: ViewContext, next: () => void) {
    ctx.throwError = true;
    if (ctx.tView.firstCreatePass) {
        ctx.tView.firstCreatePass = false;
    }
    ctx.catchs.push(() => {
        if (ctx.tView.firstCreatePass) {
            ctx.tView.incompleteFirstPass = true;
        }
    });
    ctx.finallies.push(() => {
        ctx.lView[FLAGS] &= ~LViewFlags.CreationMode;
    });
    return next();
}


export function executeViewQuery(ctx: ViewContext, next: () => void) {
    const { lFrame, context, tView } = ctx;
    if (tView.viewQuery) {
        executeViewQueryFn(lFrame, ctx.flags, tView.viewQuery, context);
    }
    return next();
}

export function executeTemplate(ctx: ViewContext, next: () => void) {
    const { tView, lView, flags, lFrame } = ctx;
    const templateFn = tView.template;
    if (templateFn) {
        const prevSelectedIndex = lFrame.selectedIndex;
        try {
            lFrame.selectedIndex = -1;
            if (flags & RenderFlags.Update && lView.length > HEADER_OFFSET) {
                // When we're updating, inherently select 0 so we don't
                // have to generate that instruction for most update blocks.
                selectIndexInternal(tView, lView, HEADER_OFFSET, isInCheckNoChangesMode());
            }
            templateFn(ctx.flags, ctx.context);
        } finally {
            lFrame.selectedIndex = prevSelectedIndex;
        }
    }
    return next();
}

export function refreshContentQueries(ctx: ViewContext, next: () => void) {
    const tView = ctx.tView;
    const { contentQueries, staticContentQueries } = ctx.tView;
    if (staticContentQueries && contentQueries) {
        for (let i = 0; i < contentQueries.length; i += 2) {
            const queryStartIdx = contentQueries[i];
            const directiveDefIdx = contentQueries[i + 1];
            if (directiveDefIdx !== -1) {
                const directiveDef = tView.data[directiveDefIdx] as DirectiveDef<any>;
                ctx.lFrame.currentQueryIndex = queryStartIdx;
                directiveDef.contentQueries!(RenderFlags.Update, ctx.lView[directiveDefIdx], directiveDefIdx);
            }
        }
    }
    return next();
}


export function executeStaticViewQuiery(ctx: ViewContext, next: () => void) {
    const { lFrame, tView, context } = ctx;
    if (tView.staticViewQueries) {
        executeViewQueryFn(lFrame, RenderFlags.Update, tView.viewQuery, context)
    }
}

export function renderChildComponents(ctx: ViewContext, next: () => void) {
    const components = ctx.tView.components;
    if (components) {
        const { lView, lFrame, injector } = ctx;
        const renderView = injector.getContainer().provider.get(RenderView);
        for (let i = 0; i < components.length; i++) {
            renderComponent(injector, renderView, lFrame, lView, components[i]);
        }
    }
}



/**
 * refresh view actions.
 */
export class RefreshView<T extends ViewContext> extends IocActions<T> implements IActionSetup {

    setup() {
        this.use(
            dispatchView,
            renderUpdate,
            refreshViewCleanup
        );
    }
}

export function renderUpdate(ctx: ViewContext, next: () => void) {
    const old = ctx.flags;
    ctx.flags = RenderFlags.Update;
    next();
    ctx.flags = old;
}

export function refreshViewCleanup(ctx: ViewContext, next: () => void) {
    const tView = ctx.tView;
    ctx.throwError = false;
    if (tView.firstUpdatePass === true) {
        // We need to make sure that we only flip the flag on successful `refreshView` only
        // Don't do this in `finally` block.
        // If we did this in `finally` block then an exception could block the execution of styling
        // instructions which in turn would be unable to insert themselves into the styling linked
        // list. The result of this would be that if the exception would not be throw on subsequent CD
        // the styling would be unable to process it data and reflect to the DOM.
        tView.firstUpdatePass = false;
    }
    return next();
}

/**
 * render component actions.
 */
export class RenderComponent<T extends ComponentContext> extends IocActions<T> implements IActionSetup {

    setup() {
        this.use(
            initComponentDef,
            dispatchRootView,
            CreateComponent,
            RenderView,
            RefreshView
        );
    }
}

export const defaultScheduler =
    (() => (
        typeof requestAnimationFrame !== 'undefined' &&
        requestAnimationFrame ||  // browser only
        setTimeout                    // everything else
    )
        .bind(global))();

export const domRendererFactory: RendererFactory = {
    createRenderer: (hostElement: RElement | null, rendererType: RendererType | null): Renderer => {
        if (typeof document !== 'undefined') {
            return document;
        }
        return undefined;
    }
};


export function initComponentDef(ctx: ComponentContext, next: () => void) {
    if (!ctx.componentDef) {
        ctx.componentDef = refl.get<ComponentReflect>(ctx.type).def;
    }
    if (!ctx.rendererFactory) {
        ctx.rendererFactory = domRendererFactory;
    }
    if (!ctx.scheduler) {
        ctx.scheduler = defaultScheduler;
    }

    const componentDef = ctx.componentDef;
    const rendererFactory = ctx.rendererFactory;
    const componentTag = componentDef.selectors![0]![0] as string;
    const hostRenderer = rendererFactory.createRenderer(null, null);
    const hostRNode = locateHostElement(hostRenderer, ctx.host || componentTag, componentDef.encapsulation);
    const rootFlags = componentDef.onPush ? LViewFlags.Dirty | LViewFlags.IsRoot :
        LViewFlags.CheckAlways | LViewFlags.IsRoot;
    const rootContext = createRootContext(ctx.scheduler, ctx.playerHandler);

    const renderer = rendererFactory.createRenderer(hostRNode, componentDef);
    const rootTView = createTView(TViewType.Root, null, null, 1, 0, null, null, null, null, null);
    const rootView: LView = createLView(
        null, rootTView, rootContext, rootFlags, null, null, rendererFactory, renderer, ctx.injector || null);

    ctx.tView = rootTView;
    ctx.lView = rootView;
    ctx.context = rootContext;
    ctx.hostRNode = hostRNode;

    return next();
}


/**
 * create component.
 */
export class CreateComponent<T extends ComponentContext> extends IocActions<T> implements IActionSetup {

    setup() {
        this.use(createRootComponentView, createRootComponent);
    }

}

export function createRootComponentView(ctx: ComponentContext, next: () => void) {
    const { lView, hostRNode } = ctx;
    const tView = lView[TVIEW];
    const index = HEADER_OFFSET;
    lView[index] = hostRNode;
    const tNode: TElementNode = 
}

export function createRootComponent(ctx: ComponentContext, next: () => void) {

}


/**
 * enter view scope action.
 * enter view do dispatch work, finally leave view.
 *
 * @param ctx view context.
 * @param next next dispatch.
 */
export function dispatchRootView(ctx: ViewContext, next: () => void) {
    enterView(ctx);
    const rendererFactory = ctx.rendererFactory;
    try {
        // try do dispatch work.
        if (rendererFactory.begin) rendererFactory.begin();
        next();

    } finally {
        leaveView(ctx);
        if (rendererFactory.end) rendererFactory.end();
    }
}

/**
 * enter view scope action.
 * enter view do dispatch work, finally leave view.
 *
 * @param ctx view context.
 * @param next next dispatch.
 */
export function dispatchView(ctx: ViewContext, next: () => void) {
    enterView(ctx);
    const { throwError, catchs, finallies } = ctx;
    ctx.catchs = [];
    ctx.finallies = [];
    try {
        next();
    } catch (err) {
        ctx.catchs.forEach(c => c(err));
        if (throwError) throw err;
    } finally {
        ctx.finallies.forEach(f => f());
        ctx.catchs = catchs;
        ctx.finallies = finallies;
        leaveView(ctx);
    }
}

function enterView(ctx: ViewContext) {
    // enter view.
    const currentLFrame = ctx.lFrame;
    const childLFrame = currentLFrame === null ? null : currentLFrame.child;
    const newLFrame = childLFrame === null ? createLFrame(currentLFrame) : childLFrame;
    const newView = ctx.lView;
    const tView = newView[TVIEW];
    ctx.lFrame = newLFrame;
    newLFrame.currentTNode = tView.firstChild!;
    newLFrame.lView = newView;
    newLFrame.tView = tView;
    newLFrame.contextLView = newView!;
    newLFrame.bindingIndex = tView.bindingStartIndex;
}

function leaveView(ctx: ViewContext) {
    // leave view.
    const oldLFrame = ctx.lFrame;
    ctx.lFrame = oldLFrame.parent;
    oldLFrame.currentTNode = null;
    oldLFrame.lView = null;
    oldLFrame.isParent = true;
    oldLFrame.tView = null!;
    oldLFrame.selectedIndex = -1;
    oldLFrame.contextLView = null!;
    oldLFrame.elementDepthCount = 0;
    oldLFrame.currentDirectiveIndex = -1;
    oldLFrame.currentNamespace = null;
    oldLFrame.bindingRootIndex = -1;
    oldLFrame.bindingIndex = -1;
    oldLFrame.currentQueryIndex = 0;
}

/**
 * Creates a TView instance
 *
 * @param type Type of `TView`.
 * @param declTNode Declaration location of this `TView`.
 * @param templateFn Template function
 * @param decls The number of nodes, local refs, and pipes in this template
 * @param directives Registry of directives for this view
 * @param pipes Registry of pipes for this view
 * @param viewQuery View queries for this view
 * @param schemas Schemas for this view
 * @param consts Constants for this view
 */
export function createTView(
    type: TViewType, declTNode: TNode | null, templateFn: ComponentTemplate<any> | null, decls: number,
    vars: number, directives: DirectiveDefListOrFactory | null, pipes: PipeDefListOrFactory | null,
    viewQuery: ViewQueriesFunction<any> | null, schemas: SchemaMetadata[] | null,
    constsOrFactory: TConstantsOrFactory | null): TView {

    const bindingStartIndex = HEADER_OFFSET + decls;
    // This length does not yet contain host bindings from child directives because at this point,
    // we don't know which directives are active on this template. As soon as a directive is matched
    // that has a host binding, we will update the blueprint with that def's hostVars count.
    const initialViewLength = bindingStartIndex + vars;
    const blueprint = createViewBlueprint(bindingStartIndex, initialViewLength);
    const consts = typeof constsOrFactory === 'function' ? constsOrFactory() : constsOrFactory;
    const tView = blueprint[TVIEW as any] = {
        type: type,
        blueprint: blueprint,
        template: templateFn,
        queries: null,
        viewQuery: viewQuery,
        declTNode: declTNode,
        data: blueprint.slice().fill(null, bindingStartIndex),
        bindingStartIndex: bindingStartIndex,
        expandoStartIndex: initialViewLength,
        hostBindingOpCodes: null,
        firstCreatePass: true,
        firstUpdatePass: true,
        staticViewQueries: false,
        staticContentQueries: false,
        preOrderHooks: null,
        preOrderCheckHooks: null,
        contentHooks: null,
        contentCheckHooks: null,
        viewHooks: null,
        viewCheckHooks: null,
        destroyHooks: null,
        cleanup: null,
        contentQueries: null,
        components: null,
        directiveRegistry: typeof directives === 'function' ? directives() : directives,
        pipeRegistry: typeof pipes === 'function' ? pipes() : pipes,
        firstChild: null,
        schemas: schemas,
        consts: consts,
        incompleteFirstPass: false
    };

    return tView;
}

const CLEAN_PROMISE = (() => Promise.resolve(null))()

export function createRootContext(
    scheduler?: (workFn: () => void) => void, playerHandler?: PlayerHandler | null): RootContext {
    return {
        components: [],
        scheduler: scheduler || defaultScheduler,
        clean: CLEAN_PROMISE,
        playerHandler: playerHandler || null,
        flags: RootContextFlags.Empty
    };
}

/**
 * Locates the host native element, used for bootstrapping existing nodes into rendering pipeline.
 *
 * @param rendererFactory Factory function to create renderer instance.
 * @param elementOrSelector Render element or CSS selector to locate the element.
 * @param encapsulation View Encapsulation defined for component that requests host element.
 */
export function locateHostElement(
    renderer: Renderer, elementOrSelector: RElement | string,
    encapsulation: ViewEncapsulation): RElement {
    if (isProceduralRenderer(renderer)) {
        // When using native Shadow DOM, do not clear host element to allow native slot projection
        const preserveContent = encapsulation === ViewEncapsulation.ShadowDom;
        return renderer.selectRootElement(elementOrSelector, preserveContent);
    }

    let rElement = typeof elementOrSelector === 'string' ?
        renderer.querySelector(elementOrSelector)! :
        elementOrSelector;

    // Always clear host element's content when Renderer3 is in use. For procedural renderer case we
    // make it depend on whether ShadowDom encapsulation is used (in which case the content should be
    // preserved to allow native slot projection). ShadowDom encapsulation requires procedural
    // renderer, and procedural renderer case is handled above.
    rElement.textContent = '';

    return rElement;
}


/**
 * create lview action.
 * @param ctx view context.
 * @param next next dispatch.
 */
export function createLView<T>(
    parentLView: LView | null, tView: TView, context: T | null, flags: LViewFlags, host: RElement | null,
    tHostNode: TNode | null, rendererFactory: RendererFactory | null, renderer: Renderer | null,
    injector: IInjector | null): LView {

    const lView = tView.blueprint.slice() as LView;
    lView[HOST] = host;
    lView[FLAGS] = flags | LViewFlags.CreationMode | LViewFlags.Attached | LViewFlags.FirstLViewPass;
    lView[PREORDER_HOOK_FLAGS] = 0;
    lView[PARENT] = lView[DECLARATION_VIEW] = parentLView;
    lView[CONTEXT] = context;
    lView[RENDERER_FACTORY] = (rendererFactory || parentLView && parentLView[RENDERER_FACTORY])!;
    lView[RENDERER] = renderer;
    lView[INJECTOR as any] = injector;
    lView[T_HOST] = tHostNode;
    lView[DECLARATION_COMPONENT_VIEW] =
        tView.type === TViewType.Embedded ? parentLView![DECLARATION_COMPONENT_VIEW] : lView;

    return lView;

}



function createLFrame(parent: LFrame | null): LFrame {
    const lFrame: LFrame = {
        currentTNode: null,
        isParent: true,
        lView: null!,
        tView: null!,
        selectedIndex: -1,
        contextLView: null!,
        elementDepthCount: 0,
        currentNamespace: null,
        currentDirectiveIndex: -1,
        bindingRootIndex: -1,
        bindingIndex: -1,
        currentQueryIndex: 0,
        parent: parent!,
        child: null
    };
    parent !== null && (parent.child = lFrame);  // link the new LFrame for reuse.
    return lFrame;
}


const NO_CHANGE = {};

function createViewBlueprint(bindingStartIndex: number, initialViewLength: number): LView {
    const blueprint = [];

    for (let i = 0; i < initialViewLength; i++) {
        blueprint.push(i < bindingStartIndex ? null : NO_CHANGE);
    }

    return blueprint as LView;
}


function executeViewQueryFn<T>(lFrame: LFrame,
    flags: RenderFlags, viewQueryFn: ViewQueriesFunction<{}>, component: T): void {
    lFrame.currentQueryIndex = 0;
    viewQueryFn(flags, component);
}


function renderComponent(injector: IInjector, renderView: RenderView<ViewContext>, lFrame: LFrame, hostLView: LView, componentHostIdx: number) {
    const slotValue = hostLView[componentHostIdx];
    const lView = isLView(slotValue) ? slotValue : slotValue[HOST];
    const tView = lView[TVIEW];
    syncViewWithBlueprint(tView, lView);
    const context = lView[CONTEXT];
    renderView.execute({
        injector,
        lFrame,
        lView,
        tView,
        context
    });
}

function syncViewWithBlueprint(tView: TView, lView: LView) {
    for (let i = lView.length; i < tView.blueprint.length; i++) {
        lView.push(tView.blueprint[i]);
    }
}
