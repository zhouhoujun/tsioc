import { ContainerToken, IContainer } from '@tsdi/core';
import { IocCoreService, Type, PromiseUtil, Inject, ProviderTypes, Token, isClass } from '@tsdi/ioc';


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
export abstract class Handle<T extends IHandleContext> extends IocCoreService {

    @Inject(ContainerToken)
    protected container: IContainer;

    constructor() {
        super();
        this.init();
    }

    protected init() {

    }


    abstract execute(ctx: T, next: () => Promise<void>): Promise<void>;


    protected resolve<TK>(ctx: T, token: Token<TK>, ...providers: ProviderTypes[]) {
        let container = ctx.getRaiseContainer();
        if (container && container.hasRegister(token)) {
            return container.get(token, ...providers);
        }
        return this.container.resolve(token, ...providers);
    }

    protected execHandles(ctx: T, handles: HandleType<T>[], next?: () => Promise<void>): Promise<void> {
        return PromiseUtil.runInChain(handles.map(ac => this.toHanldeFunc(ac)), ctx, next);
    }

    protected execHandleFuncs(ctx: T, handles: PromiseUtil.ActionHandle<T>[], next?: () => Promise<void>): Promise<void> {
        return PromiseUtil.runInChain(handles, ctx, next);
    }

    protected toHanldeFunc(ac: HandleType<T>): PromiseUtil.ActionHandle<T> {
        if (isClass(ac)) {
            let action = this.container.get(ac);
            return action instanceof Handle ?
                (ctx: T, next?: () => Promise<void>) => action.execute(ctx, next)
                : (ctx: T, next?: () => Promise<void>) => next && next();

        } else if (ac instanceof Handle) {
            return (ctx: T, next?: () => Promise<void>) => ac.execute(ctx, next);
        }
        return ac;
    }
}

/**
 *  middleware type.
 */
export type HandleType<T extends IHandleContext> = Type<Handle<T>> | Handle<T> | PromiseUtil.ActionHandle<T>;
