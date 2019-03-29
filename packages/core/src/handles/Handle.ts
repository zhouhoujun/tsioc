import { HandleContext } from './HandleContext';
import { ContainerToken, IContainer } from '@ts-ioc/core';
import { IocCoreService, Type, PromiseUtil, Inject, ProviderTypes, Token } from '@ts-ioc/ioc';

/**
 *  next
 */
export type Next = () => Promise<void>;

/**
 * middleware
 *
 * @export
 * @abstract
 * @class Middleware
 * @extends {IocCoreService}
 * @template T
 */
export abstract class Handle<T extends HandleContext> extends IocCoreService {

    @Inject(ContainerToken)
    protected container: IContainer;

    constructor() {
        super();
        this.initHandle();
    }

    protected initHandle() {

    }

    protected resolve<TK>(token: Token<TK>, ctx?: T, ...providers: ProviderTypes[]) {
        return this.container.resolve(token, ...providers);
    }

    abstract execute(ctx: T, next: Next): Promise<void>;
}

/**
 *  middleware type.
 */
export type HandleType<T extends HandleContext> = Type<Handle<T>> | Handle<T> | PromiseUtil.ActionHandle<T>;
