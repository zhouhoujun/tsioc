import { PromiseUtil, Inject, ActionType, IActionInjector, Action, ActionInjectorToken } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';


/**
 * handle context.
 *
 * @export
 * @interface IHandleContext
 */
export interface IHandleContext {

}

/**
 * handle interface.
 *
 * @export
 * @interface IHandle
 * @template T
 */
export interface IHandle<T = any> {
    /**
     * execute handle.
     *
     * @param {T} ctx
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     * @memberof IHandle
     */
    execute(ctx: T, next: () => Promise<void>): Promise<void>;

    /**
     * to action.
     *
     * @returns {PromiseUtil.ActionHandle<T>}
     * @memberof IHandle
     */
    toAction(): PromiseUtil.ActionHandle<T>;
}


/**
 *  handle type.
 */
export type HandleType<T> = ActionType<IHandle<T>, PromiseUtil.ActionHandle<T>>;


/**
 * middleware
 *
 * @export
 * @abstract
 * @class Middleware
 * @extends {IocCoreService}
 * @template T
 */
export abstract class Handle<T extends IHandleContext = any> extends Action implements IHandle<T> {

    constructor(@Inject(ActionInjectorToken) protected actInjector: IActionInjector) {
        super();
    }


    abstract execute(ctx: T, next: () => Promise<void>): Promise<void>;

    protected execFuncs(ctx: T, handles: PromiseUtil.ActionHandle<T>[], next?: () => Promise<void>): Promise<void> {
        return PromiseUtil.runInChain(handles, ctx, next);
    }

    private _action: PromiseUtil.ActionHandle<T>
    toAction(): PromiseUtil.ActionHandle<T> {
        if (!this._action) {
            this._action = (ctx: T, next?: () => Promise<void>) => this.execute(ctx, next);
        }
        return this._action;
    }

}
