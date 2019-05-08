import { ContainerToken, IContainer } from '@tsdi/core';
import { Type, PromiseUtil, Inject, ProviderTypes, Token, isClass, OnInit } from '@tsdi/ioc';


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

    protected toFunc(ac: HandleType<T>): PromiseUtil.ActionHandle<T> {
        if (isClass(ac)) {
            let action = this.container.get(ac);
            return action instanceof Handle ?
                (ctx: T, next?: () => Promise<void>) => action.execute(ctx, next) : null;

        } else if (ac instanceof Handle) {
            return (ctx: T, next?: () => Promise<void>) => ac.execute(ctx, next);
        }
        return ac;
    }
}

/**
 *  handle type.
 */
export type HandleType<T extends IHandleContext> = Type<Handle<T>> | Handle<T> | PromiseUtil.ActionHandle<T>;
