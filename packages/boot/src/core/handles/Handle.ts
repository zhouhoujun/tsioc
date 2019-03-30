import { ContainerToken, IContainer } from '@tsdi/core';
import { IocCoreService, Type, PromiseUtil, Inject, ProviderTypes, Token } from '@tsdi/ioc';

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

    protected resolve<TK>(ctx: T, token: Token<TK>, ...providers: ProviderTypes[]) {
        let container = ctx.getRaiseContainer();
        if (container && container.hasRegister(token)) {
            return container.get(token, ...providers);
        }
        return this.container.resolve(token, ...providers);
    }

    abstract execute(ctx: T, next: Next): Promise<void>;
}

/**
 *  middleware type.
 */
export type HandleType<T extends IHandleContext> = Type<Handle<T>> | Handle<T> | PromiseUtil.ActionHandle<T>;
