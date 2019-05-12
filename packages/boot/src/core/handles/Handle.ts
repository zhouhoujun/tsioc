import { ContainerToken, IContainer } from '@tsdi/core';
import { Type, PromiseUtil, Inject, ProviderTypes, Token, isClass, OnInit, isFunction } from '@tsdi/ioc';


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
 * middleware
 *
 * @export
 * @abstract
 * @class Middleware
 * @extends {IocCoreService}
 * @template T
 */
export abstract class Handle<T extends IHandleContext> implements OnInit {


    constructor(@Inject(ContainerToken) protected container: IContainer) {
        this.onInit();
    }

    onInit() {

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

    _action: PromiseUtil.ActionHandle<T>
    toAction(): PromiseUtil.ActionHandle<T> {
        if (!this._action) {
            this._action = (ctx: T, next?: () => Promise<void>) => this.execute(ctx, next);
        }
        return this._action;
    }

    protected parseAction(ac: HandleType<T>): PromiseUtil.ActionHandle<T> {
        if (isClass(ac)) {
            let action = this.container.get(ac);
            return action instanceof Handle ? action.toAction() : null;

        } else if (ac instanceof Handle) {
            return ac.toAction();
        }
        return isFunction(ac) ? ac : null;
    }
}

/**
 *  handle type.
 */
export type HandleType<T extends IHandleContext> = Type<Handle<T>> | Handle<T> | PromiseUtil.ActionHandle<T>;
