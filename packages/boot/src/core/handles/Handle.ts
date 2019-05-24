import { ContainerToken, IContainer } from '@tsdi/core';
import { Type, PromiseUtil, Inject, ProviderTypes, Token, IocCoreService } from '@tsdi/ioc';


/**
 * handle context.
 *
 * @export
 * @interface IHandleContext
 */
export interface IHandleContext {
    /**
     * get raise container.
     *
     * @returns {IContainer}
     * @memberof IHandleContext
     */
    getRaiseContainer(): IContainer;
}

/**
 * handle interface.
 *
 * @export
 * @interface IHandle
 * @template T
 */
export interface IHandle<T> {
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
export type HandleType<T extends IHandleContext> = Type<Handle<T>> | Handle<T> | PromiseUtil.ActionHandle<T>;


/**
 * middleware
 *
 * @export
 * @abstract
 * @class Middleware
 * @extends {IocCoreService}
 * @template T
 */
export abstract class Handle<T extends IHandleContext> extends IocCoreService implements IHandle<T> {

    @Inject(ContainerToken)
    protected container: IContainer;

    constructor(container?: IContainer) {
        super();
        this.container = container;
    }


    abstract execute(ctx: T, next: () => Promise<void>): Promise<void>;


    protected resolve<TK>(ctx: T, token: Token<TK>, ...providers: ProviderTypes[]) {
        let container = ctx.getRaiseContainer();
        if (container && container.hasRegister(token)) {
            return container.get(token, ...providers);
        }
        return this.container.resolve(token, ...providers);
    }

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
