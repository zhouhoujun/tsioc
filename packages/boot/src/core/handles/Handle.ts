import { ContainerToken, IContainer } from '@tsdi/core';
import { IocCoreService, Type, PromiseUtil, Inject, ProviderTypes, Token, isClass } from '@tsdi/ioc';

/**
 *  next
 */
export type Next = () => Promise<void>;

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
        this.initHandle();
    }

    protected initHandle() {

    }


    abstract execute(ctx: T, next: Next): Promise<void>;


    protected resolve<TK>(ctx: T, token: Token<TK>, ...providers: ProviderTypes[]) {
        let container = ctx.getRaiseContainer();
        if (container && container.hasRegister(token)) {
            return container.get(token, ...providers);
        }
        return this.container.resolve(token, ...providers);
    }

    protected execHandles(ctx: T, handles: HandleType<T>[], next?: Next): Promise<void> {
        return PromiseUtil.runInChain(handles.map(ac => this.toHanldeFunc(ac)), ctx, next);
    }

    protected toHanldeFunc(ac: HandleType<T>): PromiseUtil.ActionHandle<T> {
        if (isClass(ac)) {
            return (ctx: T, next?: Next) => {
                let action = this.resolve(ctx, ac);
                if (action instanceof Handle) {
                    return action.execute(ctx, next);
                } else {
                    return next();
                }
            }
        } else if (ac instanceof Handle) {
            return (ctx: T, next?: Next) => ac.execute(ctx, next);
        }
        return ac;
    }
}

/**
 *  middleware type.
 */
export type HandleType<T extends IHandleContext> = Type<Handle<T>> | Handle<T> | PromiseUtil.ActionHandle<T>;
