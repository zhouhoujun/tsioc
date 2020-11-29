import { IocContext } from '@tsdi/ioc';
import { ComponentType } from '../../type';
import { ComponentDef, RenderFlags } from '../definition';
import { PlayerHandler } from '../player';
import { RElement, RendererFactory } from '../renderer';
import { LView, RootContextFlags, TView } from '../view';
import { LFrame } from '../state';


/**
 * view contenxt.
 */
export interface ViewContext extends IocContext {

    /**
     * state.
     */
    lFrame: LFrame;
    /**
     * renderer factory.
     */
    rendererFactory?: RendererFactory;

    context?: any;

    /**
     * tview.
     */
    tView?: TView;

    /**
     * lview.
     */
    lView?: LView;
    /**
     * Host element on which the component will be bootstrapped. If not specified,
     * the component definition's `tag` is used to query the existing DOM for the
     * element to bootstrap.
     */
    host?: RElement | string;
    /**
     * Host element on which the component will be bootstrapped. If not specified,
     * the component definition's `tag` is used to query the existing DOM for the
     * element to bootstrap.
     */
    hostRNode?: RElement;

    /**
     * re
     */
    flags?: RenderFlags;

    /**
     * catch callbacks.
     */
    catchs: ((err: Error) => void)[];

    throwError?: boolean;

    /**
     * finallies callbacks.
     */
    finallies: (() => void)[];

}

/**
 * root context.
 */
export interface RootViewContext extends ViewContext {

    /**
     * A function which is used to schedule change detection work in the future.
     *
     * When marking components as dirty, it is necessary to schedule the work of
     * change detection in the future. This is done to coalesce multiple
     * {@link markDirty} calls into a single changed detection processing.
     *
     * The default value of the scheduler is the `requestAnimationFrame` function.
     *
     * It is also useful to override this function for testing purposes.
     */
    scheduler?: (work: () => void) => void;

    /**
     * components.
     */
    components?: {}[];

    /**
     * The player flushing handler to kick off all animations
     */
    playerHandler?: PlayerHandler;
    /**
     * What render-related operations to run once a scheduler has been set
     */
    rootflags?: RootContextFlags;
}


/**
 * component context.
 */
export interface ComponentContext<T = any> extends RootViewContext {
    /**
     * component type.
     */
    type: ComponentType<T>;

    /**
     * component def.
     */
    componentDef?: ComponentDef<T>;
}