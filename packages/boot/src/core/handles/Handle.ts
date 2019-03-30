import { ContainerToken, IContainer } from '@tsdi/core';
import { IocCoreService, Type, PromiseUtil, Inject, ProviderTypes, Token } from '@tsdi/ioc';

/**
 *  next
 */
export type Next = () => Promise<void>;

export interface IHandleContext {
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

    protected resolve<TK>(token: Token<TK>, ctx?: T, ...providers: ProviderTypes[]) {
        if (ctx) {
            let container = ctx.getRaiseContainer();
            if (container.has(token)) {
                return container.resolve(token, ...providers);
            }
        }
        return this.container.resolve(token, ...providers);
    }

    abstract execute(ctx: T, next: Next): Promise<void>;
}

/**
 *  middleware type.
 */
export type HandleType<T extends IHandleContext> = Type<Handle<T>> | Handle<T> | PromiseUtil.ActionHandle<T>;
