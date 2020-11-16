import { IActionSetup, IInjector, IocActions, refl } from '@tsdi/ioc';
import { ComponentReflect } from '../../reflect';
import {
    ComponentTemplate, DirectiveDefListOrFactory, PipeDefListOrFactory, RenderFlags, SchemaMetadata,
    ViewEncapsulation, ViewQueriesFunction
} from '../definition';
import { TConstantsOrFactory, TNode } from '../node';
import { PlayerHandler } from '../player';
import { isProceduralRenderer, RElement, Renderer, RendererFactory, RendererType } from '../renderer';
import { LFrame } from '../state';
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
        this.use(enterView)
            .use(renderViewQuery)
            .use(renderViewTemplate);
    }
}

export function renderViewQuery(ctx: ViewContext, next: () => void) {
    const viewQuery = ctx.tView.viewQuery;
    if (viewQuery) {
        ctx.lFrame.currentQueryIndex = 0;
        viewQuery(RenderFlags.Create, ctx.context);
    }
    return next();
}

export function renderViewTemplate(ctx: ViewContext, next: () => void) {
    const templateFn = ctx.tView.template;
    const lFrame = ctx.lFrame;
    if (templateFn) {
        const prevSelectedIndex = lFrame.selectedIndex;
        try {
            lFrame.selectedIndex = -1;
            templateFn(RenderFlags.Create, ctx.context);
            if (ctx.tView.firstCreatePass) {
                ctx.tView.firstCreatePass = false;
            }
        } finally {
            lFrame.selectedIndex = prevSelectedIndex;
        }
    }
    return next();
}


// export function renderViewDefault(ctx: ViewContext, next: () => void) {
//     const { tView, lView } = ctx;
//     const viewQuery = tView.viewQuery;
//     if (viewQuery !== null) {
//         executeViewQueryFn(RenderFlags.Create, viewQuery, context);
//     }

//     // Execute a template associated with this view, if it exists. A template function might not be
//     // defined for the root component views.
//     const templateFn = tView.template;
//     if (templateFn !== null) {
//         executeTemplate(tView, lView, templateFn, RenderFlags.Create, context);
//     }

//     // This needs to be set before children are processed to support recursive components.
//     // This must be set to false immediately after the first creation run because in an
//     // ngFor loop, all the views will be created together before update mode runs and turns
//     // off firstCreatePass. If we don't set it here, instances will perform directive
//     // matching, etc again and again.
//     if (tView.firstCreatePass) {
//         tView.firstCreatePass = false;
//     }

//     // We resolve content queries specifically marked as `static` in creation mode. Dynamic
//     // content queries are resolved during change detection (i.e. update mode), after embedded
//     // views are refreshed (see block above).
//     if (tView.staticContentQueries) {
//         refreshContentQueries(tView, lView);
//     }

//     // We must materialize query results before child components are processed
//     // in case a child component has projected a container. The LContainer needs
//     // to exist so the embedded views are properly attached by the container.
//     if (tView.staticViewQueries) {
//         executeViewQueryFn(RenderFlags.Update, tView.viewQuery!, context);
//     }

//     // Render child component views.
//     const components = tView.components;
//     if (components !== null) {
//         renderChildComponents(lView, components);
//     }
// }


/**
 * refresh view actions.
 */
export class RefreshView<T extends ViewContext> extends IocActions<T> implements IActionSetup {

    setup() {
        this.use(enterView);
    }
}


/**
 * render component actions.
 */
export class RenderComponent<T extends ComponentContext> extends IocActions<T> implements IActionSetup {


    setup() {
        this.use(initComponentDef)
            .use(enterView)
            .use(CreateComponent)
            .use(RenderView)
            .use(RefreshView);
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
    ctx.tViewType = TViewType.Root;

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

    return next();
}


/**
 * create component.
 */
export class CreateComponent<T extends ComponentContext> extends IocActions<T> implements IActionSetup {

    setup() {
        this.use(createRootComponentView)
            .use(createRootComponent);
    }

}

export function createRootComponentView(ctx: ComponentContext, next: () => void) {

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
export function enterView(ctx: ViewContext, next: () => void) {
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

    const rendererFactory = ctx.rendererFactory;
    try {
        // try do dispatch work.
        if (rendererFactory.begin) rendererFactory.begin();
        next();

    } finally {
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

        if (rendererFactory.end) rendererFactory.end();
    }
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
